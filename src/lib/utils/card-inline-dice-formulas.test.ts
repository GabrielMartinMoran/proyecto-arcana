import { describe, expect, it } from 'vitest';
import type { Attributes } from '$lib/types/attributes';
import type { Card } from '$lib/types/cards/card';
import type { Character, CharacterCard } from '$lib/types/character';
import { Character as CharacterClass } from '$lib/types/character';
import { parseDiceExpression } from '$lib/utils/dice-rolling';
import { generateId } from '$lib/utils/id-generator';
import {
	buildCardRollContext,
	buildCardRollVariables,
	parseCardInlineDiceFormulaParts,
} from './card-inline-dice-formulas';

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

const canonicalCatalog: Card[] = [
	'Estudios Mágicos',
	'Pacto Supremo',
	'Herencia Sobrenatural',
	'Sintonía con el Acero',
	'Sintonía Fluida',
].map(canonicalCard);

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
		name: 'Aria',
		attributes: { body: 2, reflexes: 2, mind: 2, instinct: 2, presence: 2 },
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

const baseAttributes: Attributes = { body: 3, reflexes: 2, mind: 1, instinct: 4, presence: 5 };

const baseVariables: Record<string, number> = {
	Cuerpo: 3,
	Reflejos: 2,
	Mente: 1,
	Instinto: 4,
	Presencia: 5,
};

const formulasFrom = (text: string, variables: Record<string, number> = baseVariables) =>
	parseCardInlineDiceFormulaParts(text, variables).filter((part) => part.type === 'formula');

