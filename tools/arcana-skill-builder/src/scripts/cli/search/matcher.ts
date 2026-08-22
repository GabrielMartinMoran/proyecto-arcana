import type { ContentIndexEntry } from '../../../types/content-index.js';
import { acceptsFuzzy, buildFuzzyStrength, normalizedSimilarity } from './fuzzy.js';
import { acronymExpansionPhrase, acronymExpansionTerms, isGlossaryAcronym } from './glossary.js';
import { toLemma } from './morphology.js';
import { fold, tokenize, type NormalizedQuery } from './normalize.js';
import type { EntryMatch, MatchLane, MatchType } from './types.js';

/**
 * Candidate matching: computes how strongly one index entry matches a query.
 *
 * Signals are weighted per field and ranked by match class. Two lanes feed the
 * match:
 *
 * - `identity` (name/alias/slug/id/heading/chapter/tags): unchanged from T3 and
 *   remains the source of exact/prefix entity resolution.
 * - `content` (v3 `search` body plus `structured` requirements/cost/uses/...):
 *   evidence-aware relevance over real descriptions, tables, traits and
 *   behavior, so multi-term semantic queries can be ranked by body evidence
 *   instead of generic name matches.
 *
 * A "strong" match is any field reaching prefix strength; only when no strong
 * match exists does the engine fall back to fuzzy identity matching.
 *
 * Short tokens: a token shorter than 3 characters may only match on a full-token
 * boundary (exact equality), never as a raw prefix or substring inside another
 * word. This stops `LS` from matching inside `balsamo`, `bolsa` or `pulso`.
 *
 * Glossary acronyms (PP, PPF): the same full-token-only rule applies regardless
 * of length — `pp` must never raw-prefix-match the `ppf` token inside PPF
 * section titles (QA contract_violation). A verified acronym routes only
 * through (a) the literal token, (b) its canonical expansion tokens, or (c)
 * the full canonical expansion phrase ("puntos de progreso"), which is
 * reported as the dedicated `expansion` match class.
 */

export const MATCH_STRENGTH = {
	exact: 1.0,
	phrase: 0.88,
	/** Canonical glossary expansion phrase contained verbatim in a field. */
	expansion: 0.88,
	prefix: 0.8,
	substring: 0.7,
} as const;

export const PREFIX_STRENGTH = MATCH_STRENGTH.prefix;

/** Tokens shorter than this never substring-match inside other words. */
export const MIN_SUBSTRING_TOKEN_LENGTH = 3;

/** Tokens shorter than this never prefix-match other tokens (full token only). */
export const MIN_PREFIX_TOKEN_LENGTH = 3;

export const FIELD_WEIGHTS: Record<string, number> = {
	name: 1.0,
	alias: 0.96,
	slug: 0.93,
	id: 0.93,
	heading: 0.92,
	chapter: 0.85,
	tags: 0.8,
};

/**
 * Content-lane field weights. The v3 body (`search`) carries the richest
 * evidence, so it outranks generic identity matches for semantic queries but
 * still never displaces an exact entity match. Structured scalars (requirements,
 * cost, uses, ...) are deliberately low-weight: a card whose *requirement* names
 * another card (e.g. "Pacto Supremo") must not outrank that card for a
 * direct identity query.
 */
export const CONTENT_FIELD_WEIGHTS: Record<string, number> = {
	body: 0.9,
	requirements: 0.4,
	cost: 0.5,
	uses: 0.5,
	family: 0.4,
	archetype: 0.4,
	lineage: 0.4,
	cardType: 0.4,
	type: 0.4,
};

export const MATCH_TYPE_PRIORITY: Record<MatchType, number> = {
	exact: 6,
	phrase: 5,
	expansion: 4,
	prefix: 3,
	substring: 2,
	fuzzy: 1,
	none: 0,
};

interface EntryField {
	label: string;
	value: string;
}

