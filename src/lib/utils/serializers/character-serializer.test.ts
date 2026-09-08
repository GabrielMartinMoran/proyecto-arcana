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
		narrativeContext: { appearance: '', background: '', beliefs: '' },
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

	it('renders Habilidades con Ventaja section with correct grouping', () => {
		const character = buildCharacter({
			skills: [
				{ id: 's1', name: 'Atletismo', attribute: 'body', description: '', hasAdvantage: true },
			],
		});
		const md = serializeCharacterAsMD(character, staticCards);

		expect(md).toContain('### Habilidades con Ventaja');
		expect(md).toContain('**Cuerpo**');
		expect(md).toContain('- Atletismo');
	});

	it('omits Habilidades con Ventaja section when no skills have advantage', () => {
		const character = buildCharacter({
			skills: [
				{ id: 's1', name: 'Atletismo', attribute: 'body', description: '', hasAdvantage: false },
			],
		});
		const md = serializeCharacterAsMD(character, staticCards);

		expect(md).not.toContain('### Habilidades con Ventaja');
	});

	it('groups multiple advantage skills by attribute', () => {
		const character = buildCharacter({
			skills: [
				{ id: 's1', name: 'Atletismo', attribute: 'body', description: '', hasAdvantage: true },
				{ id: 's2', name: 'Sigilo', attribute: 'reflexes', description: '', hasAdvantage: true },
				{
					id: 's3',
					name: 'Acrobacias',
					attribute: 'reflexes',
					description: '',
					hasAdvantage: true,
				},
				{ id: 's4', name: 'Fuerza Bruta', attribute: 'body', description: '', hasAdvantage: false },
			],
		});
		const md = serializeCharacterAsMD(character, staticCards);

		expect(md).toContain('### Habilidades con Ventaja');
		expect(md).toContain('**Cuerpo**');
		expect(md).toContain('- Atletismo');
		expect(md).toContain('**Reflejos**');
		expect(md).toContain('- Sigilo');
		expect(md).toContain('- Acrobacias');
		expect(md).not.toContain('- Fuerza Bruta');
	});

	describe('narrative context sections', () => {
		it('includes Apariencia y Manierismos section when appearance is set', () => {
			const character = buildCharacter({
				narrativeContext: { appearance: 'Tall and thin', background: '', beliefs: '' },
			});
			const md = serializeCharacterAsMD(character, staticCards);
			expect(md).toContain('## Apariencia y Manierismos');
			expect(md).toContain('Tall and thin');
		});

		it('includes Trasfondo y Origen section when background is set', () => {
			const character = buildCharacter({
				narrativeContext: { appearance: '', background: 'Born in a village', beliefs: '' },
			});
			const md = serializeCharacterAsMD(character, staticCards);
			expect(md).toContain('## Trasfondo y Origen');
			expect(md).toContain('Born in a village');
		});

		it('includes Creencias y Objetivos section when beliefs is set', () => {
			const character = buildCharacter({
				narrativeContext: { appearance: '', background: '', beliefs: 'Seeks truth' },
			});
			const md = serializeCharacterAsMD(character, staticCards);
			expect(md).toContain('## Creencias y Objetivos');
			expect(md).toContain('Seeks truth');
		});

		it('omits narrative context sections when all fields are empty', () => {
			const character = buildCharacter({
				narrativeContext: { appearance: '', background: '', beliefs: '' },
			});
			const md = serializeCharacterAsMD(character, staticCards);
			expect(md).not.toContain('## Apariencia y Manierismos');
			expect(md).not.toContain('## Trasfondo y Origen');
			expect(md).not.toContain('## Creencias y Objetivos');
			expect(md).not.toContain('## Historia');
		});

		it('includes all three narrative context sections when all fields are set', () => {
			const character = buildCharacter({
				narrativeContext: {
					appearance: 'Red hair',
					background: 'Ex-soldier',
					beliefs: 'Honor above all',
				},
			});
			const md = serializeCharacterAsMD(character, staticCards);
			expect(md).toContain('## Apariencia y Manierismos');
			expect(md).toContain('Red hair');
			expect(md).toContain('## Trasfondo y Origen');
			expect(md).toContain('Ex-soldier');
			expect(md).toContain('## Creencias y Objetivos');
			expect(md).toContain('Honor above all');
		});
	});

	describe('linked cards in the Markdown export', () => {
		const parentCard: Card = {
			id: 'card-2',
			name: 'Disciplina Monástica',
			level: 1,
			tags: ['monje'],
			requirements: null,
			description: 'Maestría monástica',
			uses: { type: 'USES', qty: 1 },
			type: 'activable',
			cardType: 'ability',
		};
		const aplomoCard: Card = {
			id: 'card-3',
			name: 'Aplomo',
			level: 1,
			tags: ['monje'],
			requirements: null,
			description: 'Serenidad',
			uses: { type: 'USES', qty: 1 },
			type: 'activable',
			cardType: 'ability',
		};
		const linkedCatalog = [...staticCards, parentCard, aplomoCard];

		const buildLinkedCharacter = (parentActive: boolean): Character => {
			const character = buildCharacter({ customCards: undefined });
			character.maxActiveCards = 2;
			character.cards = [
				{
					id: 'card-1',
					uses: 3,
					isActive: true,
					level: 1,
					cardType: 'ability',
					isOvercharged: false,
					grantedBy: 'card-2',
					doesNotConsumeActiveSlot: true,
				},
				{
					id: 'card-2',
					uses: 0,
					isActive: parentActive,
					level: 1,
					cardType: 'ability',
					isOvercharged: false,
				},
				{
					id: 'card-3',
					uses: 0,
					isActive: true,
					level: 1,
					cardType: 'ability',
					isOvercharged: false,
				},
			];
			return character;
		};

		it('@cards @association @serializer — identifies a linked card with Vinculada a: <parent name>', () => {
			const md = serializeCharacterAsMD(buildLinkedCharacter(true), linkedCatalog);

			expect(md).toContain('Vinculada a: Disciplina Monástica');
			expect(md).toContain('| Fire Bolt | Habilidad | Si | Vinculada a: Disciplina Monástica |');
			expect(md).toContain('| Aplomo | Habilidad | Si | - |');
		});

		it('@cards @association @serializer — excludes effective linked activable cards from the active-card count', () => {
			const md = serializeCharacterAsMD(buildLinkedCharacter(true), linkedCatalog);

			// Fire Bolt is linked to the active parent; only the parent and Aplomo consume slots.
			expect(md).toContain('**Cartas activas:** 2/2');
			// The linked card still appears in its natural collection section.
			expect(md).toContain('Fire Bolt');
		});

		it('@cards @association @serializer — keeps the linked activable card counted when the parent is inactive', () => {
			const md = serializeCharacterAsMD(buildLinkedCharacter(false), linkedCatalog);

			// Parent inactive: the link is no longer effective, so Fire Bolt consumes a slot again.
			expect(md).toContain('**Cartas activas:** 2/2');
			expect(md).toContain('Vinculada a: Disciplina Monástica');
		});

		it('@cards @association @serializer — keeps the linked activable card counted when the no-slot choice is absent even with an active parent', () => {
			const character = buildLinkedCharacter(true);
			character.maxActiveCards = 3;
			delete character.cards[0].doesNotConsumeActiveSlot;

			const md = serializeCharacterAsMD(character, linkedCatalog);

			// No explicit choice means no exemption: Fire Bolt still consumes a slot.
			expect(md).toContain('**Cartas activas:** 3/3');
		});

		it('@cards @association @serializer — keeps the linked activable card counted when the no-slot choice is false even with an active parent', () => {
			const character = buildLinkedCharacter(true);
			character.maxActiveCards = 3;
			character.cards[0].doesNotConsumeActiveSlot = false;

			const md = serializeCharacterAsMD(character, linkedCatalog);

			// An explicit false is not an exemption either: Fire Bolt still consumes a slot.
			expect(md).toContain('**Cartas activas:** 3/3');
		});

		it('@cards @association @serializer — resolves the linked parent name from custom cards in the available catalog', () => {
			const character = buildCharacter();
			character.cards = [
				{
					id: 'card-1',
					uses: 3,
					isActive: true,
					level: 1,
					cardType: 'ability',
					isOvercharged: false,
					grantedBy: 'custom-abc',
				},
				{
					id: 'custom-abc',
					uses: 0,
					isActive: true,
					level: 1,
					cardType: 'item',
					isOvercharged: false,
				},
			];
			const md = serializeCharacterAsMD(character, staticCards);

			expect(md).toContain('Vinculada a: Custom Magic Sword');
		});
	});
});
