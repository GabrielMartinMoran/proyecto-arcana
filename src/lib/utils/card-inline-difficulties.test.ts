import { describe, expect, it } from 'vitest';
import type { Card } from '$lib/types/cards/card';
import type { Character, CharacterCard } from '$lib/types/character';
import { Character as CharacterClass } from '$lib/types/character';
import { generateId } from '$lib/utils/id-generator';
import { buildCardRollVariables } from './card-inline-dice-formulas';
import {
	classifyCardInlineDifficulties,
	evaluateCardInlineDifficulty,
	parseCardInlineDifficultyParts,
} from './card-inline-difficulties';

const baseVariables: Record<string, number> = {
	Cuerpo: 3,
	Reflejos: 2,
	Mente: 1,
	Instinto: 4,
	Presencia: 5,
};

const aliasVariables: Record<string, number> = {
	...baseVariables,
	AtributoArcano: 5,
	AtributoMarcial: 3,
};

describe('classifyCardInlineDifficulties', () => {
	it('should classify ND 5 + tu Instinto with display, base and canonical variable', () => {
		expect(classifyCardInlineDifficulties('ND 5 + tu Instinto')).toEqual([
			{
				display: 'ND 5 + tu Instinto',
				base: 5,
				variableName: 'Instinto',
				span: { start: 0, end: 18 },
				suffix: '',
			},
		]);
	});

	it.each([
		['Instinto', 'Instinto'],
		['Cuerpo', 'Cuerpo'],
		['Reflejos', 'Reflejos'],
		['Mente', 'Mente'],
		['Presencia', 'Presencia'],
	])('should classify the canonical attribute %s', (operand, variableName) => {
		const [difficulty] = classifyCardInlineDifficulties(`ND 5 + ${operand}`);
		expect(difficulty).toMatchObject({ display: `ND 5 + ${operand}`, base: 5, variableName });
	});

	it('should canonicalize a lowercase attribute to the canonical variable name', () => {
		const [difficulty] = classifyCardInlineDifficulties('ND 5 + instinto');
		expect(difficulty?.variableName).toBe('Instinto');
	});

	it('should accept a collapsed plus sign without surrounding spaces', () => {
		const [difficulty] = classifyCardInlineDifficulties('ND 7+Instinto');
		expect(difficulty).toMatchObject({
			display: 'ND 7+Instinto',
			base: 7,
			variableName: 'Instinto',
		});
	});

	it('should accept optional whitespace around the plus sign and preserve the display', () => {
		expect(classifyCardInlineDifficulties('ND 5  +   Instinto')).toEqual([
			expect.objectContaining({
				display: 'ND 5  +   Instinto',
				base: 5,
				variableName: 'Instinto',
			}),
		]);
	});

	it('should accept optional whitespace between ND and the integer', () => {
		const [difficulty] = classifyCardInlineDifficulties('ND  5 + Instinto');
		expect(difficulty).toMatchObject({ base: 5 });
	});

	it('should classify a resolved arcane alias with its normalized variable name', () => {
		expect(classifyCardInlineDifficulties('ND 5 + Atributo Arcano')).toEqual([
			expect.objectContaining({
				display: 'ND 5 + Atributo Arcano',
				variableName: 'AtributoArcano',
			}),
		]);
	});

	it('should classify a resolved martial alias with its normalized variable name', () => {
		expect(classifyCardInlineDifficulties('ND 5 + Atributo Marcial')).toEqual([
			expect.objectContaining({
				display: 'ND 5 + Atributo Marcial',
				variableName: 'AtributoMarcial',
			}),
		]);
	});

	it('should accept tu before an alias', () => {
		const [difficulty] = classifyCardInlineDifficulties('ND 5 + tu Atributo Arcano');
		expect(difficulty).toMatchObject({
			display: 'ND 5 + tu Atributo Arcano',
			variableName: 'AtributoArcano',
		});
	});

	it('should accept the historical tu puntuación de alias wrapper and preserve the display', () => {
		expect(classifyCardInlineDifficulties('ND 5 + tu puntuación de Atributo Arcano')).toEqual([
			expect.objectContaining({
				display: 'ND 5 + tu puntuación de Atributo Arcano',
				variableName: 'AtributoArcano',
			}),
		]);
	});

	it('should preserve the full original formula text as the display', () => {
		const formula = 'ND 5 +  tu   Instinto';
		const [difficulty] = classifyCardInlineDifficulties(`supera ${formula} para resistir`);
		expect(difficulty?.display).toBe(formula);
	});

	it('should expose the source span and the trailing prose suffix', () => {
		const text = 'TS de Reflejos ND 5 + Instinto para mitad de daño';
		const [difficulty] = classifyCardInlineDifficulties(text);
		expect(difficulty).toMatchObject({
			display: 'ND 5 + Instinto',
			span: { start: text.indexOf('ND 5 + Instinto'), end: text.indexOf('ND 5 + Instinto') + 15 },
			suffix: ' para mitad de daño',
		});
		expect(text.slice(difficulty?.span.start, difficulty?.span.end)).toBe('ND 5 + Instinto');
	});

	it('should keep the trailing clause of a comma-separated form as suffix', () => {
		const text =
			'(ND 5 + Presencia, con ventaja si tu o tus compañeros estan combatiendo contra la criatura)';
		const [difficulty] = classifyCardInlineDifficulties(text);
		expect(difficulty).toMatchObject({
			display: 'ND 5 + Presencia',
			suffix: ', con ventaja si tu o tus compañeros estan combatiendo contra la criatura)',
		});
	});

	it('should classify multiple difficulties in source order with their spans and suffixes', () => {
		const text = 'ND 5 + Instinto y luego ND 7 + Atributo Arcano';
		expect(classifyCardInlineDifficulties(text)).toEqual([
			expect.objectContaining({ display: 'ND 5 + Instinto', suffix: ' y luego ' }),
			expect.objectContaining({ display: 'ND 7 + Atributo Arcano', suffix: '' }),
		]);
	});

	it('should not classify a fixed ND without an attribute operand', () => {
		expect(classifyCardInlineDifficulties('El objetivo debe superar ND 15')).toEqual([]);
		expect(classifyCardInlineDifficulties('ND 8')).toEqual([]);
	});

	it('should not classify a difficulty expression with a dangling operator', () => {
		expect(classifyCardInlineDifficulties('ND 5 +')).toEqual([]);
		expect(classifyCardInlineDifficulties('ND 5 + tu')).toEqual([]);
	});

	it('should not classify a difficulty with a non-attribute operand', () => {
		expect(classifyCardInlineDifficulties('ND 5 + el daño sufrido')).toEqual([]);
		expect(classifyCardInlineDifficulties('ND 5 + el objetivo')).toEqual([]);
		expect(classifyCardInlineDifficulties('ND 5 + 2 × Instinto')).toEqual([]);
	});

	it('should not treat más as an operator', () => {
		expect(classifyCardInlineDifficulties('ND 5 más tu Instinto')).toEqual([]);
	});

	it('should not classify malformed, signed or decimal bases', () => {
		expect(classifyCardInlineDifficulties('ND -5 + Instinto')).toEqual([]);
		expect(classifyCardInlineDifficulties('ND 5.5 + Instinto')).toEqual([]);
		expect(classifyCardInlineDifficulties('ND abc + Instinto')).toEqual([]);
	});

	it('should not steal a longer operand word as a partial match', () => {
		expect(classifyCardInlineDifficulties('ND 5 + InstintoPotente')).toEqual([]);
		expect(classifyCardInlineDifficulties('xND 5 + Instinto')).toEqual([]);
	});

	it('should not classify a score wrapper without the tu prefix', () => {
		expect(classifyCardInlineDifficulties('ND 5 + puntuación de Atributo Arcano')).toEqual([]);
	});
});

