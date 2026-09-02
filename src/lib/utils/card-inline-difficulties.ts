import { CONFIG } from '../../config';
import { removeDiacritics } from './formatting';

/**
 * A recognized dynamic difficulty expression such as `ND 5 + tu Instinto`.
 *
 * `display` preserves the exact source text. `suffix` is the original prose
 * that follows the expression until the next recognized difficulty (or the end
 * of the source), so a renderer can keep it as normal inline prose.
 */
export type CardInlineDifficulty = {
	display: string;
	base: number;
	variableName: string;
	span: { start: number; end: number };
	suffix: string;
};

export type CardInlineDifficultyPart =
	| { type: 'text'; text: string }
	| (CardInlineDifficulty & { type: 'difficulty'; result: number });

const attributeNames = (): string[] => Object.values(CONFIG.ATTR_NAME_MAP);

const aliasNames = (): string[] => [
	...new Set(
		CONFIG.CARD_ALIASES.flatMap((config) =>
			config.attributeSubstitutions.map((substitution) => substitution.from),
		),
	),
];

const WORD_CHARACTER_PATTERN = /[\p{L}\p{N}_]/u;

const ATTRIBUTE_SOURCE = attributeNames().join('|');
const ALIAS_SOURCE = aliasNames()
	.map((name) =>
		name
			.trim()
			.split(/\s+/)
			.join(String.raw`\s+`),
	)
	.join('|');

const DYNAMIC_EXPRESSION_SOURCE =
	String.raw`ND[ \t]+` +
	String.raw`(\d+)` +
	String.raw`[ \t]*\+[ \t]*` +
	String.raw`(?:tu[ \t]+puntuaci[oó]n[ \t]+de[ \t]+)?` +
	String.raw`(?:tu[ \t]+)?` +
	`(${ATTRIBUTE_SOURCE}|${ALIAS_SOURCE})`;

const buildDynamicPattern = (): RegExp => new RegExp(DYNAMIC_EXPRESSION_SOURCE, 'gi');

const isWordCharacter = (character: string | undefined): boolean =>
	character !== undefined && WORD_CHARACTER_PATTERN.test(character);

const hasValidBoundaries = (text: string, start: number, end: number): boolean =>
	!isWordCharacter(text[start - 1]) && !isWordCharacter(text[end]);

const normalizeVariableName = (name: string): string => removeDiacritics(name).replace(/\s+/g, '');

/**
 * Maps the matched operand to the variable key accepted by
 * `buildCardRollVariables`: canonical display names for attributes and
 * normalized (diacritic-free, whitespace-free) names for aliases.
 */
const resolveVariableName = (rawOperand: string): string => {
	const attribute = attributeNames().find(
		(name) => name.toLowerCase() === rawOperand.toLowerCase(),
	);
	if (attribute) return attribute;

	const alias = aliasNames().find((name) => name.toLowerCase() === rawOperand.toLowerCase());
	return normalizeVariableName(alias ?? rawOperand);
};

const buildDifficulty = (
	match: RegExpExecArray,
	start: number,
	end: number,
): CardInlineDifficulty => ({
	display: match[0],
	base: Number.parseInt(match[1], 10),
	variableName: resolveVariableName(match[2]),
	span: { start, end },
	suffix: '',
});

const attachSuffixes = (
	text: string,
	difficulties: CardInlineDifficulty[],
): CardInlineDifficulty[] =>
	difficulties.map((difficulty, index) => {
		const nextStart = difficulties[index + 1]?.span.start ?? text.length;
		return { ...difficulty, suffix: text.slice(difficulty.span.end, nextStart) };
	});

/**
 * Finds every dynamic difficulty expression `ND <integer> + <attribute|alias>`
 * in `text`. The optional possessive `tu` wrapper and the historical
 * `tu puntuación de <alias>` phrase are accepted, and only `+` is an operator
 * ("más" is never converted). The classifier is purely syntactic: it does not
 * read any variable, so it never invents attribute values.
 */
export const classifyCardInlineDifficulties = (text: string): CardInlineDifficulty[] => {
	const difficulties: CardInlineDifficulty[] = [];

	for (const match of text.matchAll(buildDynamicPattern())) {
		const start = match.index ?? 0;
		const end = start + match[0].length;

		if (!hasValidBoundaries(text, start, end)) continue;

		difficulties.push(buildDifficulty(match, start, end));
	}

	return attachSuffixes(text, difficulties);
};

/**
 * Computes `base + variable value` from the given variable map, or `null` when
 * the attribute/alias is not present or not a finite number. Unknown operands
 * never produce a value.
 */
export const evaluateCardInlineDifficulty = (
	difficulty: CardInlineDifficulty,
	variables: Record<string, number>,
): number | null => {
	const value = variables[difficulty.variableName];

	if (typeof value !== 'number' || !Number.isFinite(value)) return null;

	return difficulty.base + value;
};

const appendTextPart = (parts: CardInlineDifficultyPart[], text: string): void => {
	if (text.length > 0) {
		parts.push({ type: 'text', text });
	}
};

/**
 * Splits the source text into prose parts and resolved difficulty parts.
 * Unresolved difficulties (null result) stay as original prose so no value is
 * invented and no partial component is rendered.
 */
export const parseCardInlineDifficultyParts = (
	text: string,
	variables: Record<string, number>,
): CardInlineDifficultyPart[] => {
	const parts: CardInlineDifficultyPart[] = [];
	let cursor = 0;

	for (const difficulty of classifyCardInlineDifficulties(text)) {
		const result = evaluateCardInlineDifficulty(difficulty, variables);
		if (result === null) continue;

		appendTextPart(parts, text.slice(cursor, difficulty.span.start));
		parts.push({ ...difficulty, type: 'difficulty', result });
		cursor = difficulty.span.end;
	}

	appendTextPart(parts, text.slice(cursor));

	return parts;
};
