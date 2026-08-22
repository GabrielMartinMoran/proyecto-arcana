import type { ContentIndex } from '../../../types/content-index.js';
import { filterContentIndexEntries } from '../filters.js';
import { classifySearchResults } from './classification.js';
import { hasFuzzyEligibleTerm } from './fuzzy.js';
import { isAmbiguousAcronym } from './glossary.js';
import { classifyIntention } from './intention.js';
import { fuzzyMatchEntry, matchEntry } from './matcher.js';
import { analyzeQuery, hasSearchableTerms, type NormalizedQuery } from './normalize.js';
import { projectSearchDetail, projectSearchOutput } from './projection.js';
import { sortScoredResults, toScoredResult } from './scoring.js';
import type { ScoredResult, SearchEngineResult, SearchOptions } from './types.js';

/**
 * Global lexical search orchestration.
 *
 * Pipeline: normalize -> filter (before scoring) -> strong lexical pass -> fuzzy
 * fallback only when no strong match exists -> stable ranking -> operational
 * status -> minimal agent-facing projection (plus explainable detail). Pure and
 * deterministic: no network, no timestamps, no external ranking library.
 */

const entryKey = (entry: ScoredResult['entry']): string => `${entry.kind}:${entry.slug}`;

const runStrongPass = (
	entries: ScoredResult['entry'][],
	query: NormalizedQuery,
): ScoredResult[] => {
	const results: ScoredResult[] = [];
	for (const entry of entries) {
		const match = matchEntry(entry, query);
		// Accept identity-lane matches (T3) AND content-lane matches (T6): a
		// semantic query can legitimately match only the v3 body/structured text.
		if (match.matchType !== 'none' && (match.fieldSignal > 0 || match.contentSignal > 0)) {
			results.push(toScoredResult(entry, match));
		}
	}
	return results;
};

const runFuzzyPass = (
	entries: ScoredResult['entry'][],
	query: NormalizedQuery,
	strongResults: ScoredResult[],
): ScoredResult[] => {
	if (!hasFuzzyEligibleTerm(query.terms)) return strongResults;

	const byKey = new Map<string, ScoredResult>(
		strongResults.map((result) => [entryKey(result.entry), result]),
	);

	for (const entry of entries) {
		const match = fuzzyMatchEntry(entry, query.terms);
		if (!match) continue;
		const candidate = toScoredResult(entry, match);
		const existing = byKey.get(entryKey(entry));
		if (!existing || candidate.score > existing.score) {
			byKey.set(entryKey(entry), candidate);
		}
	}

	return [...byKey.values()];
};

const scorePool = (entries: ScoredResult['entry'][], query: NormalizedQuery): ScoredResult[] => {
	const strongResults = runStrongPass(entries, query);
	if (strongResults.some((result) => result.strong)) return strongResults;
	return runFuzzyPass(entries, query, strongResults);
};

export const searchContentIndex = (
	index: ContentIndex,
	options: SearchOptions,
): SearchEngineResult => {
	const query = analyzeQuery(options.query);

	if (!hasSearchableTerms(query)) {
		return {
			output: projectSearchOutput([], 'invalid_query'),
			detail: [],
		};
	}

	const filtered = filterContentIndexEntries(index.entries, options);
	const sorted = sortScoredResults(scorePool(filtered, query));
	const forceAmbiguity = query.terms.some(isAmbiguousAcronym);
	const { status, selected } = classifySearchResults(
		sorted,
		options.limit,
		query.terms.length,
		forceAmbiguity,
	);
	const intention = classifyIntention(query, status, selected);

	return {
		output: projectSearchOutput(selected, status),
		detail: projectSearchDetail(selected, intention),
	};
};
