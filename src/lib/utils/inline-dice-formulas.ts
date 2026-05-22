export type InlineDiceFormulaPart =
	| { type: 'text'; text: string }
	| { type: 'formula'; display: string; expression: string };

const FORMULA_PATTERN = /[+-]?\d+[dD]\d+(?:\s*[+-]\s*(?:\d+[dD]\d+|\d+))*/g;
const WORD_CHARACTER_PATTERN = /[\p{L}\p{N}_]/u;

export const parseInlineDiceFormulaParts = (text: string): InlineDiceFormulaPart[] => {
	const parts: InlineDiceFormulaPart[] = [];
	let cursor = 0;

	for (const match of text.matchAll(FORMULA_PATTERN)) {
		const display = match[0];
		const start = match.index ?? 0;
		const end = start + display.length;

		if (!isValidFormulaBoundary(text, start, end) || hasDanglingOperator(text, end)) {
			continue;
		}

		appendTextPart(parts, text.slice(cursor, start));
		parts.push({ type: 'formula', display, expression: normalizeFormula(display) });
		cursor = end;
	}

	appendTextPart(parts, text.slice(cursor));

	return parts;
};

const appendTextPart = (parts: InlineDiceFormulaPart[], text: string) => {
	if (text.length > 0) {
		parts.push({ type: 'text', text });
	}
};

const normalizeFormula = (formula: string) => formula.replaceAll(/\s+/g, '').replaceAll('D', 'd');

const isValidFormulaBoundary = (text: string, start: number, end: number) => {
	const previous = text[start - 1];
	const next = text[end];

	return !isWordCharacter(previous) && !isWordCharacter(next);
};

const isWordCharacter = (character: string | undefined) =>
	character !== undefined && WORD_CHARACTER_PATTERN.test(character);

const hasDanglingOperator = (text: string, formulaEnd: number) =>
	/^[ \t]*[+-](?![ \t]*\d)/.test(text.slice(formulaEnd));
