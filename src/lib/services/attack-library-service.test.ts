/**
 * Service-level tests for the attack library. Both data services are mocked so
 * the suite stays offline. The ability card fixtures reuse the canonical card
 * ids (sha1 of the card name, as the card mapper generates them) so that the
 * owned-card alias resolution is exercised across the real id ↔ name boundary.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Attributes } from '$lib/types/attributes';
import type { AbilityCard } from '$lib/types/cards/ability-card';
import { Character as CharacterClass } from '$lib/types/character';
import type { Character, CharacterCard } from '$lib/types/character';
import type { LibraryItem } from '$lib/types/item';
import { attackLibraryService } from './attack-library-service';

const BLOCKED_ALIAS_REASON =
	'Requiere una carta de sustitución (Estudios Mágicos / Pacto Supremo / Herencia Sobrenatural)';

const hoisted = vi.hoisted(() => {
	const weapons: LibraryItem[] = [
		{
			id: 'weapon-daga',
			name: 'Daga',
			category: 'weapons',
			price: 5,
			notes: 'Daño 1d4, Perforante, Precisa, Arrojadiza (Cercana)',
			damage: '1d4',
			type: 'Perforante',
			properties: 'Precisa, Arrojadiza (Cercana)',
			requirement: '',
		},
		{
			id: 'weapon-espada-larga',
			name: 'Espada larga',
			category: 'weapons',
			price: 50,
			notes: 'Daño 1d8/1d10, Cortante, Versátil, Requiere Cuerpo 3',
			damage: '1d8/1d10',
			type: 'Cortante',
			properties: 'Versátil',
			requirement: 'Cuerpo 3',
		},
		{
			id: 'weapon-maza',
			name: 'Maza',
			category: 'weapons',
			price: 10,
			notes: 'Daño 1d6, Contundente, Requiere Cuerpo 2',
			damage: '1d6',
			type: 'Contundente',
			requirement: 'Cuerpo 2',
		},
	];

	const items: LibraryItem[] = [
		...weapons,
		{
			id: 'armor-cuero',
			name: 'Cuero',
			category: 'armors',
			price: 20,
			notes: 'Mitigación Física 1',
		},
	];

	return {
		items,
		loadItems: vi.fn(async () => {}),
		getItemsByCategory: vi.fn((category: LibraryItem['category']) =>
			items.filter((item) => item.category === category),
		),
		loadAbilityCards: vi.fn(async () => {}),
		/** Canonical ability card id per card name, filled by the mock factory. */
		cardIds: {} as Record<string, string>,
	};
});

vi.mock('$lib/services/items-service', () => ({
	itemsService: {
		loadItems: hoisted.loadItems,
		getItemsByCategory: hoisted.getItemsByCategory,
	},
}));