describe('parseCardInlineDiceFormulaParts', () => {
	it('should extract a numeric dice formula and keep the surrounding prose', () => {
		expect(parseCardInlineDiceFormulaParts('Inflige 1d8 + 2 de daño', baseVariables)).toEqual([
			{ type: 'text', text: 'Inflige ' },
			{ type: 'formula', display: '1d8 + 2', expression: '1d8+2' },
			{ type: 'text', text: ' de daño' },
		]);
	});

	it('should extract multiple formulas with dice and constants in source order', () => {
		expect(formulasFrom('Inflige 1d6 + 5 + 4d2 y luego 2d6 + 3')).toEqual([
			{ type: 'formula', display: '1d6 + 5 + 4d2', expression: '1d6+5+4d2' },
			{ type: 'formula', display: '2d6 + 3', expression: '2d6+3' },
		]);
	});

	it('should preserve the visible span text and normalize uppercase dice separators', () => {
		expect(formulasFrom('Causa 2D6 + 3')).toEqual([
			{ type: 'formula', display: '2D6 + 3', expression: '2d6+3' },
		]);
	});

	it('should preserve the explosive e suffix in the display and in the normalized expression', () => {
		expect(
			formulasFrom('Realizas un ataque de conjuro 1d8e + tu Instinto a distancia Cercana'),
		).toEqual([{ type: 'formula', display: '1d8e + tu Instinto', expression: '1d8e+Instinto' }]);
	});

	it('should normalize an uppercase explosive marker to lowercase in the expression', () => {
		expect(formulasFrom('Clava 1D8E + Presencia')).toEqual([
			{ type: 'formula', display: '1D8E + Presencia', expression: '1d8e+Presencia' },
		]);
	});

	it.each([
		['Cuerpo', '1d4 + Cuerpo', '1d4+Cuerpo'],
		['Reflejos', '1d6 + Reflejos', '1d6+Reflejos'],
		['Mente', '1d8 + Mente', '1d8+Mente'],
		['Instinto', '1d6 + Instinto', '1d6+Instinto'],
		['Presencia', '1d6 + Presencia', '1d6+Presencia'],
	])(
		'should accept the explicit canonical attribute %s',
		(attribute, formula, expectedExpression) => {
			expect(formulasFrom(`Recupera ${formula}`)).toEqual([
				{ type: 'formula', display: formula, expression: expectedExpression },
			]);
		},
	);

	it('should normalize a lowercase attribute reference to the canonical variable name', () => {
		expect(formulasFrom('Recupera 1d4 + cuerpo')).toEqual([
			{ type: 'formula', display: '1d4 + cuerpo', expression: '1d4+Cuerpo' },
		]);
	});

	it('should accept a resolved alias and normalize it to a parseable variable', () => {
		const variables = { ...baseVariables, AtributoArcano: 5 };
		expect(formulasFrom('Recupera 2d6 + Atributo Arcano', variables)).toEqual([
			{ type: 'formula', display: '2d6 + Atributo Arcano', expression: '2d6+AtributoArcano' },
		]);
	});

	it('should accept the normalized martial alias form used by the canonical catalog', () => {
		const variables = { ...baseVariables, AtributoMarcial: 3 };
		expect(
			formulasFrom('Recupera una cantidad de Salud igual a 1d4 + Atributo Marcial', variables),
		).toEqual([
			{ type: 'formula', display: '1d4 + Atributo Marcial', expression: '1d4+AtributoMarcial' },
		]);
	});

	it('should not create a partial button when an alias has no candidate', () => {
		expect(
			parseCardInlineDiceFormulaParts('Recupera 2d6 + Atributo Arcano', baseVariables),
		).toEqual([{ type: 'text', text: 'Recupera 2d6 + Atributo Arcano' }]);
	});

	it('should keep an attribute formula as prose when the variable is unavailable', () => {
		expect(parseCardInlineDiceFormulaParts('Recupera 1d4 + Cuerpo', {})).toEqual([
			{ type: 'text', text: 'Recupera 1d4 + Cuerpo' },
		]);
	});

	it('should keep other eligible formulas when an alias formula is ineligible', () => {
		expect(
			parseCardInlineDiceFormulaParts('Inflige 2d6 + Atributo Arcano y 1d6', baseVariables),
		).toEqual([
			{ type: 'text', text: 'Inflige 2d6 + Atributo Arcano y ' },
			{ type: 'formula', display: '1d6', expression: '1d6' },
		]);
	});

	it('should extract a pure dice formula even with an empty variable map', () => {
		expect(formulasFrom('Inflige 1d6', {})).toEqual([
			{ type: 'formula', display: '1d6', expression: '1d6' },
		]);
	});

	it('should not create buttons for contextual advantage modifiers', () => {
		expect(formulasFrom('Obtienes +1d4 de ventaja')).toEqual([]);
		expect(formulasFrom('Obtienes Ventaja (+1d4) en pruebas')).toEqual([]);
		expect(formulasFrom('infliges +1d4 de daño adicional')).toEqual([]);
	});

	it('should not create buttons for contextual disadvantage modifiers', () => {
		expect(formulasFrom('El objetivo sufre Desventaja (-1d4)')).toEqual([]);
		expect(formulasFrom('tener Desventaja (-1d4) en el siguiente ataque')).toEqual([]);
	});

	it('should not create buttons for difficulty checks', () => {
		expect(formulasFrom('TS de Instinto (ND 5 + Presencia)')).toEqual([]);
		expect(
			formulasFrom('TS de Instinto (ND 5 + Atributo Arcano)', {
				...baseVariables,
				AtributoArcano: 5,
			}),
		).toEqual([]);
		expect(formulasFrom('Tiene CD 15 y rango 6')).toEqual([]);
	});

	it('should not create buttons for deterministic arithmetic', () => {
		expect(formulasFrom('recuperas 3 × Instinto')).toEqual([]);
	});

	it('should not create buttons for plain numbers', () => {
		expect(formulasFrom('Tiene 15 de CD y 6 de rango')).toEqual([]);
	});

	it('should not create buttons for malformed dice-like words', () => {
		expect(formulasFrom('código abc1d6 y texto 1d6abc')).toEqual([]);
	});

	it('should not create buttons for incomplete formulas ending with an operator', () => {
		expect(formulasFrom('Inflige 1d6 +')).toEqual([]);
	});

	it('should not create a partial button for a prose-wrapped attribute continuation', () => {
		expect(formulasFrom('igual a 1d4 + tu puntuación de Reflejos')).toEqual([]);
	});

	it('should not create buttons for count-less dice references', () => {
		expect(formulasFrom('obtienes un Dado de Deuda (un d6)')).toEqual([]);
	});
});