export const entryTextFields = (entry: ContentIndexEntry): EntryField[] => {
	const fields: EntryField[] = [
		{ label: 'name', value: entry.canonicalName },
		...entry.aliases.map((alias) => ({ label: 'alias', value: alias })),
		{ label: 'slug', value: entry.slug },
	];
	if (entry.id) fields.push({ label: 'id', value: entry.id });
	if (entry.heading) fields.push({ label: 'heading', value: entry.heading });
	if (entry.chapter) fields.push({ label: 'chapter', value: entry.chapter });
	for (const tag of entry.tags) fields.push({ label: 'tags', value: tag });
	return fields;
};

/**
 * Content-lane fields from the v3 schema: the deterministic `search` body plus
 * structured scalar evidence (requirements, cost, uses, family, archetype,
 * lineage, cardType, type). These are internal only and never returned to the
 * agent by default.
 */
export const entryContentFields = (entry: ContentIndexEntry): EntryField[] => {
	const fields: EntryField[] = [];
	if (entry.search && entry.search.trim().length > 0) {
		fields.push({ label: 'body', value: entry.search });
	}
	const structured = entry.structured;
	if (!structured) return fields;
	if (structured.requirements)
		fields.push({ label: 'requirements', value: structured.requirements });
	if (structured.cost !== undefined) {
		fields.push({ label: 'cost', value: String(structured.cost) });
	}
	if (structured.uses) fields.push({ label: 'uses', value: structured.uses });
	if (structured.family) fields.push({ label: 'family', value: structured.family });
	if (structured.archetype) fields.push({ label: 'archetype', value: structured.archetype });
	if (structured.lineage) fields.push({ label: 'lineage', value: structured.lineage });
	if (structured.cardType) fields.push({ label: 'cardType', value: structured.cardType });
	if (structured.type) fields.push({ label: 'type', value: structured.type });
	return fields;
};

/** Identity fields only: the fuzzy fallback never inspects description-like text. */
export const entryIdentityFields = (entry: ContentIndexEntry): EntryField[] => {
	const fields: EntryField[] = [
		{ label: 'name', value: entry.canonicalName },
		...entry.aliases.map((alias) => ({ label: 'alias', value: alias })),
		{ label: 'slug', value: entry.slug },
	];
	if (entry.id) fields.push({ label: 'id', value: entry.id });
	return fields;
};

const NO_MATCH: EntryMatch = {
	matchType: 'none',
	fieldSignal: 0,
	contentSignal: 0,
	coverage: 0,
	identityCoverage: 0,
	contentCoverage: 0,
	matchedFields: [],
	contentMatchedFields: [],
	matchedTerms: [],
	unmatchedTerms: [],
	lane: 'none',
	strong: false,
};

/** A token that may only match on a full-token boundary: glossary acronyms
 * (PP, PPF) and tokens shorter than 3 characters (`ls`). Raw prefix and
 * substring matches are forbidden for them, so `pp` never reaches `ppf` and
 * `ls` never reaches bálsamo/bolsa/pulso. */
export const isStrictToken = (foldedToken: string): boolean =>
	isGlossaryAcronym(foldedToken) || foldedToken.length < MIN_PREFIX_TOKEN_LENGTH;

/**
 * Compares one query term against one field token after controlled lemma
 * normalization (see morphology.ts). Returns the strongest applicable match
 * class, or null when the token does not match the term.
 *
 * `strict` applies to glossary acronyms and short tokens: only exact equality
 * is allowed (the length guards preserve the T7 short-token contract, and the
 * glossary guard stops `pp` from prefix-matching `ppf`). Expansion candidates
 * (`puntos`, `progreso`) are never strict: they carry the verified meaning of
 * the acronym, so they keep normal prefix behavior.
 */
