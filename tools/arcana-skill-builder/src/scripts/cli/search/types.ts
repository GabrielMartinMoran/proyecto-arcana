import type { ContentIndexEntry, ContentKind } from '../../../types/content-index.js';

/**
 * Contract types for the global lexical search engine (T3).
 *
 * These types are internal to the search engine and the CLI adapter. The
 * agent-facing projection (`AgentSearchResult`/`SearchOutput`) is deliberately
 * minimal: the agent receives ranked, actionable source pointers, never the
 * full ranking payload, the document body or every metadata field.
 */

export type SearchStatus = 'found' | 'ambiguous' | 'not_found' | 'invalid_query';

export type MatchType =
	| 'exact'
	| 'phrase'
	| 'expansion'
	| 'prefix'
	| 'substring'
	| 'fuzzy'
	| 'none';

export type Confidence = 'high' | 'medium' | 'low';

/**
 * Which lane produced a match. `identity` covers name/alias/slug/id/heading/
 * chapter/tags; `content` covers the v3 `search` body and `structured` evidence.
 */
export type MatchLane = 'identity' | 'content' | 'both' | 'none';

/**
 * Query-level intention label (T7), computed deterministically from the
 * normalized query plus the ranked results. Exposed only behind `--explain`;
 * the agent-facing projection never carries it.
 */
export type SearchIntention =
	| 'exact_entity'
	| 'category_list'
	| 'semantic_search'
	| 'manual_rule'
	| 'ambiguous'
	| 'insufficient';

export type OutputFormat = 'json' | 'text';

export type SearchFilterKind = ContentKind | 'any';

export interface SearchOptions {
	query: string;
	kind?: SearchFilterKind;
	source?: string;
	/**
	 * Exact level filter. A single scalar keeps backward compatibility with
	 * `--level 2`; repeated `--level` flags accumulate into a list so the
	 * filter accepts any of the requested levels.
	 */
	level?: number | number[];
	minLevel?: number;
	maxLevel?: number;
	tier?: number;
	tagsAll?: string[];
	/**
	 * Best-effort ANY filter over the v3 `structured.type` field when the entry
	 * defines it; legacy entries without the field fall back to their tags.
	 */
	types?: string[];
	/**
	 * Best-effort filter over the v3 `structured.lineage` field when the entry
	 * defines it; legacy entries without the field fall back to their tags.
	 */
	lineage?: string;
	limit?: number;
	format?: OutputFormat;
	explain?: boolean;
}

/** One field-level match contribution. */
export interface MatchedField {
	field: string;
	strength: number;
}

/** Result of matching a single entry against a query. */
export interface EntryMatch {
	matchType: MatchType;
	/** Best weighted identity-lane signal (name/alias/slug/id/heading/chapter/tags). */
	fieldSignal: number;
	/** Best weighted content-lane signal (v3 search body / structured evidence). */
	contentSignal: number;
	/** Fraction of query terms matched across identity + content lanes. */
	coverage: number;
	/** Fraction of query terms matched by the identity lane alone. */
	identityCoverage: number;
	/** Fraction of query terms matched by the v3 body (`search`) alone. */
	contentCoverage: number;
	matchedFields: string[];
	/** Content fields (body/requirements/cost/...) that contributed a match. */
	contentMatchedFields: string[];
	/** Query terms matched in at least one lane (stable order). */
	matchedTerms: string[];
	/** Query terms not matched in any lane (stable order). */
	unmatchedTerms: string[];
	/** Lane(s) that produced the match. */
	lane: MatchLane;
	/** True when at least one field reached a prefix-strength (or stronger) match. */
	strong: boolean;
}

/** Fully scored and ranked internal result that backs the projection. */
export interface ScoredResult {
	entry: ContentIndexEntry;
	score: number;
	matchType: MatchType;
	matchedFields: string[];
	/** Best weighted content-lane signal (v3 search/structured). */
	contentSignal: number;
	/** Fraction of query terms matched across identity + content lanes. */
	coverage: number;
	/** Fraction of query terms matched by the identity lane alone. */
	identityCoverage: number;
	/** Fraction of query terms matched by the v3 body (`search`) alone. */
	contentCoverage: number;
	matchedTerms: string[];
	unmatchedTerms: string[];
	lane: MatchLane;
	strong: boolean;
	/**
	 * T8b: true when this entry is an archetype root card (Arquetipo tag plus
	 * the canonical `arquetipo-nivel-1.yml` path). Internal ranking signal only:
	 * it is never part of the agent-facing projection.
	 */
	archetypeRoot: boolean;
}

/** Scored result with the operational label used by the agent. */
export interface RankedResult extends ScoredResult {
	rank: number;
	confidence: Confidence;
}

/** Minimal agent-facing reference. */
export interface AgentSearchResult {
	rank: number;
	confidence: Confidence;
	kind: ContentKind;
	name: string;
	source: string;
}

/** Minimal agent-facing output; never a superset of these three keys. */
export interface SearchOutput {
	status: SearchStatus;
	results: AgentSearchResult[];
	nextAction: string;
}

/** Rich per-result detail available only behind `--explain`. */
export interface SearchDetailResult extends AgentSearchResult {
	id?: string;
	slug: string;
	score: number;
	matchType: MatchType;
	matchedFields: string[];
	level?: number;
	tags: string[];
	path: string;
	heading?: string;
	anchor?: string;
	chapter?: string;
	dataset: string;
	/** T6 diagnostics: significant-term coverage, unmatched terms, lane, matched terms. */
	coverage: number;
	unmatchedTerms: string[];
	lane: MatchLane;
	matchedTerms: string[];
	/** T7 query-level intention label, shared by every result of the query. */
	intention: SearchIntention;
}

/** Full engine result: minimal projection plus explainable detail. */
export interface SearchEngineResult {
	output: SearchOutput;
	detail: SearchDetailResult[];
}