describe('evaluateCardInlineDifficulty', () => {
	it('should compute base plus the attribute value', () => {
		const [difficulty] = classifyCardInlineDifficulties('ND 5 + tu Instinto');
		expect(evaluateCardInlineDifficulty(difficulty!, baseVariables)).toBe(9);
	});

	it('should compute the collapsed base variant', () => {
		const [difficulty] = classifyCardInlineDifficulties('ND 7+Instinto');
		expect(evaluateCardInlineDifficulty(difficulty!, baseVariables)).toBe(11);
	});

	it('should compute a canonical attribute without the tu wrapper', () => {
		const [difficulty] = classifyCardInlineDifficulties('ND 5 + Instinto');
		expect(evaluateCardInlineDifficulty(difficulty!, baseVariables)).toBe(9);
	});

	it('should compute from a resolved arcane alias', () => {
		const [difficulty] = classifyCardInlineDifficulties('ND 5 + tu Atributo Arcano');
		expect(evaluateCardInlineDifficulty(difficulty!, aliasVariables)).toBe(10);
	});

	it('should compute from a resolved martial alias', () => {
		const [difficulty] = classifyCardInlineDifficulties('ND 5 + Atributo Marcial');
		expect(evaluateCardInlineDifficulty(difficulty!, aliasVariables)).toBe(8);
	});

	it('should compute from the historical tu puntuación de alias wrapper', () => {
		const [difficulty] = classifyCardInlineDifficulties('ND 5 + tu puntuación de Atributo Arcano');
		expect(evaluateCardInlineDifficulty(difficulty!, aliasVariables)).toBe(10);
	});

	it('should return null when the alias is not present in the variables', () => {
		const [difficulty] = classifyCardInlineDifficulties('ND 5 + tu Atributo Arcano');
		expect(evaluateCardInlineDifficulty(difficulty!, baseVariables)).toBeNull();
	});

	it('should return null when the attribute is not present in the variables', () => {
		const [difficulty] = classifyCardInlineDifficulties('ND 5 + tu Instinto');
		expect(evaluateCardInlineDifficulty(difficulty!, {})).toBeNull();
	});

	it('should return null when the variable value is not a finite number', () => {
		const [difficulty] = classifyCardInlineDifficulties('ND 5 + tu Instinto');
		expect(
			evaluateCardInlineDifficulty(difficulty!, { Instinto: '4' as unknown as number }),
		).toBeNull();
	});
});