const tokenMatchType = (term: string, fieldToken: string, strict: boolean): MatchType | null => {
	const lemma = toLemma(term);
	const tokenLemma = toLemma(fieldToken);
	if (tokenLemma === lemma) return 'prefix';
	if (strict) return null;
	if (lemma.length < MIN_PREFIX_TOKEN_LENGTH) return null;
	if (tokenLemma.startsWith(lemma)) return 'prefix';
	if (lemma.length >= MIN_SUBSTRING_TOKEN_LENGTH && tokenLemma.includes(lemma)) {
		return 'substring';
	}
	return null;
};

/** Lemma-normalized phrase: every folded token mapped through the controlled map. */
export const lemmaPhrase = (folded: string): string => tokenize(folded).map(toLemma).join(' ');

/**
 * Precomputed lemma forms of the normalized query. They let the phrase-level
 * checks recognize bounded spelling variants (costo/coste, gasto/gastar) and
 * controlled plurals the same way the token-level matcher already does.
 */
export interface QueryLemmas {
	phrase: string;
	folded: string;
}

const evaluateField = (
	fieldValue: string,
	query: NormalizedQuery,
	terms: string[],
	matchedTerms: Set<string>,
	fieldState: { strength: number; type: MatchType },
	queryLemmas: QueryLemmas,
): void => {
	const foldedField = fold(fieldValue);
	if (!foldedField) return;
	const fieldLemma = lemmaPhrase(foldedField);

	// A single strict query term (glossary acronym or shorter than 3 chars)
	// must not drive the phrase-level prefix/substring checks: those are raw
	// prefix/substring matches of the whole phrase, exactly what `pp` -> `ppf`
	// used to exploit. Full-field equality stays allowed below.
	const singleStrictTerm = query.terms.length === 1 && isStrictToken(query.terms[0]);

	if (query.phrase && (foldedField === query.phrase || fieldLemma === queryLemmas.phrase)) {
		fieldState.strength = MATCH_STRENGTH.exact;
		fieldState.type = 'exact';
		for (const term of terms) matchedTerms.add(term);
		return;
	}
	if (
		query.folded &&
		query.folded !== query.phrase &&
		(foldedField === query.folded || fieldLemma === queryLemmas.folded)
	) {
		fieldState.strength = MATCH_STRENGTH.exact;
		fieldState.type = 'exact';
		for (const term of terms) matchedTerms.add(term);
		return;
	}
	if (
		!singleStrictTerm &&
		((query.phrase.length >= 2 && foldedField.startsWith(query.phrase)) ||
			(queryLemmas.phrase.length >= 2 && fieldLemma.startsWith(queryLemmas.phrase)))
	) {
		fieldState.strength = MATCH_STRENGTH.prefix;
		fieldState.type = 'prefix';
		for (const term of terms) matchedTerms.add(term);
		return;
	}
	if (
		!singleStrictTerm &&
		((query.phrase.length >= MIN_SUBSTRING_TOKEN_LENGTH && foldedField.includes(query.phrase)) ||
			(queryLemmas.phrase.length >= MIN_SUBSTRING_TOKEN_LENGTH &&
				fieldLemma.includes(queryLemmas.phrase)))
	) {
		fieldState.strength = MATCH_STRENGTH.phrase;
		fieldState.type = 'phrase';
		for (const term of terms) matchedTerms.add(term);
		return;
	}
	if (
		!singleStrictTerm &&
		query.folded.length >= MIN_SUBSTRING_TOKEN_LENGTH &&
		query.folded !== query.phrase &&
		foldedField.includes(query.folded)
	) {
		fieldState.strength = MATCH_STRENGTH.phrase;
		fieldState.type = 'phrase';
		for (const term of terms) matchedTerms.add(term);
		return;
	}

	const fieldTokens = tokenize(foldedField);
	for (const term of terms) {
		// A verified acronym (PP) also matches through its canonical expansion
		// tokens, so `PP` can reach "Puntos de Progreso" without inventing any
		// other meaning. The original term is what gets recorded as matched.
		// The term itself is strict (full token only); the expansion tokens are
		// regular candidates.
		const strict = isStrictToken(term);
		const candidates = [term, ...acronymExpansionTerms(term)];
		for (const fieldToken of fieldTokens) {
			for (const candidate of candidates) {
				// Strictness applies only to the literal acronym token: the
				// expansion candidates carry verified meaning and keep normal
				// prefix behavior (`puntos` may still reach `punto`).
				const match = tokenMatchType(candidate, fieldToken, candidate === term && strict);
				if (!match) continue;
				const strength = match === 'prefix' ? MATCH_STRENGTH.prefix : MATCH_STRENGTH.substring;
				if (strength > fieldState.strength) {
					fieldState.strength = strength;
					fieldState.type = match;
				}
				matchedTerms.add(term);
				break;
			}
		}

		// Canonical expansion phrase evidence: a field containing the whole
		// verified expansion ("puntos de progreso") is the strongest acronym
		// routing — "Gastar Puntos de Progreso (PP)" outranks any section that
		// merely repeats the literal `pp`. Reported as the dedicated `expansion`
		// class so it never trips the exact/phrase ambiguity gate for the GM
		// twin ("Otorgar Puntos de Progreso (PP)"): the stable tie-break keeps
		// the canonical player section at rank 1 with a deterministic `found`.
		const expansionPhrase = acronymExpansionPhrase(term);
		if (expansionPhrase) {
			const expansionLemma = lemmaPhrase(expansionPhrase);
			const containsExpansion =
				foldedField.includes(expansionPhrase) ||
				(expansionLemma !== expansionPhrase && fieldLemma.includes(expansionLemma));
			if (containsExpansion && MATCH_STRENGTH.expansion > fieldState.strength) {
				fieldState.strength = MATCH_STRENGTH.expansion;
				fieldState.type = 'expansion';
			}
			if (containsExpansion) matchedTerms.add(term);
		}
	}
};