describe('parseCardInlineDiceFormulaParts with the natural possessive wrapper', () => {
	it('should accept tu before a canonical attribute and remove it from the expression', () => {
		expect(parseCardInlineDiceFormulaParts('Recupera 1d4 + tu Instinto', baseVariables)).toEqual([
			{ type: 'text', text: 'Recupera ' },
			{ type: 'formula', display: '1d4 + tu Instinto', expression: '1d4+Instinto' },
		]);
	});

	it.each([
		['1d4 + tu Cuerpo', '1d4+Cuerpo'],
		['1d6 + tu Reflejos', '1d6+Reflejos'],
		['1d8 + tu Mente', '1d8+Mente'],
		['1d6 + tu Presencia', '1d6+Presencia'],
	])('should accept tu before the canonical attribute in %s', (formula, expectedExpression) => {
		expect(parseCardInlineDiceFormulaParts(`Recupera ${formula}`, baseVariables)).toEqual([
			{ type: 'text', text: 'Recupera ' },
			{ type: 'formula', display: formula, expression: expectedExpression },
		]);
	});

	it('should accept tu before a resolved arcane alias', () => {
		const variables = { ...baseVariables, AtributoArcano: 5 };
		expect(formulasFrom('Recupera 2d6 + tu Atributo Arcano', variables)).toEqual([
			{ type: 'formula', display: '2d6 + tu Atributo Arcano', expression: '2d6+AtributoArcano' },
		]);
	});

	it('should accept tu before a resolved martial alias', () => {
		const variables = { ...baseVariables, AtributoMarcial: 3 };
		expect(formulasFrom('Recupera 1d4 + tu Atributo Marcial', variables)).toEqual([
			{ type: 'formula', display: '1d4 + tu Atributo Marcial', expression: '1d4+AtributoMarcial' },
		]);
	});

	it('should preserve tu wrapper casing in the display but not in the expression', () => {
		expect(formulasFrom('Clava 1d4 + TU Instinto')).toEqual([
			{ type: 'formula', display: '1d4 + TU Instinto', expression: '1d4+Instinto' },
		]);
	});

	it('should preserve wrapper spacing in the display but not in the expression', () => {
		expect(formulasFrom('Clava 1d4 +  tu   Instinto')).toEqual([
			{ type: 'formula', display: '1d4 +  tu   Instinto', expression: '1d4+Instinto' },
		]);
	});

	it('should accept the collapsed operator spacing before tu', () => {
		expect(formulasFrom('Clava 1d4+tu Instinto')).toEqual([
			{ type: 'formula', display: '1d4+tu Instinto', expression: '1d4+Instinto' },
		]);
	});

	it('should canonicalize a lowercase attribute after the tu wrapper', () => {
		expect(formulasFrom('Clava 1d4 + tu instinto')).toEqual([
			{ type: 'formula', display: '1d4 + tu instinto', expression: '1d4+Instinto' },
		]);
	});

	it('should keep the plain canonical attribute form valid without the wrapper', () => {
		expect(formulasFrom('Recupera 1d4 + Instinto')).toEqual([
			{ type: 'formula', display: '1d4 + Instinto', expression: '1d4+Instinto' },
		]);
	});

	it('should keep a tu-wrapped attribute formula as prose when the variable is unavailable', () => {
		expect(parseCardInlineDiceFormulaParts('Recupera 1d4 + tu Cuerpo', {})).toEqual([
			{ type: 'text', text: 'Recupera 1d4 + tu Cuerpo' },
		]);
	});

	it('should not create a partial button when tu precedes an unresolved alias', () => {
		expect(
			parseCardInlineDiceFormulaParts('Recupera 2d6 + tu Atributo Arcano', baseVariables),
		).toEqual([{ type: 'text', text: 'Recupera 2d6 + tu Atributo Arcano' }]);
	});

	it('should keep other eligible formulas when a tu-wrapped alias formula is ineligible', () => {
		expect(
			parseCardInlineDiceFormulaParts('Inflige 2d6 + tu Atributo Arcano y 1d6', baseVariables),
		).toEqual([
			{ type: 'text', text: 'Inflige 2d6 + tu Atributo Arcano y ' },
			{ type: 'formula', display: '1d6', expression: '1d6' },
		]);
	});

	it('should not parse tu before the unsupported score phrase before an alias', () => {
		const variables = { ...baseVariables, AtributoArcano: 5 };
		expect(
			parseCardInlineDiceFormulaParts('Recupera 2d6 + tu puntuación de Atributo Arcano', variables),
		).toEqual([{ type: 'text', text: 'Recupera 2d6 + tu puntuación de Atributo Arcano' }]);
	});

	it('should not parse tu before a number', () => {
		expect(parseCardInlineDiceFormulaParts('Inflige 1d6 + tu 3', baseVariables)).toEqual([
			{ type: 'text', text: 'Inflige 1d6 + tu 3' },
		]);
	});

	it('should not parse tu before another dice and must not leave a partial button', () => {
		expect(parseCardInlineDiceFormulaParts('Inflige 1d6 + tu 1d6', baseVariables)).toEqual([
			{ type: 'text', text: 'Inflige 1d6 + tu 1d6' },
		]);
	});

	it('should not parse tu before an unsupported word', () => {
		expect(parseCardInlineDiceFormulaParts('Inflige 1d6 + tu turno', baseVariables)).toEqual([
			{ type: 'text', text: 'Inflige 1d6 + tu turno' },
		]);
	});

	it('should not parse the accented pronoun tú as a wrapper', () => {
		expect(parseCardInlineDiceFormulaParts('Inflige 1d6 + tú Instinto', baseVariables)).toEqual([
			{ type: 'text', text: 'Inflige 1d6 + tú Instinto' },
		]);
	});

	it.each([
		['la', 'Inflige 1d4 + la Presencia'],
		['su', 'Inflige 1d4 + su Reflejos'],
	])('should not parse the pronoun %s as a wrapper', (_pronoun, text) => {
		expect(parseCardInlineDiceFormulaParts(text, baseVariables)).toEqual([{ type: 'text', text }]);
	});

	it('should not treat más as a parser operator or strip tu from prose', () => {
		// Task 4B converts the data lines to "+ tu Instinto"; "más" stays out of the parser scope.
		expect(parseCardInlineDiceFormulaParts('Inflige 1d6 más tu Instinto', baseVariables)).toEqual([
			{ type: 'text', text: 'Inflige ' },
			{ type: 'formula', display: '1d6', expression: '1d6' },
			{ type: 'text', text: ' más tu Instinto' },
		]);
	});

	it('should not create buttons for difficulty checks with the tu wrapper', () => {
		expect(formulasFrom('TS de Instinto (ND 5 + tu Presencia)')).toEqual([]);
	});

	it('should not create buttons for contextual modifiers around a tu wrapper', () => {
		expect(formulasFrom('Obtienes +1d4 con tu Presencia')).toEqual([]);
		expect(formulasFrom('Sufre Desventaja (-1d4) por tu Instinto')).toEqual([]);
	});
});

