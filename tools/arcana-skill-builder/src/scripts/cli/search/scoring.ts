import type { ContentIndexEntry } from '../../../types/content-index.js';
import { fold } from './normalize.js';
import { MATCH_TYPE_PRIORITY } from './matcher.js';
import type { EntryMatch, ScoredResult } from './types.js';

/**
 * Deterministic scoring and stable ordering (T6).
 *
 * Score combines identity evidence, body coverage and content signal:
 *
 *   identityContribution = 0.50 * identitySignal + 0.25 * identityCoverage
 *   contentContribution  = contentFactor * contentSignal
 *                          + 0.10 * contentCoverage + 0.15 * identityCoverageDrop
 *
 * `contentFactor` grows as identity coverage drops, so:
 * - Entity/prefix queries (`pacto sup`, `Liche`) keep identity dominance: the
 *   entity whose name covers the whole query ranks first.
 * - Multi-term semantic queries are driven by body evidence: `imbuida` in a body
 *   outranks a generic `arma`/`atributo` name match, and an isolated generic
 *   term cannot reach a reliable `found`.
 * - Exact identity matches (identitySignal 1.0, identityCoverage 1.0) keep rank
 *   1 and `high` confidence.
 *
 * Ordering is fully stable and never depends on timestamps or accidental
 * iteration order. `unmatchedTerms` stay available for `--explain`.
 */

export const round2 = (value: number): number => Math.round(value * 100) / 100;

/**
 * Archetype root card detection (T8b).
 *
 * Generic rule — never a hardcoded archetype name and never plain alphabetical
 * or path order: an entry is the root of its discipline when it carries the
 * `Arquetipo` tag AND its resource path is the canonical `arquetipo-nivel-1.yml`
 * file. Both conditions are required so a same-tag card at a regular level file
 * (e.g. `arquetipos/cefiro/nivel-1.yml`) or an unrelated path can never be
 * mistaken for the root.
 */
export const isArchetypeRoot = (entry: ContentIndexEntry): boolean =>
	entry.tags.includes('Arquetipo') && entry.path.endsWith('arquetipo-nivel-1.yml');

/** Content evidence weight grows as identity coverage drops (semantic queries). */
export const contentFactor = (identityCoverage: number): number =>
	round2(0.1 + 0.25 * (1 - identityCoverage));

export const scoreEntryMatch = (match: EntryMatch): number =>
	round2(
		100 *
			(0.5 * match.fieldSignal +
				0.25 * match.identityCoverage +
				contentFactor(match.identityCoverage) * match.contentSignal +
				0.1 * match.contentCoverage),
	);

export const toScoredResult = (entry: ContentIndexEntry, match: EntryMatch): ScoredResult => ({
	entry,
	score: scoreEntryMatch(match),
	matchType: match.matchType,
	matchedFields: match.matchedFields,
	contentSignal: match.contentSignal,
	coverage: match.coverage,
	identityCoverage: match.identityCoverage,
	contentCoverage: match.contentCoverage,
	matchedTerms: match.matchedTerms,
	unmatchedTerms: match.unmatchedTerms,
	lane: match.lane,
	strong: match.strong,
	archetypeRoot: isArchetypeRoot(entry),
});

export const compareScoredResults = (left: ScoredResult, right: ScoredResult): number => {
	if (left.score !== right.score) return right.score - left.score;

	// T8b: among tied category cards, the archetype root opens the listing
	// (e.g. Sintonía Fluida for Céfiro) instead of falling to alphabetical order.
	// The score check above already dominates, so an exact entity match can never
	// be displaced by the root priority.
	if (left.archetypeRoot !== right.archetypeRoot) return left.archetypeRoot ? -1 : 1;

	const leftPriority = MATCH_TYPE_PRIORITY[left.matchType];
	const rightPriority = MATCH_TYPE_PRIORITY[right.matchType];
	if (leftPriority !== rightPriority) return rightPriority - leftPriority;

	const leftName = fold(left.entry.canonicalName);
	const rightName = fold(right.entry.canonicalName);
	if (leftName !== rightName) return leftName.localeCompare(rightName, 'es');

	if (left.entry.kind !== right.entry.kind) {
		return left.entry.kind.localeCompare(right.entry.kind, 'en');
	}

	const leftId = left.entry.id ?? '';
	const rightId = right.entry.id ?? '';
	if (leftId !== rightId) return leftId.localeCompare(rightId, 'en');

	return left.entry.path.localeCompare(right.entry.path, 'en');
};

export const sortScoredResults = (results: ScoredResult[]): ScoredResult[] =>
	[...results].sort(compareScoredResults);