describe('parseCardInlineDifficultyParts', () => {
	it('should split prose around a resolved difficulty', () => {
		expect(
			parseCardInlineDifficultyParts('El objetivo debe superar ND 5 + tu Instinto', baseVariables),
		).toEqual([
			{ type: 'text', text: 'El objetivo debe superar ' },
			{
				type: 'difficulty',
				display: 'ND 5 + tu Instinto',
				base: 5,
				variableName: 'Instinto',
				result: 9,
				span: { start: 25, end: 43 },
				suffix: '',
			},
		]);
	});

	it('should keep an unresolved alias as original prose without inventing a value', () => {
		const text = 'El objetivo debe superar ND 5 + tu Atributo Arcano';
		expect(parseCardInlineDifficultyParts(text, baseVariables)).toEqual([{ type: 'text', text }]);
	});

	it('should keep the trailing suffix as prose after the difficulty part', () => {
		const text = 'TS de Reflejos ND 5 + Instinto para mitad de daño';
		expect(parseCardInlineDifficultyParts(text, baseVariables)).toEqual([
			{ type: 'text', text: 'TS de Reflejos ' },
			expect.objectContaining({
				type: 'difficulty',
				display: 'ND 5 + Instinto',
				result: 9,
				suffix: ' para mitad de daño',
			}),
			{ type: 'text', text: ' para mitad de daño' },
		]);
	});

	it('should keep only the resolved difficulties and preserve the comma-clause suffix', () => {
		const text = '(ND 5 + Presencia, con ventaja si tu o tus compañeros estan combatiendo)';
		expect(parseCardInlineDifficultyParts(text, baseVariables)).toEqual([
			{ type: 'text', text: '(' },
			expect.objectContaining({ type: 'difficulty', display: 'ND 5 + Presencia', result: 10 }),
			{ type: 'text', text: ', con ventaja si tu o tus compañeros estan combatiendo)' },
		]);
	});

	it('should preserve the collapsed variant display and compute its result', () => {
		const [part] = parseCardInlineDifficultyParts('ND 7+Instinto', baseVariables);
		expect(part).toEqual(
			expect.objectContaining({
				type: 'difficulty',
				display: 'ND 7+Instinto',
				base: 7,
				result: 11,
			}),
		);
	});

	it('should order multiple difficulty parts by source position', () => {
		const parts = parseCardInlineDifficultyParts(
			'ND 5 + Instinto y luego ND 7 + Atributo Arcano',
			aliasVariables,
		);
		expect(parts).toEqual([
			expect.objectContaining({ type: 'difficulty', display: 'ND 5 + Instinto', result: 9 }),
			{ type: 'text', text: ' y luego ' },
			expect.objectContaining({
				type: 'difficulty',
				display: 'ND 7 + Atributo Arcano',
				result: 12,
			}),
		]);
	});

	it('should produce a single text part when nothing is a difficulty', () => {
		const text = 'Tiene CD 15 y rango 6';
		expect(parseCardInlineDifficultyParts(text, baseVariables)).toEqual([{ type: 'text', text }]);
	});
});

