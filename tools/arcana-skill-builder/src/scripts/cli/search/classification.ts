import type { Confidence, RankedResult, ScoredResult, SearchStatus } from './types.js';

/**
 * Operational confidence and ambiguity decision (T6).
 *
 * Confidence is not a statistical probability: it is a label the agent uses to
 * decide whether to open a source directly or present alternatives. Rules:
 *
 * - Fuzzy matches are capped at `medium` and never treated as normative proof.
 * - `high` requires an exact/phrase identity match with full term coverage.
 * - A multi-term query (>= 3 significant terms) whose top result only covers a
 *   small fraction of those terms is NOT a reliable `found`; the query falls
 *   back to `not_found` with low-confidence suggestions instead of inventing a
 *   confident answer.
 */

export const FOUND_FLOOR = 45;
export const SUGGESTION_FLOOR = 30;
export const HIGH_FLOOR = 75;
export const MEDIUM_FLOOR = 45;
export const AMBIGUITY_MARGIN = 5;
export const AMBIGUITY_MAX_RESULTS = 3;
export const SUGGESTIONS_MAX = 3;
export const DEFAULT_RESULT_LIMIT = 8;

/** A query with at least this many significant terms is treated as multi-term. */
export const MIN_MULTI_TERM_QUERY = 3;
/** Minimum significant-term coverage for a multi-term query to be reliable. */
export const MIN_FOUND_COVERAGE = 0.5;

const confidenceOf = (result: ScoredResult): Confidence => {
	if (result.matchType === 'fuzzy') return 'medium';
	if (
		(result.matchType === 'exact' || result.matchType === 'phrase') &&
		result.score >= HIGH_FLOOR &&
		result.coverage >= 1
	) {
		return 'high';
	}
	if (result.score >= MEDIUM_FLOOR) return 'medium';
	return 'low';
};

const resolveLimit = (limit: number | undefined): number =>
	typeof limit === 'number' && Number.isFinite(limit) && limit >= 0 ? limit : DEFAULT_RESULT_LIMIT;

export interface SearchClassification {
	status: SearchStatus;
	selected: RankedResult[];
}

const toRankedSuggestions = (candidates: ScoredResult[]): RankedResult[] =>
	candidates.slice(0, SUGGESTIONS_MAX).map((result, index) => ({
		...result,
		rank: index + 1,
		confidence: 'low' as const,
	}));

export const classifySearchResults = (
	sorted: ScoredResult[],
	limit: number | undefined,
	significantTermCount = 1,
	forceAmbiguity = false,
): SearchClassification => {
	const candidates = sorted.filter((result) => result.score >= SUGGESTION_FLOOR);

	if (candidates.length === 0) {
		return { status: 'not_found', selected: [] };
	}

	// A glossary-marked ambiguous acronym (PPF) always routes to `ambiguous`
	// regardless of how the results ranked, so the eval contract holds
	// deterministically and no single GM section is presented as normative.
	if (forceAmbiguity) {
		const selected = candidates.slice(0, AMBIGUITY_MAX_RESULTS).map((result, index) => ({
			...result,
			rank: index + 1,
			confidence: confidenceOf(result),
		}));
		return { status: 'ambiguous', selected };
	}

	const top = candidates[0];
	const multiTerm = significantTermCount >= MIN_MULTI_TERM_QUERY;
	const insufficientCoverage = multiTerm && top.coverage < MIN_FOUND_COVERAGE;

	// A multi-term query that only matches a handful of generic terms must not be
	// presented as a reliable `found`; useful suggestions are still returned.
	if (top.score < FOUND_FLOOR || insufficientCoverage) {
		return { status: 'not_found', selected: toRankedSuggestions(candidates) };
	}

	const second = candidates[1];
	// A tie is only "ambiguity" when several *distinct identities* (name, alias,
	// slug or id) are equally plausible for the same query — e.g. a creature and
	// a card sharing an exact name. A broad category/tag listing, where many
	// entries match at the same strength, is NOT ambiguity: the agent asked for
	// all those ordered references.
	const IDENTITY_FIELDS: ReadonlySet<string> = new Set(['name', 'alias', 'slug', 'id']);
	const isDistinctIdentityMatch = (result: ScoredResult): boolean =>
		(result.matchType === 'exact' || result.matchType === 'phrase') &&
		result.matchedFields.some((field) => IDENTITY_FIELDS.has(field));
	const isAmbiguous =
		second !== undefined &&
		second.score >= MEDIUM_FLOOR &&
		top.score - second.score <= AMBIGUITY_MARGIN &&
		isDistinctIdentityMatch(top) &&
		isDistinctIdentityMatch(second);

	if (isAmbiguous) {
		const selected = candidates.slice(0, AMBIGUITY_MAX_RESULTS).map((result, index) => ({
			...result,
			rank: index + 1,
			confidence: confidenceOf(result),
		}));
		return { status: 'ambiguous', selected };
	}

	const maxResults = resolveLimit(limit);
	const selected = candidates
		.filter(
			(result) =>
				result.score >= FOUND_FLOOR && (!multiTerm || result.coverage >= MIN_FOUND_COVERAGE),
		)
		.slice(0, maxResults)
		.map((result, index) => ({
			...result,
			rank: index + 1,
			confidence: confidenceOf(result),
		}));
	return { status: 'found', selected };
};