vi.mock('$lib/services/cards-service', async () => {
	const { writable } = await import('svelte/store');
	const { generateId } = await import('$lib/utils/id-generator');

	const abilityCard = (name: string, description: string): AbilityCard => {
		hoisted.cardIds[name] = generateId(name);
		return {
			id: hoisted.cardIds[name],
			name,
			level: 1,
			tags: ['arcanista'],
			requirements: null,
			description,
			uses: { qty: 1, type: 'USES' },
			type: 'activable',
			cardType: 'ability',
			img: '',
		};
	};

	const abilityCards = writable([
		abilityCard(
			'Rayo Desintegrador',
			'_Un haz de energía verde esmeralda brota de tu dedo para reducir la materia de tu objetivo a cenizas._<br><br> Elije un objetivo a distancia Media. Este debe superar una TS de Reflejos (ND 5 + Atributo Arcano). Si falla, recibe 10d8 de daño de Fuerza. Si tiene éxito, la mitad.',
		),
		abilityCard(
			'Llama Sagrada',
			'_Invocas la luz purificadora de tu deidad en forma de un proyectil de energía radiante, marcando e iluminando a tu enemigo para el próximo ataque._<br><br> Lanzas un virote de energía radiante a una criatura que puedas ver a distancia Cercana. Realiza una tirada de ataque de conjuro (1d8e + Instinto). Si impactas, infliges 1d6 de daño Radiante y el objetivo comienza a brillar hasta el final de tu próximo turno o hasta que vuelva a recibir daño.',
		),
		abilityCard(
			'Descarga Sobrenatural',
			'_Canalizas el poder puro de tu patrón en un proyectil ineludible y letal._<br><br> Realizas un ataque de conjuro (1d8e + Presencia) a distancia Media. Si impactas, infliges 1d8 de daño del tipo elegido.',
		),
		abilityCard(
			'Descarga Elemental',
			'_Canalizas la energía pura de los elementos en un proyectil inestable que lanzas contra tus oponentes._<br><br> Eliges un tipo de daño: Fuego, Frío o Eléctrico. Realizas un ataque de conjuro (1d8e + Atributo Arcano) a distancia Cercana contra un objetivo. Si impactas, infliges 1d8 de daño del tipo elegido.',
		),
		abilityCard('Estudios Mágicos', 'Recupera 2d6 + Atributo Arcano'),
		abilityCard('Pacto Supremo', 'Sellado por un pacto.'),
		abilityCard('Herencia Sobrenatural', 'El poder de tu linaje fluye por tu sangre.'),
	]);

	return {
		useCardsService: () => ({
			loadAbilityCards: hoisted.loadAbilityCards,
			abilityCards,
		}),
	};
});

interface CharacterOptions {
	cards?: CharacterCard[];
	attributes?: Partial<Attributes>;
}

const makeCharacter = ({ cards = [], attributes = {} }: CharacterOptions = {}): Character =>
	new CharacterClass({
		id: 'char-1',
		name: 'Aria',
		attributes: { body: 2, reflexes: 2, mind: 2, instinct: 2, presence: 2, ...attributes },
		cards,
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
	});

const possessedCard = (id: string): CharacterCard => ({
	id,
	uses: null,
	level: 1,
	isActive: true,
	cardType: 'ability',
	isOvercharged: false,
});

const resolveFor = (cardNames: string[], attributes: Partial<Attributes> = {}) =>
	attackLibraryService.resolveArcaneAttribute(
		makeCharacter({
			cards: cardNames.map((name) => possessedCard(hoisted.cardIds[name])),
			attributes,
		}),
	);

