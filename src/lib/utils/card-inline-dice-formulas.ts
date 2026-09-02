import { CONFIG } from '../../config';
import type { Attributes } from '$lib/types/attributes';
import type { Card } from '$lib/types/cards/card';
import type { CardRollContext } from '$lib/types/cards/card-roll-context';
import type { Character } from '$lib/types/character';
import { removeDiacritics } from './formatting';

export type CardInlineDiceFormulaPart =
	| { type: 'text'; text: string }
	| { type: 'formula'; display: string; expression: string };

type AttributeKey = keyof Attributes;

type AliasCandidateRule = {
	alias: string;
	triggerCardName: string;
	attributeKey: AttributeKey;
};

const DICE_SOURCE = String.raw`\d+[dD]\d+[eE]?`;
const NUMBER_SOURCE = String.raw`\d+(?:\.\d+)?`;
const WORD_CHARACTER_PATTERN = /[\p{L}\p{N}_]/u;
const TU_SOURCE = String.raw`\btu\b`;

const attributeNames = (): string[] => Object.values(CONFIG.ATTR_NAME_MAP);

const aliasNames = (): string[] => [
	...new Set(
		CONFIG.CARD_ALIASES.flatMap((config) =>
			config.attributeSubstitutions.map((substitution) => substitution.from),
		),
	),
];

const ATTRIBUTE_SOURCE = attributeNames().join('|');
const ALIAS_SOURCE = aliasNames()
	.map((name) =>
		name
			.trim()
			.split(/\s+/)
			.join(String.raw`\s+`),
	)
	.join('|');
const TU_WRAPPED_OPERAND_SOURCE = `(?:${TU_SOURCE}\\s+)?(?:${ATTRIBUTE_SOURCE}|${ALIAS_SOURCE})`;
const OPERAND_SOURCE = `(?:${DICE_SOURCE}|${NUMBER_SOURCE}|${TU_WRAPPED_OPERAND_SOURCE})`;
const SPAN_SOURCE = `[+-]?(?:${DICE_SOURCE})(?:\\s*[+-]\\s*${OPERAND_SOURCE})*`;
const TOKEN_SOURCE = `([+-])|(${DICE_SOURCE})|(${NUMBER_SOURCE})|(${ATTRIBUTE_SOURCE})|(${ALIAS_SOURCE})|(${TU_SOURCE})`;
const TU_PREFIX_PATTERN = /\btu[ \t]+$/i;

const buildSpanPattern = (): RegExp => new RegExp(SPAN_SOURCE, 'gi');

const buildTokenPattern = (): RegExp => new RegExp(TOKEN_SOURCE, 'gi');

const isWordCharacter = (character: string | undefined): boolean =>
	character !== undefined && WORD_CHARACTER_PATTERN.test(character);

const hasValidBoundaries = (text: string, start: number, end: number): boolean =>
	!isWordCharacter(text[start - 1]) && !isWordCharacter(text[end]);

const hasDanglingOperator = (text: string, formulaEnd: number): boolean =>
	/^[ \t]*[+-](?![ \t]*\d)/.test(text.slice(formulaEnd));

const hasUnsupportedTuBefore = (text: string, formulaStart: number): boolean =>
	TU_PREFIX_PATTERN.test(text.slice(0, formulaStart));

const isContextualModifier = (display: string): boolean =>
	/^[+-]1d4$/i.test(display.replace(/\s+/g, ''));

const hasVariable = (variables: Record<string, number>, name: string): boolean =>
	Object.prototype.hasOwnProperty.call(variables, name);

const normalizeVariableName = (name: string): string => removeDiacritics(name).replace(/\s+/g, '');

const canonicalAttributeName = (raw: string): string =>
	attributeNames().find((name) => name.toLowerCase() === raw.toLowerCase()) ?? raw;

const canonicalAliasName = (raw: string): string =>
	aliasNames().find((name) => name.toLowerCase() === raw.toLowerCase()) ?? raw;

type NormalizedToken = { text: string; eligible: boolean };

const normalizeToken = (
	match: RegExpExecArray,
	variables: Record<string, number>,
): NormalizedToken => {
	const [, operator, dice, number, attribute, alias, tu] = match;

	if (operator) return { text: operator, eligible: true };
	if (dice) return { text: dice.toLowerCase(), eligible: true };
	if (number) return { text: number, eligible: true };
	if (tu) return { text: '', eligible: true };

	if (attribute) {
		const variableName = canonicalAttributeName(attribute);
		return hasVariable(variables, variableName)
			? { text: variableName, eligible: true }
			: { text: '', eligible: false };
	}

	if (alias) {
		const variableName = normalizeVariableName(canonicalAliasName(alias));
		return hasVariable(variables, variableName)
			? { text: variableName, eligible: true }
			: { text: '', eligible: false };
	}

	return { text: '', eligible: true };
};