describe('card-inline-difficulties with buildCardRollVariables', () => {
	const canonicalCard = (name: string): Card => ({
		id: generateId(name),
		name,
		level: 1,
		tags: [],
		requirements: null,
		description: '',
		uses: { qty: 0, type: null },
		type: 'efecto',
		cardType: 'ability',
	});

	const canonicalCatalog: Card[] = ['Estudios Mágicos', 'Pacto Supremo'].map(canonicalCard);

	const possessedCard = (id: string, overrides: Partial<CharacterCard> = {}): CharacterCard => ({
		id,
		uses: null,
		level: 1,
		isActive: true,
		cardType: 'ability',
		isOvercharged: false,
		...overrides,
	});

	const makeCharacter = (overrides: Partial<Character> = {}): Character =>
		new CharacterClass({
			id: 'char-1',
			name: 'Ayla',
			attributes: { body: 2, reflexes: 2, mind: 3, instinct: 4, presence: 5 },
			cards: [],
			ppHistory: [],
			goldHistory: [],
			equipment: [],
			modifiers: [],
			currentHP: 10,
			tempHP: 0,
			currentLuck: 1,
			img: null,
			notes: [],
			languages: 'Común',
			quickInfo: '',
			attacks: [],
			maxActiveCards: 3,
			version: 1,
			party: { partyId: null, ownerId: null },
			narrativeContext: { appearance: '', background: '', beliefs: '' },
			customCards: [],
			...overrides,
		});

	it('should resolve a dynamic difficulty from the arcane alias variable map', () => {
		const character = makeCharacter({
			cards: [
				possessedCard(generateId('Estudios Mágicos')),
				possessedCard(generateId('Pacto Supremo')),
			],
		});
		const variables = buildCardRollVariables(character, canonicalCatalog);
		const parts = parseCardInlineDifficultyParts('ND 5 + tu Atributo Arcano', variables);

		expect(variables.AtributoArcano).toBe(5);
		expect(parts).toEqual([
			expect.objectContaining({
				type: 'difficulty',
				display: 'ND 5 + tu Atributo Arcano',
				result: 10,
			}),
		]);
	});

	it('should not compute the difficulty when the character provides no arcane alias', () => {
		const variables = buildCardRollVariables(makeCharacter(), canonicalCatalog);
		expect(parseCardInlineDifficultyParts('ND 5 + tu Atributo Arcano', variables)).toEqual([
			{ type: 'text', text: 'ND 5 + tu Atributo Arcano' },
		]);
	});
});