describe('attackLibraryService', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('loadWeaponEntries', () => {
		it('FEAT-attack-library @weapon-versatile — maps the weapon catalog in order, splitting the versatile weapon', async () => {
			const entries = await attackLibraryService.loadWeaponEntries();

			expect(entries).toEqual([
				{
					id: 'weapon-daga',
					name: 'Daga',
					atkFormula: '1d8e+reflejos',
					dmgFormula: '1d4',
					notes: 'Perforante · Precisa, Arrojadiza (Cercana)',
					importable: true,
				},
				{
					id: 'weapon-espada-larga-1h',
					name: 'Espada larga (1 mano)',
					atkFormula: '1d8e+cuerpo',
					dmgFormula: '1d8',
					notes: 'Cortante · Versátil · Requisito: Cuerpo 3',
					importable: true,
				},
				{
					id: 'weapon-espada-larga-2h',
					name: 'Espada larga (2 manos)',
					atkFormula: '1d8e+cuerpo',
					dmgFormula: '1d10',
					notes: 'Cortante · Versátil · Requisito: Cuerpo 3',
					importable: true,
				},
				{
					id: 'weapon-maza',
					name: 'Maza',
					atkFormula: '1d8e+cuerpo',
					dmgFormula: '1d6',
					notes: 'Contundente · Requisito: Cuerpo 2',
					importable: true,
				},
			]);
		});

		it('awaits the catalog load before reading the weapons', async () => {
			let resolveLoad!: () => void;
			hoisted.loadItems.mockImplementationOnce(
				() =>
					new Promise<void>((resolve) => {
						resolveLoad = resolve;
					}),
			);

			const entriesPromise = attackLibraryService.loadWeaponEntries();

			expect(hoisted.getItemsByCategory).not.toHaveBeenCalled();

			resolveLoad();
			await entriesPromise;

			expect(hoisted.loadItems).toHaveBeenCalledTimes(1);
			expect(hoisted.getItemsByCategory).toHaveBeenCalledWith('weapons');
		});

		it('re-reads the catalog on every call (no service-level cache)', async () => {
			await attackLibraryService.loadWeaponEntries();
			await attackLibraryService.loadWeaponEntries();

			expect(hoisted.loadItems).toHaveBeenCalledTimes(2);
		});
	});

	describe('loadSpellEntries', () => {
		it('FEAT-attack-library @spell-blocked-alias — extracts the attack cards sorted by name and blocks the unresolved alias', async () => {
			const entries = await attackLibraryService.loadSpellEntries(makeCharacter());

			expect(entries).toEqual([
				{
					id: `card-${hoisted.cardIds['Descarga Elemental']}`,
					name: 'Descarga Elemental',
					atkFormula: null,
					dmgFormula: '1d8',
					notes: 'Conjuro · tipo elegido',
					importable: false,
					disabledReason: BLOCKED_ALIAS_REASON,
				},
				{
					id: `card-${hoisted.cardIds['Descarga Sobrenatural']}`,
					name: 'Descarga Sobrenatural',
					atkFormula: '1d8e+presencia',
					dmgFormula: '1d8',
					notes: 'Conjuro · tipo elegido',
					importable: true,
				},
				{
					id: `card-${hoisted.cardIds['Llama Sagrada']}`,
					name: 'Llama Sagrada',
					atkFormula: '1d8e+instinto',
					dmgFormula: '1d6',
					notes: 'Conjuro · Daño: Radiante',
					importable: true,
				},
			]);
			expect(hoisted.loadAbilityCards).toHaveBeenCalledTimes(1);
		});

		it('FEAT-attack-library @spell-alias — resolves the alias with the character substitution cards', async () => {
			const character = makeCharacter({
				cards: [possessedCard(hoisted.cardIds['Estudios Mágicos'])],
			});

			const entries = await attackLibraryService.loadSpellEntries(character);
			const descargaElemental = entries.find((entry) => entry.name === 'Descarga Elemental');

			expect(descargaElemental).toMatchObject({
				atkFormula: '1d8e+mente',
				importable: true,
			});
			expect(descargaElemental?.disabledReason).toBeUndefined();
		});
	});

	describe('resolveArcaneAttribute', () => {
		it('FEAT-attack-library @spell-blocked-alias — returns null without substitution cards', () => {
			expect(resolveFor([])).toBeNull();
		});

		it('returns null when the owned cards are not substitution triggers', () => {
			expect(resolveFor(['Descarga Sobrenatural', 'Rayo Desintegrador'])).toBeNull();
		});

		it('ignores owned card ids missing from the ability catalog', () => {
			expect(
				attackLibraryService.resolveArcaneAttribute(
					makeCharacter({ cards: [possessedCard('missing-card-id')] }),
				),
			).toBeNull();
		});

		it('FEAT-attack-library @spell-alias — resolves Estudios Mágicos to mente', () => {
			expect(resolveFor(['Estudios Mágicos'])).toBe('mente');
		});

		it.each(['Pacto Supremo', 'Herencia Sobrenatural'])(
			'FEAT-attack-library @spell-alias — resolves %s to presencia',
			(cardName) => {
				expect(resolveFor([cardName])).toBe('presencia');
			},
		);

		it('takes the highest attribute when both candidates are owned', () => {
			expect(resolveFor(['Estudios Mágicos', 'Pacto Supremo'], { mind: 5, presence: 3 })).toBe(
				'mente',
			);
			expect(resolveFor(['Estudios Mágicos', 'Pacto Supremo'], { mind: 3, presence: 5 })).toBe(
				'presencia',
			);
		});

		it('breaks an attribute tie in favor of presencia', () => {
			expect(
				resolveFor(['Estudios Mágicos', 'Herencia Sobrenatural'], { mind: 4, presence: 4 }),
			).toBe('presencia');
		});
	});
});
