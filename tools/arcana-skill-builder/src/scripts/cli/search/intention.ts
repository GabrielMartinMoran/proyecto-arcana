import type { NormalizedQuery } from './normalize.js';
import type { RankedResult, SearchIntention, SearchStatus } from './types.js';

/**
 * Deterministic intention parser for ARCANA search queries (T7).
 *
 * The intention is a query-level label derived from the normalized query plus
 * the already-ranked results. It is intentionally bounded and offline: no
 * models, no network, only the lexical signals produced by the pipeline.
 *
 * Classification rules (in priority order):
 *
 * - `insufficient`  — invalid query or no reliable source (not_found).
 * - `ambiguous`     — several distinct identities are equally plausible.
 * - `manual_rule`   — the top source is a manual section/chapter (rule or
 *                     design guidance) regardless of how it was matched.
 * - `exact_entity`  — a short query (<= 2 terms) fully covers one identity name
 *                     (exact/phrase/prefix/fuzzy), so the user named a thing.
 * - `category_list` — a tag/listing query: the user asked for an ordered set of
 *                     references, not a single entity. Detected by an explicit
 *                     listing marker word or by a short query resolved only
 *                     through a tag (no identity-name match).
 * - `semantic_search` — the top source is driven by body/structured evidence
 *                     (content lane) or by multi-term body coverage.
 *
 * The label is exposed only behind `--explain`; the agent-facing projection
 * stays minimal.
 */

const LISTING_MARKERS: ReadonlySet<string> = new Set([
	'lista',
	'listar',
	'listado',
	'categoria',
	'categorias',
	'cartas',
	'objetos',
	'armas',
	'criaturas',
	'bestiario',
]);

const IDENTITY_NAME_FIELDS: ReadonlySet<string> = new Set(['name', 'alias', 'slug', 'id']);

const isManualKind = (result: RankedResult): boolean =>
	result.entry.kind === 'section' || result.entry.kind === 'chapter';

const matchesIdentityName = (result: RankedResult): boolean =>
	result.matchedFields.some((field) => IDENTITY_NAME_FIELDS.has(field));

/** A short query that fully covers one identity name resolves a single entity. */
const entityLike = (query: NormalizedQuery, result: RankedResult): boolean =>
	query.terms.length <= 2 &&
	result.coverage === 1 &&
	matchesIdentityName(result) &&
	(result.matchType === 'exact' ||
		result.matchType === 'phrase' ||
		result.matchType === 'prefix' ||
		result.matchType === 'fuzzy');
const listingLike = (query: NormalizedQuery, result: RankedResult): boolean =>
	query.terms.some((term) => LISTING_MARKERS.has(term)) ||
	(query.terms.length <= 2 &&
		!matchesIdentityName(result) &&
		result.matchedFields.includes('tags'));

export const classifyIntention = (
	query: NormalizedQuery,
	status: SearchStatus,
	selected: RankedResult[],
): SearchIntention => {
	if (status === 'invalid_query' || status === 'not_found') return 'insufficient';
	if (status === 'ambiguous') return 'ambiguous';

	const top = selected[0];
	if (!top) return 'insufficient';
	if (isManualKind(top)) return 'manual_rule';
	if (entityLike(query, top)) return 'exact_entity';
	if (listingLike(query, top)) return 'category_list';
	return 'semantic_search';
};