describe('parseDiceExpression compatibility', () => {
	it('should resolve the canonical attribute variables from the normalized expression', () => {
		const members = parseDiceExpression('1d4+Cuerpo', { Cuerpo: 3 });
		expect(members.find((member) => member.type === 'variable')).toMatchObject({
			type: 'variable',
			value: 3,
			label: 'Cuerpo',
		});
	});

	it('should resolve the normalized alias variables from the normalized expression', () => {
		const members = parseDiceExpression('2d6+AtributoArcano', { AtributoArcano: 5 });
		expect(members.find((member) => member.type === 'variable')).toMatchObject({
			type: 'variable',
			value: 5,
			label: 'AtributoArcano',
		});
	});
});

describe('buildCardRollVariables', () => {
	it('should expose the five current base attribute variables', () => {
		const variables = buildCardRollVariables(
			makeCharacter({ attributes: baseAttributes }),
			canonicalCatalog,
		);
		expect(variables).toMatchObject(baseVariables);
	});

	it('should resolve Atributo Arcano from Estudios Mágicos to Mente', () => {
		const character = makeCharacter({
			attributes: baseAttributes,
			cards: [possessedCard(generateId('Estudios Mágicos'))],
		});
		expect(buildCardRollVariables(character, canonicalCatalog).AtributoArcano).toBe(1);
	});

	it('should resolve Atributo Arcano from Pacto Supremo to Presencia', () => {
		const character = makeCharacter({
			attributes: baseAttributes,
			cards: [possessedCard(generateId('Pacto Supremo'))],
		});
		expect(buildCardRollVariables(character, canonicalCatalog).AtributoArcano).toBe(5);
	});

	it('should resolve Atributo Arcano from Herencia Sobrenatural to Presencia', () => {
		const character = makeCharacter({
			attributes: baseAttributes,
			cards: [possessedCard(generateId('Herencia Sobrenatural'))],
		});
		expect(buildCardRollVariables(character, canonicalCatalog).AtributoArcano).toBe(5);
	});

	it('should resolve Atributo Marcial from Sintonía con el Acero to Cuerpo', () => {
		const character = makeCharacter({
			attributes: baseAttributes,
			cards: [possessedCard(generateId('Sintonía con el Acero'))],
		});
		expect(buildCardRollVariables(character, canonicalCatalog).AtributoMarcial).toBe(3);
	});

	it('should resolve Atributo Marcial from Sintonía Fluida to Reflejos', () => {
		const character = makeCharacter({
			attributes: baseAttributes,
			cards: [possessedCard(generateId('Sintonía Fluida'))],
		});
		expect(buildCardRollVariables(character, canonicalCatalog).AtributoMarcial).toBe(2);
	});

	it('should select the highest candidate for Atributo Arcano with Mente 3 and Presencia 5', () => {
		const character = makeCharacter({
			attributes: { body: 2, reflexes: 2, mind: 3, instinct: 2, presence: 5 },
			cards: [
				possessedCard(generateId('Estudios Mágicos')),
				possessedCard(generateId('Pacto Supremo')),
			],
		});
		expect(buildCardRollVariables(character, canonicalCatalog).AtributoArcano).toBe(5);
	});

	it('should select the highest candidate for Atributo Marcial with Cuerpo 4 and Reflejos 3', () => {
		const character = makeCharacter({
			attributes: { body: 4, reflexes: 3, mind: 2, instinct: 2, presence: 2 },
			cards: [
				possessedCard(generateId('Sintonía con el Acero')),
				possessedCard(generateId('Sintonía Fluida')),
			],
		});
		expect(buildCardRollVariables(character, canonicalCatalog).AtributoMarcial).toBe(4);
	});

	it('should deduplicate a repeated possessed archetype card', () => {
		const character = makeCharacter({
			attributes: baseAttributes,
			cards: [
				possessedCard(generateId('Pacto Supremo')),
				possessedCard(generateId('Pacto Supremo')),
			],
		});
		expect(buildCardRollVariables(character, canonicalCatalog).AtributoArcano).toBe(5);
	});

	it('should deduplicate two archetype cards that map to the same attribute', () => {
		const character = makeCharacter({
			attributes: baseAttributes,
			cards: [
				possessedCard(generateId('Pacto Supremo')),
				possessedCard(generateId('Herencia Sobrenatural')),
			],
		});
		expect(buildCardRollVariables(character, canonicalCatalog).AtributoArcano).toBe(5);
	});

	it('should count an inactive possessed archetype card', () => {
		const character = makeCharacter({
			attributes: baseAttributes,
			cards: [possessedCard(generateId('Estudios Mágicos'), { isActive: false })],
		});
		expect(buildCardRollVariables(character, canonicalCatalog).AtributoArcano).toBe(1);
	});

	it('should ignore a corrupt possessed card id', () => {
		const character = makeCharacter({
			attributes: baseAttributes,
			cards: [possessedCard('id-que-no-existe-en-el-catalogo')],
		});
		const variables = buildCardRollVariables(character, canonicalCatalog);
		expect(variables.AtributoArcano).toBeUndefined();
		expect(variables.AtributoMarcial).toBeUndefined();
	});

	it('should ignore a custom card that shares the visible trigger name', () => {
		const character = makeCharacter({
			attributes: baseAttributes,
			cards: [possessedCard('custom-estudios-magicos')],
		});
		const variables = buildCardRollVariables(character, canonicalCatalog);
		expect(variables.AtributoArcano).toBeUndefined();
	});

	it('should not expose aliases when no canonical candidate is possessed', () => {
		const variables = buildCardRollVariables(
			makeCharacter({ attributes: baseAttributes }),
			canonicalCatalog,
		);
		expect(variables.AtributoArcano).toBeUndefined();
		expect(variables.AtributoMarcial).toBeUndefined();
		expect(variables).toMatchObject(baseVariables);
	});

	it('should expose base attributes but no aliases when the catalog is empty', () => {
		const variables = buildCardRollVariables(makeCharacter({ attributes: baseAttributes }), []);
		expect(variables).toMatchObject(baseVariables);
		expect(variables.AtributoArcano).toBeUndefined();
	});

	it('should return an empty map when the character is undefined', () => {
		expect(buildCardRollVariables(undefined, canonicalCatalog)).toEqual({});
	});
});

describe('buildCardRollContext', () => {
	it('should build a context with normalized variables and the card name as title', () => {
		const character = makeCharacter({ attributes: baseAttributes });
		const context = buildCardRollContext({
			character,
			canonicalCards: canonicalCatalog,
			cardName: 'Festín Macabro',
		});
		expect(context).toEqual({ variables: baseVariables, title: 'Festín Macabro' });
	});

	it('should include a resolved alias in the context variables', () => {
		const character = makeCharacter({
			attributes: { body: 2, reflexes: 2, mind: 3, instinct: 2, presence: 5 },
			cards: [
				possessedCard(generateId('Estudios Mágicos')),
				possessedCard(generateId('Pacto Supremo')),
			],
		});
		const context = buildCardRollContext({
			character,
			canonicalCards: canonicalCatalog,
			cardName: 'Festín Macabro',
		});
		expect(context?.variables.AtributoArcano).toBe(5);
		expect(context?.title).toBe('Festín Macabro');
	});

	it('should return undefined when there is no character', () => {
		expect(
			buildCardRollContext({
				character: undefined,
				canonicalCards: canonicalCatalog,
				cardName: 'Festín Macabro',
			}),
		).toBeUndefined();
	});
});
