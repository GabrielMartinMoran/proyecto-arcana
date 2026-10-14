/**
 * Extracts the attack roll, damage and notes of a canonical spell card from
 * its description prose, translating the card attribute names to the lowercase
 * dice variables the character sheet roller accepts.
 *
 * The extractor is deliberately conservative: an attack with an unresolved
 * "Atributo Arcano" (or any unknown attribute) yields `atkFormula: null` plus
 * the attribute in `unresolvedAttributes`, so the library can block the import
 * instead of silently rolling a zero-valued variable.
 */

export interface ExtractedCardAttack {
	atkFormula: string | null;
	dmgFormula: string;
	notes: string;
	unresolvedAttributes: string[];
}

type ArcaneAttribute = 'mente' | 'presencia';

interface AttackPhrase {
	attributeText: string;
	sentence: string;
	isMelee: boolean;
	isMultiAttack: boolean;
}

interface DamagePhrase {
	dice: string;
	type?: string;
}

interface TranslatedAttribute {
	formula: string | null;
	unresolved: string[];
}

const SPELL_NOTE = 'Conjuro';
const INVOCATION_NOTE = 'invocación';
const MELEE_NOTE = 'cuerpo a cuerpo';
const MULTI_ATTACK_NOTE = '3 ataques';
const NOTE_SEPARATOR = ' · ';

const ATTACK_DICE = '1d8e';
const ARCANE_ATTRIBUTE_ALIAS = 'Atributo Arcano';
const BASE_ATTRIBUTE_NAMES = ['cuerpo', 'reflejos', 'mente', 'instinto', 'presencia'];

const ATTACK_ANCHOR_PATTERN = /\bataques?\s+de\s+conjuro\b/i;
const ATTACK_PARENTHESIS_PATTERN = /^([^()]*)\(([^()]+)\)/;
const ATTACK_FORMULA_PATTERN = /^\s*1d8e\s*\+\s*(?:tu\s+)?(.+?)\s*$/i;
const IMPACT_ANCHOR_PATTERN = /\bsi impactas?\b|\bcada ataque que impacte\b/i;
const DAMAGE_DICE_PATTERN = /^[^.<\n]*?(\d+d\d+)/i;
const CHOSEN_TYPE_PATTERN = /del tipo elegido/i;
const HERITAGE_TYPE_PATTERN = /herencia/i;
const TYPED_DAMAGE_PATTERN = /de\s+daño\s+(?:de\s+)?(?!y\b)(\p{L}+)/iu;
const INVOCATION_VERB_PATTERN = /realice|realizar/i;
const MELEE_PATTERN = /cuerpo a cuerpo/i;
const MULTI_ATTACK_PATTERN = /tres ataques/i;

const SENTENCE_EDGE_SOURCE = String.raw`[.!?]\s|<br\s*\/?>`;
const SENTENCE_EDGE_PATTERN = new RegExp(SENTENCE_EDGE_SOURCE, 'gi');
const FIRST_SENTENCE_EDGE_PATTERN = new RegExp(SENTENCE_EDGE_SOURCE, 'i');

const CHOSEN_DAMAGE_TYPE = 'tipo elegido';
const HERITAGE_DAMAGE_TYPE = 'Daño de Herencia';

/**
 * Reads a canonical `ataque de conjuro (…)` clause and its impact damage
 * phrase. Returns null when either of them is missing or the attack formula
 * does not follow the canonical `1d8e + <attribute>` shape.
 */
export function extractCardAttack(
	description: string,
	options: { arcaneAttribute: ArcaneAttribute | null },
): ExtractedCardAttack | null {
	const attack = extractAttackPhrase(description);
	if (!attack) return null;

	const damage = extractDamagePhrase(description);
	if (!damage) return null;

	const translated = translateAttribute(attack.attributeText, options.arcaneAttribute);

	return {
		atkFormula: translated.formula,
		dmgFormula: damage.dice,
		notes: buildNotes(attack, damage.type),
		unresolvedAttributes: translated.unresolved,
	};
}

