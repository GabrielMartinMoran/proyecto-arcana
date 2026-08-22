import { removeDiacritics } from '../../../utils/formatting.js';

/**
 * Dual normalization for lexical matching.
 *
 * The original input is preserved for display. Matching uses a `folded` form
 * (lowercase, diacritics stripped, punctuation as a separator, collapsed
 * spaces). Conventional stemming is deliberately avoided: query terms are only
 * canonicalized and de-stopped, never reduced to a stem.
 */

/** Common Spanish functional words removed when computing query terms. */
export const SPANISH_STOP_WORDS: ReadonlySet<string> = new Set([
	'a',
	'al',
	'ante',
	'bajo',
	'como',
	'con',
	'contra',
	'de',
	'del',
	'desde',
	'el',
	'en',
	'entre',
	'es',
	'hacia',
	'hasta',
	'la',
	'las',
	'le',
	'les',
	'lo',
	'los',
	'para',
	'por',
	'que',
	'se',
	'sin',
	'sobre',
	'son',
	'su',
	'tras',
	'un',
	'una',
	'unas',
	'unos',
	'y',
]);

export const fold = (value: string): string =>
	removeDiacritics(value)
		.toLocaleLowerCase()
		.replace(/[^a-z0-9]+/g, ' ')
		.trim();

export const tokenize = (folded: string): string[] => (folded ? folded.split(' ') : []);

export interface NormalizedQuery {
	/** Full folded query, stop words kept (used for phrase checks). */
	folded: string;
	/** Folded query with stop words removed (used for term comparison). */
	phrase: string;
	/** Searchable tokens after canonicalization and stop-word removal. */
	terms: string[];
}

export const analyzeQuery = (rawQuery: string): NormalizedQuery => {
	const folded = fold(rawQuery);
	const tokens = tokenize(folded);
	const terms = tokens.filter((token) => !SPANISH_STOP_WORDS.has(token));
	return { folded, phrase: terms.join(' '), terms };
};

export const hasSearchableTerms = (query: NormalizedQuery): boolean => query.terms.length > 0;