const normalizeExpression = (
	display: string,
	variables: Record<string, number>,
): { expression: string; eligible: boolean } => {
	let expression = '';

	for (const match of display.matchAll(buildTokenPattern())) {
		const token = normalizeToken(match, variables);
		if (!token.eligible) return { expression: '', eligible: false };
		expression += token.text;
	}

	return { expression, eligible: true };
};

const appendTextPart = (parts: CardInlineDiceFormulaPart[], text: string): void => {
	if (text.length > 0) {
		parts.push({ type: 'text', text });
	}
};

/**
 * Splits a card description into safe text segments and eligible dice formulas.
 *
 * A span is eligible when it starts with a literal dice and only references
 * numeric constants plus attribute or alias variables present in `variables`.
 * The optional possessive word `tu` is accepted only immediately before a
 * canonical attribute or a resolved alias: the span keeps the original text in
 * `display` while `expression` removes only that token.
 * Ineligible spans (contextual modifiers, difficulties, arithmetic, unresolved
 * aliases, unsupported `tu` wrappers, malformed text) remain visible prose and
 * never produce a partial formula button.
 */
export const parseCardInlineDiceFormulaParts = (
	text: string,
	variables: Record<string, number> = {},
): CardInlineDiceFormulaPart[] => {
	const parts: CardInlineDiceFormulaPart[] = [];
	let cursor = 0;

	for (const match of text.matchAll(buildSpanPattern())) {
		const display = match[0];
		const start = match.index ?? 0;
		const end = start + display.length;

		if (
			!hasValidBoundaries(text, start, end) ||
			hasDanglingOperator(text, end) ||
			hasUnsupportedTuBefore(text, start)
		) {
			continue;
		}

		const normalized = normalizeExpression(display, variables);
		if (!normalized.eligible || isContextualModifier(display)) {
			continue;
		}

		appendTextPart(parts, text.slice(cursor, start));
		parts.push({ type: 'formula', display, expression: normalized.expression });
		cursor = end;
	}

	appendTextPart(parts, text.slice(cursor));

	return parts;
};

const attributeKeyForDisplayName = (displayName: string): AttributeKey | undefined => {
	const entry = Object.entries(CONFIG.ATTR_NAME_MAP).find(([, name]) => name === displayName);
	return entry?.[0] as AttributeKey | undefined;
};

const deriveAliasCandidateRules = (): AliasCandidateRule[] => {
	const rules: AliasCandidateRule[] = [];
	for (const aliasConfig of CONFIG.CARD_ALIASES) {
		for (const triggerCardName of aliasConfig.triggerCards) {
			for (const substitution of aliasConfig.attributeSubstitutions) {
				const attributeKey = attributeKeyForDisplayName(substitution.to);
				if (!attributeKey) continue;
				rules.push({ alias: substitution.from, triggerCardName, attributeKey });
			}
		}
	}
	return rules;
};

const buildBaseAttributeVariables = (attributes: Attributes): Record<string, number> => {
	const variables: Record<string, number> = {};
	for (const [key, displayName] of Object.entries(CONFIG.ATTR_NAME_MAP)) {
		variables[displayName] = attributes[key as AttributeKey];
	}
	return variables;
};

const resolveAliasCandidates = (
	character: Character,
	canonicalCards: Card[],
): Map<string, Set<AttributeKey>> => {
	const candidatesByAlias = new Map<string, Set<AttributeKey>>();

	for (const rule of deriveAliasCandidateRules()) {
		const canonicalCard = canonicalCards.find((card) => card.name === rule.triggerCardName);
		if (!canonicalCard) continue;
		if (!character.cards.some((ownedCard) => ownedCard.id === canonicalCard.id)) continue;

		const candidates = candidatesByAlias.get(rule.alias) ?? new Set<AttributeKey>();
		candidates.add(rule.attributeKey);
		candidatesByAlias.set(rule.alias, candidates);
	}

	return candidatesByAlias;
};

/**
 * Maps a character's current base attributes and possessed canonical archetype
 * cards to the variable names accepted by the existing dice parser.
 *
 * Each resolved alias takes the highest base value among its deduplicated
 * candidates. Aliases without a possessed canonical candidate are not exposed.
 */
export const buildCardRollVariables = (
	character: Character | undefined,
	canonicalCards: Card[],
): Record<string, number> => {
	if (!character) return {};

	const variables = buildBaseAttributeVariables(character.attributes);

	for (const [alias, candidates] of resolveAliasCandidates(character, canonicalCards)) {
		const value = Math.max(...[...candidates].map((key) => character.attributes[key]));
		variables[normalizeVariableName(alias)] = value;
	}

	return variables;
};

/**
 * Builds the optional roll context for a card rendered inside a character
 * sheet. Returns undefined when there is no character, so library-like
 * contexts stay read-only.
 */
export const buildCardRollContext = (args: {
	character: Character | undefined;
	canonicalCards: Card[];
	cardName: string;
}): CardRollContext | undefined => {
	if (!args.character) return undefined;

	return {
		variables: buildCardRollVariables(args.character, args.canonicalCards),
		title: args.cardName,
	};
};
