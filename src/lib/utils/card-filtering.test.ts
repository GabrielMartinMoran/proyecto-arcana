import type { Attributes } from '$lib/types/attributes';
import type { Card } from '$lib/types/cards/card';
import type { CardFilters } from '$lib/types/card-filters';
import { Character, type CharacterCard } from '$lib/types/character';
import { describe, expect, it } from 'vitest';
import { filterCards } from './card-filtering';

const DEFAULT_ATTRIBUTES: Attributes = {
	body: 1,
	reflexes: 1,
	mind: 1,
	instinct: 1,
	presence: 1,
};

const buildCard = (name: string, requirements: string | null = null): Card => ({
	id: name.toLowerCase().replace(/\s+/g, '-'),
	name,
	level: 1,
	tags: [],
	requirements,
	description: '',
	uses: { type: null, qty: 0 },
	type: 'efecto',
	cardType: 'ability',
	img: '',
});

const buildOwnedCard = (card: Card): CharacterCard => ({
	id: card.id,
	uses: null,
	isActive: false,
	level: card.level,
	cardType: card.cardType,
	isOvercharged: false,
});

const buildCharacter = (
	attributes: Partial<Attributes>,
	ownedCardNames: string[],
	catalog: Card[],
): Character =>
	new Character({
		id: 'character-1',
		name: 'Test Character',
		attributes: { ...DEFAULT_ATTRIBUTES, ...attributes },
		cards: ownedCardNames.map((name) =>
			buildOwnedCard(catalog.find((card) => card.name === name) ?? buildCard(name)),
		),
	});

const availableCardNames = (
	catalog: Card[],
	character: Character,
	options: Partial<CardFilters> = {},
): string[] =>
	filterCards(
		catalog,
		{ name: '', level: [], tags: [], type: '', onlyAvailables: true, ...options },
		character,
	).map((card) => card.name);

const CATALOG: Card[] = [
	buildCard('Estudios Mágicos', 'Mente 2'),
	buildCard('Pacto Supremo', 'Presencia 2'),
	buildCard('Herencia Sobrenatural', 'Presencia 2'),
	buildCard('Afinidad Arcana', 'Estudios Mágicos | Pacto Supremo | Herencia Sobrenatural'),
	buildCard('Trucos Arcanos', 'Afinidad Arcana'),
	buildCard('Invisibilidad', 'Afinidad Arcana & Atributo Arcano 3'),
	buildCard('Barrera Arcana', 'Atributo Arcano 3'),
	buildCard('Dominio Elemental', 'Atributo Arcano 5'),
	buildCard('Descarga Elemental', 'Afinidad Arcana'),
	buildCard('Andanada Energética', 'Descarga Elemental & Atributo Arcano 3'),
	buildCard('Manifestación del Patrón', 'Pacto Supremo & Atributo Arcano 4'),
	buildCard('Esfera de Caos', 'Herencia Sobrenatural & Atributo Arcano 4'),
	buildCard('Sintonía con el Acero', 'Cuerpo 2'),
	buildCard('Ataque Adicional', 'Maestría Marcial & Atributo Marcial 4'),
	buildCard('Torrente de Acero', 'Ataque Adicional & Atributo Marcial 6'),
];

describe('filterCards with onlyAvailables', () => {
	it('lists an Atributo Arcano card without Afinidad Arcana text when the arcane trigger is owned', () => {
		const character = buildCharacter({ mind: 3 }, ['Estudios Mágicos'], CATALOG);

		expect(availableCardNames(CATALOG, character)).toContain('Barrera Arcana');
	});

	it('grants the access card and the list cards when the trigger is owned', () => {
		const character = buildCharacter({ mind: 3 }, ['Estudios Mágicos'], CATALOG);
		const names = availableCardNames(CATALOG, character);

		expect(names).toContain('Afinidad Arcana');
		expect(names).toContain('Trucos Arcanos');
		expect(names).toContain('Invisibilidad');
	});

	it('keeps Atributo Arcano cards hidden when no trigger is owned even with high attributes', () => {
		const character = buildCharacter({ mind: 5, presence: 5 }, [], CATALOG);
		const names = availableCardNames(CATALOG, character);

		expect(names).not.toContain('Barrera Arcana');
		expect(names).not.toContain('Dominio Elemental');
	});

	it('hides the card when the substituted attribute is below the requirement', () => {
		const character = buildCharacter(
			{ mind: 2 },
			['Estudios Mágicos', 'Descarga Elemental'],
			CATALOG,
		);

		expect(availableCardNames(CATALOG, character)).not.toContain('Andanada Energética');
	});

	it('requires the parent card even when the virtual attribute is satisfied', () => {
		const withoutParent = buildCharacter({ mind: 3 }, ['Estudios Mágicos'], CATALOG);
		const withParent = buildCharacter(
			{ mind: 3 },
			['Estudios Mágicos', 'Descarga Elemental'],
			CATALOG,
		);

		expect(availableCardNames(CATALOG, withoutParent)).not.toContain('Andanada Energética');
		expect(availableCardNames(CATALOG, withParent)).toContain('Andanada Energética');
	});

	it('uses the highest candidate attribute when several triggers are owned', () => {
		const character = buildCharacter(
			{ mind: 3, presence: 5 },
			['Estudios Mágicos', 'Pacto Supremo'],
			CATALOG,
		);

		expect(availableCardNames(CATALOG, character)).toContain('Dominio Elemental');
	});

	it('does not borrow the highest attribute when its trigger is not owned', () => {
		const character = buildCharacter({ mind: 3, presence: 5 }, ['Estudios Mágicos'], CATALOG);

		expect(availableCardNames(CATALOG, character)).not.toContain('Dominio Elemental');
	});

	it('resolves Atributo Marcial from the martial trigger', () => {
		const character = buildCharacter(
			{ body: 6 },
			['Sintonía con el Acero', 'Ataque Adicional'],
			CATALOG,
		);

		expect(availableCardNames(CATALOG, character)).toContain('Torrente de Acero');
	});

	it('does not cross-substitute Atributo Marcial for Atributo Arcano', () => {
		const character = buildCharacter({ body: 6 }, ['Sintonía con el Acero'], CATALOG);

		expect(availableCardNames(CATALOG, character)).not.toContain('Barrera Arcana');
	});

	it('resolves virtual attributes of the Brujo and Hechicero access cards', () => {
		const brujo = buildCharacter({ presence: 4 }, ['Pacto Supremo'], CATALOG);
		const hechicero = buildCharacter({ presence: 4 }, ['Herencia Sobrenatural'], CATALOG);

		expect(availableCardNames(CATALOG, brujo)).toContain('Manifestación del Patrón');
		expect(availableCardNames(CATALOG, hechicero)).toContain('Esfera de Caos');
	});

	it('shows all cards when onlyAvailables is disabled', () => {
		const character = buildCharacter({ mind: 1 }, [], CATALOG);

		const names = availableCardNames(CATALOG, character, { onlyAvailables: false });

		expect(names).toEqual(CATALOG.map((card) => card.name));
	});
});
