import { describe, expect, it } from 'vitest';
import { serializeCharacterAsMD } from './character-serializer';
import type { Character } from '$lib/types/character';
import type { Card } from '$lib/types/cards/card';

const buildCharacter = (overrides: Partial<Character> = {}): Character =>
	({
		name: 'Ayla',
		attributes: {
			body: 1,
			reflexes: 2,
			mind: 3,
			instinct: 4,
			presence: 5,
		},
		cards: [
			{
				id: 'card-1',
				uses: null,
				isActive: true,
				level: 1,
				cardType: 'ability',
				isOvercharged: false,
			},
			{
				id: 'custom-abc',
				uses: null,
				isActive: false,
				level: 2,
				cardType: 'item',
				isOvercharged: false,
			},
		],
		ppHistory: [],
		goldHistory: [],
		equipment: [],
		modifiers: [],
		currentHP: 10,
		tempHP: 0,
		currentLuck: 5,
		img: null,
		story: '',
		notes: [],
		languages: '',
		quickInfo: '',
		attacks: [],
		maxActiveCards: 1,
		version: 1,
		party: { partyId: null, ownerId: null },
		skills: [],
		customCards: [
			{
				id: 'custom-abc',
				name: 'Custom Magic Sword',
				level: 2,
				tags: ['weapon'],
				requirements: null,
				description: 'A custom sword',
				uses: { qty: 5, type: 'USES' },
				type: 'activable',
				cardType: 'item',
				cost: '100',
			},
		],
		...overrides,
	}) as unknown as Character;

const staticCards: Card[] = [
	{
		id: 'card-1',
		name: 'Fire Bolt',
		level: 1,
		tags: ['arcanista'],
		requirements: null,
		description: 'A bolt of fire',
		uses: { qty: 3, type: 'RELOAD' },
		type: 'activable',
		cardType: 'ability',
	},
];

describe('serializeCharacterAsMD', () => {
	it('includes custom cards in the collection table', () => {
		const character = buildCharacter();
		const md = serializeCharacterAsMD(character, staticCards);

		expect(md).toContain('Custom Magic Sword');
		expect(md).toContain('Objeto Mágico');
	});

	it('does not include custom cards in the collection table when customCards is undefined', () => {
		const character = buildCharacter({ customCards: undefined });
		const md = serializeCharacterAsMD(character, staticCards);

		expect(md).not.toContain('Custom Magic Sword');
	});

	it('includes static cards normally', () => {
		const character = buildCharacter();
		const md = serializeCharacterAsMD(character, staticCards);

		expect(md).toContain('Fire Bolt');
		expect(md).toContain('Habilidad');
	});
});