/**
 * Combine per-field match states for one lane into the lane-wide signal.
 * Returns the strongest signal, the best match type and the union of matched
 * terms/fields for that lane.
 */
const reduceLane = (
	fields: EntryField[],
	weights: Record<string, number>,
	query: NormalizedQuery,
	terms: string[],
	queryLemmas: QueryLemmas,
): {
	signal: number;
	strength: number;
	type: MatchType;
	matchedFields: string[];
	matched: Set<string>;
} => {
	const matched = new Set<string>();
	const matchedFields: string[] = [];
	let signal = 0;
	let strength = 0;
	let type: MatchType = 'none';

	for (const { label, value } of fields) {
		const weight = weights[label] ?? 0;
		const fieldState = { strength: 0, type: 'none' as MatchType };
		evaluateField(value, query, terms, matched, fieldState, queryLemmas);

		if (fieldState.strength > 0) {
			const fieldSignal = weight * fieldState.strength;
			if (fieldSignal > signal) signal = fieldSignal;
			if (fieldState.strength > strength) {
				strength = fieldState.strength;
				type = fieldState.type;
			}
			if (!matchedFields.includes(label)) matchedFields.push(label);
		}
	}

	return { signal, strength, type, matchedFields, matched };
};

export const matchEntry = (entry: ContentIndexEntry, query: NormalizedQuery): EntryMatch => {
	if (query.terms.length === 0) return NO_MATCH;

	// Lemma forms of the query drive the phrase-level variant checks (T7).
	const queryLemmas: QueryLemmas = {
		phrase: lemmaPhrase(query.phrase),
		folded: lemmaPhrase(query.folded),
	};

	const identity = reduceLane(
		entryTextFields(entry),
		FIELD_WEIGHTS,
		query,
		query.terms,
		queryLemmas,
	);
	// The content lane only contributes NEW evidence: terms the identity lane did
	// not already resolve. Otherwise a body re-matching an identity-resolved term
	// would double-count (e.g. the word "pacto" inside Pacto Oscuro's body) and
	// overtake the entity whose name covers the whole query (`pacto sup` ->
	// Pacto Supremo). Pure semantic queries still work: when identity matches
	// nothing, `newTerms` is the full term list and the body drives the match.
	const newTerms = query.terms.filter((term) => !identity.matched.has(term));
	const content = reduceLane(
		entryContentFields(entry),
		CONTENT_FIELD_WEIGHTS,
		query,
		newTerms,
		queryLemmas,
	);

	const matchedTerms = [...new Set([...identity.matched, ...content.matched])].sort();
	const unmatchedTerms = query.terms.filter((term) => !matchedTerms.includes(term));
	const coverage = matchedTerms.length / query.terms.length;
	// Identity coverage: how many query terms the entry resolves by identity alone.
	const identityCoverage = identity.matched.size / query.terms.length;
	// Content coverage: how many query terms the v3 body (`search`) matches that
	// the identity lane did NOT already resolve. This keeps an entity whose name
	// covers the whole query (`pacto sup` -> Pacto Supremo) ahead of an entry
	// that only shares one generic term, while still lifting multi-term semantic
	// queries whose evidence lives in the body (e.g. `imbuida`).
	const bodyField = entryContentFields(entry).find((field) => field.label === 'body');
	const bodyMatched = new Set<string>();
	if (bodyField) {
		evaluateField(
			bodyField.value,
			query,
			newTerms,
			bodyMatched,
			{
				strength: 0,
				type: 'none',
			},
			queryLemmas,
		);
	}
	const contentCoverage = bodyMatched.size / query.terms.length;

	const lane: MatchLane =
		identity.signal > 0 && content.signal > 0
			? 'both'
			: content.signal > 0
				? 'content'
				: identity.signal > 0
					? 'identity'
					: 'none';

	const bestStrength = Math.max(identity.strength, content.strength);
	const bestType: MatchType = identity.strength >= content.strength ? identity.type : content.type;
	const hasAnyMatch = bestStrength > 0;

	return {
		matchType: hasAnyMatch ? bestType : 'none',
		fieldSignal: identity.signal,
		contentSignal: content.signal,
		coverage,
		identityCoverage,
		contentCoverage,
		matchedFields: identity.matchedFields,
		contentMatchedFields: content.matchedFields,
		matchedTerms,
		unmatchedTerms,
		lane,
		strong: bestStrength >= PREFIX_STRENGTH,
	};
};

