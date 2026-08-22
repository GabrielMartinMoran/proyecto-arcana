/**
 * Controlled Spanish lemma map for ARCANA search (T6 morphology gap).
 *
 * This is NOT a stemmer and NOT a general lemmatizer. It is a curated, bounded
 * dictionary that maps the inflected surface forms that actually occur in the
 * real corpus/query space to a single canonical lemma, so a user's inflected
 * verb or noun can reach the index evidence deterministically and offline —
 * e.g. the query verb `imbuir` must match the participle `imbuida`, and the
 * query noun `magia` must match the adverb `mágicamente`.
 *
 * Every key is a folded token (lowercase, diacritics removed). Unknown tokens
 * map to themselves, so the matcher behavior for every other word is unchanged
 * and the short-token boundary rules (`LS` stays a full-token match only) are
 * preserved. Entries are added only when justified by real corpus/query
 * evidence; see tests/search-morphology.test.ts.
 */

/** Folded surface form -> canonical lemma. */
export const SPANISH_LEMMAS: Readonly<Record<string, string>> = {
	// imbuir (infinitivo) ↔ participio/adverbio de la misma raíz.
	imbuir: 'imbuir',
	imbuida: 'imbuir',
	imbuido: 'imbuir',
	imbuidas: 'imbuir',
	imbuidos: 'imbuir',
	imbuye: 'imbuir',
	imbuyen: 'imbuir',
	imbuyes: 'imbuir',
	imbuyo: 'imbuir',
	// magia (sustantivo) ↔ formas adjetivas/adverbiales de la misma familia.
	// `mago`/`magos` se excluyen a propósito: son el arquetipo/clase, no la magia.
	magia: 'magia',
	magica: 'magia',
	magico: 'magia',
	magicas: 'magia',
	magicos: 'magia',
	magicamente: 'magia',
	// coste/costo (sustantivo): canonical `coste` (forma del corpus "El coste ...").
	// Ambas grafías y sus plurales colapsan a una sola lema sin stemming agresivo.
	coste: 'coste',
	costo: 'coste',
	costes: 'coste',
	costos: 'coste',
	// gastar/gasto (verbo y sustantivo derivado): canonical `gastar`.
	gastar: 'gastar',
	gasto: 'gastar',
	gastos: 'gastar',
	gastas: 'gastar',
	gastamos: 'gastar',
	gastan: 'gastar',
	gastado: 'gastar',
	gastada: 'gastar',
	// Singular/plural controlado de sustantivos frecuentes del corpus/query space.
	// La dirección singular→plural ya la cubre el prefijo; esto cierra plural→singular.
	carta: 'carta',
	cartas: 'carta',
	objeto: 'objeto',
	objetos: 'objeto',
	criatura: 'criatura',
	criaturas: 'criatura',
	arma: 'arma',
	armas: 'arma',
	nivel: 'nivel',
	niveles: 'nivel',
	punto: 'punto',
	puntos: 'punto',
	conjuro: 'conjuro',
	conjuros: 'conjuro',
	regla: 'regla',
	reglas: 'regla',
	// Arquetipos/clases: el plural colapsa al singular, pero NUNCA al lema `magia`.
	mago: 'mago',
	magos: 'mago',
	brujo: 'brujo',
	brujos: 'brujo',
	bardo: 'bardo',
	bardos: 'bardo',
};

/**
 * Maps a folded token to its canonical lemma, or to itself when unknown.
 *
 * Only own dictionary entries are read: without this guard a real corpus token
 * such as `constructor` (e.g. "Tabla de Constructor") would resolve to
 * `Object.prototype.constructor` and break matching.
 */
export const toLemma = (token: string): string =>
	Object.prototype.hasOwnProperty.call(SPANISH_LEMMAS, token) ? SPANISH_LEMMAS[token] : token;