function extractAttackPhrase(description: string): AttackPhrase | null {
	const anchor = findFirstMatch(description, ATTACK_ANCHOR_PATTERN);
	if (!anchor) return null;

	const afterAnchor = description.slice(anchor.index + anchor.text.length);
	const parenthesis = ATTACK_PARENTHESIS_PATTERN.exec(afterAnchor);
	if (!parenthesis) return null;

	const attributeText = ATTACK_FORMULA_PATTERN.exec(parenthesis[2])?.[1];
	if (attributeText === undefined) return null;

	const formulaEnd = anchor.index + anchor.text.length + parenthesis[0].length;

	return {
		attributeText: normalizeWhitespace(attributeText),
		sentence: sentenceAround(description, anchor.index, formulaEnd),
		isMelee: MELEE_PATTERN.test(parenthesis[1]),
		isMultiAttack: MULTI_ATTACK_PATTERN.test(description),
	};
}

function extractDamagePhrase(description: string): DamagePhrase | null {
	const anchor = findFirstMatch(description, IMPACT_ANCHOR_PATTERN);
	if (!anchor) return null;

	const afterAnchor = description.slice(anchor.index + anchor.text.length);
	const diceMatch = DAMAGE_DICE_PATTERN.exec(afterAnchor);
	if (!diceMatch) return null;

	const tail = afterAnchor.slice(diceMatch[0].length);

	return { dice: diceMatch[1].toLowerCase(), type: extractDamageType(tail) };
}

function extractDamageType(tail: string): string | undefined {
	const sentenceTail = tail.slice(0, firstSentenceEdgeIndex(tail));

	if (CHOSEN_TYPE_PATTERN.test(sentenceTail)) return CHOSEN_DAMAGE_TYPE;
	if (HERITAGE_TYPE_PATTERN.test(sentenceTail)) return HERITAGE_DAMAGE_TYPE;

	const typedDamage = TYPED_DAMAGE_PATTERN.exec(sentenceTail);
	return typedDamage ? `Daño: ${typedDamage[1]}` : undefined;
}

function translateAttribute(
	attributeText: string,
	arcaneAttribute: ArcaneAttribute | null,
): TranslatedAttribute {
	const normalized = attributeText.toLowerCase();

	if (BASE_ATTRIBUTE_NAMES.includes(normalized)) {
		return { formula: `${ATTACK_DICE}+${normalized}`, unresolved: [] };
	}

	if (normalized === ARCANE_ATTRIBUTE_ALIAS.toLowerCase()) {
		return arcaneAttribute
			? { formula: `${ATTACK_DICE}+${arcaneAttribute}`, unresolved: [] }
			: { formula: null, unresolved: [ARCANE_ATTRIBUTE_ALIAS] };
	}

	return { formula: null, unresolved: [attributeText] };
}

function buildNotes(attack: AttackPhrase, damageType: string | undefined): string {
	return [
		SPELL_NOTE,
		damageType,
		INVOCATION_VERB_PATTERN.test(attack.sentence) ? INVOCATION_NOTE : '',
		attack.isMelee ? MELEE_NOTE : '',
		attack.isMultiAttack ? MULTI_ATTACK_NOTE : '',
	]
		.filter(Boolean)
		.join(NOTE_SEPARATOR);
}

interface TextMatch {
	text: string;
	index: number;
}

function findFirstMatch(text: string, pattern: RegExp): TextMatch | null {
	const match = text.match(pattern);
	if (!match || match.index === undefined) return null;

	return { text: match[0], index: match.index };
}

function sentenceAround(text: string, start: number, end: number): string {
	const edgesBefore = [...text.slice(0, start).matchAll(SENTENCE_EDGE_PATTERN)];
	const lastEdge = edgesBefore[edgesBefore.length - 1];
	const sentenceStart = lastEdge ? (lastEdge.index ?? 0) + lastEdge[0].length : 0;

	const edgesAfter = [...text.slice(end).matchAll(SENTENCE_EDGE_PATTERN)];
	const firstEdge = edgesAfter[0];
	const sentenceEnd = firstEdge ? end + (firstEdge.index ?? 0) : text.length;

	return text.slice(sentenceStart, sentenceEnd);
}

function firstSentenceEdgeIndex(text: string): number {
	return FIRST_SENTENCE_EDGE_PATTERN.exec(text)?.index ?? text.length;
}

function normalizeWhitespace(text: string): string {
	return text.replace(/\s+/g, ' ').trim();
}