/**
 * Fuzzy fallback over identity fields only. Returns `null` when no identity
 * token passes the bounded Damerau-Levenshtein gate. It only ever runs when no
 * strong (exact/phrase/prefix) match exists anywhere in the filtered pool.
 */
export const fuzzyMatchEntry = (entry: ContentIndexEntry, terms: string[]): EntryMatch | null => {
	let bestStrength = 0;
	let bestSignal = 0;
	const matched = new Set<string>();
	const matchedFields: string[] = [];

	for (const { label, value } of entryIdentityFields(entry)) {
		const weight = FIELD_WEIGHTS[label] ?? 0;
		const tokens = tokenize(fold(value));
		for (const term of terms) {
			for (const token of tokens) {
				if (!acceptsFuzzy(term, token)) continue;
				const similarity = normalizedSimilarity(term, token);
				const strength = buildFuzzyStrength(similarity);
				const signal = weight * strength;
				if (strength > bestStrength) bestStrength = strength;
				if (signal > bestSignal) bestSignal = signal;
				matched.add(term);
				if (!matchedFields.includes(label)) matchedFields.push(label);
			}
		}
	}

	if (bestStrength === 0) return null;

	const matchedTerms = [...matched].sort();
	const unmatchedTerms = terms.filter((term) => !matchedTerms.includes(term));

	return {
		matchType: 'fuzzy',
		fieldSignal: bestSignal,
		contentSignal: 0,
		coverage: matchedTerms.length / terms.length,
		identityCoverage: matchedTerms.length / terms.length,
		contentCoverage: 0,
		matchedFields,
		contentMatchedFields: [],
		matchedTerms,
		unmatchedTerms,
		lane: 'identity',
		strong: false,
	};
};
