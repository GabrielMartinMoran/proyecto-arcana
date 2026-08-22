import { fold, SPANISH_STOP_WORDS, tokenize } from './normalize.js';

/**
 * Canonical acronym glossary for ARCANA search (T7).
 *
 * Acronyms (PP, PPF, LS) are only ever interpreted through this bounded,
 * corpus-verified glossary. Every expansion is backed by real text in
 * static/docs (player.md / gm.md); nothing is invented.
 *
 * - `PP`  expands to "puntos de progreso" (verified: "Gastar Puntos de
 *   Progreso (PP)" in player.md, "¿Cómo Otorgar PP?" in gm.md).
 * - `PPF` is deliberately ambiguous: gm.md defines "Puntos de Perfil", but the
 *   routing for the acronym must never collapse into a single `found` because
 *   many GM sections (diseño de criaturas, tablas de constructor) are equally
 *   plausible. The engine maps any query containing `ppf` to `ambiguous`.
 * - `LS` is intentionally ABSENT: no verified meaning exists in the corpus, so
 *   it is never expanded and never substring-matches inside bálsamo/bolsa.
 */

export interface AcronymGlossaryEntry {
	/** Canonical single expansion, verified in the corpus. */
	expansion?: string;
	/** True when the acronym has no single verified routing (kept ambiguous). */
	ambiguous?: boolean;
}

export const ACRONYM_GLOSSARY: Readonly<Record<string, AcronymGlossaryEntry>> = {
	pp: { expansion: 'puntos de progreso' },
	ppf: { ambiguous: true },
};

/** Folded expansion tokens of a verified acronym, or an empty array when the
 * token is not a glossary acronym (LS and any unknown token stay untouched).
 * Stop words inside the expansion are dropped so they never act as candidates. */
export const acronymExpansionTerms = (foldedToken: string): string[] => {
	const entry = ACRONYM_GLOSSARY[foldedToken];
	if (!entry?.expansion) return [];
	return tokenize(fold(entry.expansion)).filter((token) => !SPANISH_STOP_WORDS.has(token));
};

/** True when the query term is a corpus-verified glossary acronym (PP, PPF).
 * Glossary acronyms may only match on a full-token boundary or through their
 * canonical expansion — never as a raw prefix (`pp` must not reach `ppf`). */
export const isGlossaryAcronym = (foldedToken: string): boolean =>
	Object.prototype.hasOwnProperty.call(ACRONYM_GLOSSARY, foldedToken);

/** True when the query term is an acronym the engine must keep ambiguous. */
export const isAmbiguousAcronym = (foldedToken: string): boolean =>
	ACRONYM_GLOSSARY[foldedToken]?.ambiguous === true;

/**
 * Folded canonical expansion phrase of a verified acronym (stop words kept),
 * e.g. "puntos de progreso" for `pp`. Undefined for ambiguous acronyms (PPF)
 * and for unknown tokens (LS): nothing is invented.
 */
export const acronymExpansionPhrase = (foldedToken: string): string | undefined => {
	const entry = ACRONYM_GLOSSARY[foldedToken];
	return entry?.expansion ? fold(entry.expansion) : undefined;
};
