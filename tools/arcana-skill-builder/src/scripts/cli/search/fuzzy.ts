/**
 * Bounded fuzzy fallback for identity fields.
 *
 * Uses Damerau-Levenshtein distance (transpositions count as one edit) with an
 * explainable threshold: terms shorter than four characters never activate
 * fuzzy, distance is capped per term length, and a match is accepted only above
 * a similarity gate. Fuzzy results map into the 0.58-0.85 strength band so they
 * can never outrank an exact/phrase class match.
 */

export const MIN_FUZZY_TERM_LENGTH = 4;
export const MIN_FUZZY_SIMILARITY = 0.82;
export const FUZZY_SHORT_TERM_MAX = 7;
export const FUZZY_SHORT_MAX_DISTANCE = 1;
export const FUZZY_LONG_MAX_DISTANCE = 2;
export const FUZZY_STRENGTH_MIN = 0.58;
export const FUZZY_STRENGTH_MAX = 0.85;

export const damerauLevenshtein = (left: string, right: string): number => {
	const rows = left.length + 1;
	const cols = right.length + 1;
	const matrix = Array.from({ length: rows }, () => new Array<number>(cols).fill(0));

	for (let row = 0; row < rows; row++) matrix[row][0] = row;
	for (let col = 0; col < cols; col++) matrix[0][col] = col;

	for (let row = 1; row < rows; row++) {
		for (let col = 1; col < cols; col++) {
			const cost = left[row - 1] === right[col - 1] ? 0 : 1;
			matrix[row][col] = Math.min(
				matrix[row - 1][col] + 1,
				matrix[row][col - 1] + 1,
				matrix[row - 1][col - 1] + cost,
			);
			if (
				row > 1 &&
				col > 1 &&
				left[row - 1] === right[col - 2] &&
				left[row - 2] === right[col - 1]
			) {
				matrix[row][col] = Math.min(matrix[row][col], matrix[row - 2][col - 2] + 1);
			}
		}
	}

	return matrix[rows - 1][cols - 1];
};

export const normalizedSimilarity = (left: string, right: string): number => {
	const maxLength = Math.max(left.length, right.length);
	if (maxLength === 0) return 1;
	return 1 - damerauLevenshtein(left, right) / maxLength;
};

export const isFuzzyTermEligible = (term: string): boolean => term.length >= MIN_FUZZY_TERM_LENGTH;

export const hasFuzzyEligibleTerm = (terms: string[]): boolean => terms.some(isFuzzyTermEligible);

export const fuzzyMaxDistanceForTerm = (term: string): number =>
	term.length <= FUZZY_SHORT_TERM_MAX ? FUZZY_SHORT_MAX_DISTANCE : FUZZY_LONG_MAX_DISTANCE;

export const buildFuzzyStrength = (similarity: number): number => {
	const span = 1 - MIN_FUZZY_SIMILARITY;
	const progress = Math.min(1, Math.max(0, (similarity - MIN_FUZZY_SIMILARITY) / span));
	return FUZZY_STRENGTH_MIN + progress * (FUZZY_STRENGTH_MAX - FUZZY_STRENGTH_MIN);
};

export const acceptsFuzzy = (term: string, candidateToken: string): boolean => {
	if (!isFuzzyTermEligible(term)) return false;
	const distance = damerauLevenshtein(term, candidateToken);
	if (distance > fuzzyMaxDistanceForTerm(term)) return false;
	return normalizedSimilarity(term, candidateToken) >= MIN_FUZZY_SIMILARITY;
};
