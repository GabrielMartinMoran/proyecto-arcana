import type { Card } from '$lib/types/cards/card';
import type { Character, CharacterCard } from '$lib/types/character';
import { fireEvent, render, screen } from '@testing-library/svelte';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ManageCardsView from './ManageCardsView.svelte';

const buildCard = (id: string, name: string, type: string = 'activable'): Card => ({
	id,
	name,
	level: 1,
	tags: [],
	requirements: null,
	description: 'test',
	uses: { type: 'USES', qty: 3 },
	type,
	cardType: 'ability',
	img: '',
});

const buildCharacterCard = (id: string, overrides: Partial<CharacterCard> = {}): CharacterCard => ({
	id,
	uses: null,
	isActive: false,
	level: 1,
	cardType: 'ability',
	isOvercharged: false,
	...overrides,
});

const buildCharacter = (overrides: Partial<Character> = {}): Character =>
	({
		name: 'Test',
		maxActiveCards: 3,
		numActiveCards: 0,
		cards: [],
		ppHistory: [],
		goldHistory: [],
		attributes: { body: 1, reflexes: 1, mind: 1, instinct: 1, presence: 1 },
		...overrides,
	}) as unknown as Character;

const setCurrentPP = (character: Character, value: number) => {
	Object.defineProperty(character, 'currentPP', {
		configurable: true,
		get: () => value,
	});
};

describe('ManageCardsView', () => {
	let onChange: ReturnType<typeof vi.fn>;
	let onEditCard: ReturnType<typeof vi.fn>;
	let onCorruptedCardsChange: ReturnType<typeof vi.fn>;
	let onAddAbilityClick: ReturnType<typeof vi.fn>;
	let onAddItemClick: ReturnType<typeof vi.fn>;
	let onBuyActiveSlot: ReturnType<typeof vi.fn>;

	beforeEach(() => {
		onChange = vi.fn();
		onEditCard = vi.fn();
		onCorruptedCardsChange = vi.fn();
		onAddAbilityClick = vi.fn();
		onAddItemClick = vi.fn();
		onBuyActiveSlot = vi.fn();
	});

	it('shows Controles section when not readonly', () => {
		const character = buildCharacter({ maxActiveCards: 3 });

		render(ManageCardsView, {
			props: {
				cards: [],
				characterCards: [],
				readonly: false,
				character,
				onChange,
				onEditCard,
				onCorruptedCardsChange,
				onAddAbilityClick,
				onAddItemClick,
				onBuyActiveSlot,
			},
		});

		expect(screen.getByText('Ranuras de Cartas Activas')).toBeInTheDocument();
		expect(screen.getByRole('button', { name: 'Agregar Carta de Habilidad' })).toBeInTheDocument();
		expect(
			screen.getByRole('button', { name: 'Agregar Carta de Objeto Mágico' }),
		).toBeInTheDocument();
	});

	it('hides Controles section when readonly', () => {
		const character = buildCharacter();

		render(ManageCardsView, {
			props: {
				cards: [],
				characterCards: [],
				readonly: true,
				character,
				onChange,
				onEditCard,
				onCorruptedCardsChange,
				onAddAbilityClick,
				onAddItemClick,
				onBuyActiveSlot,
			},
		});

		expect(screen.queryByText('Ranuras de Cartas Activas')).not.toBeInTheDocument();
		expect(
			screen.queryByRole('button', { name: 'Agregar Carta de Habilidad' }),
		).not.toBeInTheDocument();
	});

	it('shows Colección Completa with correct count of all characterCards', () => {
		const character = buildCharacter();
		const cards: Card[] = [buildCard('card-1', 'Fire Bolt')];
		const characterCards: CharacterCard[] = [buildCharacterCard('card-1')];

		render(ManageCardsView, {
			props: {
				cards,
				characterCards,
				readonly: true,
				character,
				onChange,
				onEditCard,
				onCorruptedCardsChange,
				onAddAbilityClick,
				onAddItemClick,
				onBuyActiveSlot,
			},
		});

		expect(screen.getByText('Colección Completa (1)')).toBeInTheDocument();
		expect(screen.getByText('Fire Bolt')).toBeInTheDocument();
	});

	it('shows corrupted cards section when corrupted cards exist and not readonly', () => {
		const character = buildCharacter();
		const corruptedCard = buildCharacterCard('missing-card');
		const corruptedCards: CharacterCard[] = [corruptedCard];

		render(ManageCardsView, {
			props: {
				cards: [],
				characterCards: corruptedCards,
				readonly: false,
				character,
				onChange: onCorruptedCardsChange,
				onEditCard,
				onCorruptedCardsChange,
				onAddAbilityClick,
				onAddItemClick,
				onBuyActiveSlot,
				corruptedCards,
			},
		});

		expect(screen.getByText('Cartas Corruptas (1)')).toBeInTheDocument();
		expect(screen.getByText('Carta Corrupta')).toBeInTheDocument();
	});

	it('hides corrupted cards section when readonly even if corrupted cards exist', () => {
		const character = buildCharacter();
		const corruptedCards: CharacterCard[] = [buildCharacterCard('missing-card')];

		render(ManageCardsView, {
			props: {
				cards: [],
				characterCards: corruptedCards,
				readonly: true,
				character,
				onChange: onCorruptedCardsChange,
				onEditCard,
				onCorruptedCardsChange,
				onAddAbilityClick,
				onAddItemClick,
				onBuyActiveSlot,
				corruptedCards,
			},
		});

		expect(screen.queryByText('Cartas Corruptas')).not.toBeInTheDocument();
	});

	it('calls onAddAbilityClick when add ability button is clicked', async () => {
		const character = buildCharacter({ maxActiveCards: 3 });

		render(ManageCardsView, {
			props: {
				cards: [],
				characterCards: [],
				readonly: false,
				character,
				onChange,
				onEditCard,
				onCorruptedCardsChange,
				onAddAbilityClick,
				onAddItemClick,
				onBuyActiveSlot,
			},
		});

		const button = screen.getByRole('button', { name: 'Agregar Carta de Habilidad' });
		await fireEvent.click(button);

		expect(onAddAbilityClick).toHaveBeenCalled();
	});

	it('calls onAddItemClick when add item button is clicked', async () => {
		const character = buildCharacter({ maxActiveCards: 3 });

		render(ManageCardsView, {
			props: {
				cards: [],
				characterCards: [],
				readonly: false,
				character,
				onChange,
				onEditCard,
				onCorruptedCardsChange,
				onAddAbilityClick,
				onAddItemClick,
				onBuyActiveSlot,
			},
		});

		const button = screen.getByRole('button', { name: 'Agregar Carta de Objeto Mágico' });
		await fireEvent.click(button);

		expect(onAddItemClick).toHaveBeenCalled();
	});

	it('shows buy slot button when maxActiveCards < 10 and not readonly', () => {
		const character = buildCharacter({ maxActiveCards: 3 });
		setCurrentPP(character, 10);

		render(ManageCardsView, {
			props: {
				cards: [],
				characterCards: [],
				readonly: false,
				character,
				onChange,
				onEditCard,
				onCorruptedCardsChange,
				onAddAbilityClick,
				onAddItemClick,
				onBuyActiveSlot,
			},
		});

		expect(screen.getByRole('button', { name: /Comprar.*PP/ })).toBeInTheDocument();
	});

	it('hides buy slot button when maxActiveCards >= 10', () => {
		const character = buildCharacter({ maxActiveCards: 10 });

		render(ManageCardsView, {
			props: {
				cards: [],
				characterCards: [],
				readonly: false,
				character,
				onChange,
				onEditCard,
				onCorruptedCardsChange,
				onAddAbilityClick,
				onAddItemClick,
				onBuyActiveSlot,
			},
		});

		expect(screen.queryByRole('button', { name: /Comprar/ })).not.toBeInTheDocument();
	});

	it('disables buy slot button when PP is insufficient', () => {
		const character = buildCharacter({ maxActiveCards: 3 });
		setCurrentPP(character, 2); // less than cost of 3 PP for 4th slot

		render(ManageCardsView, {
			props: {
				cards: [],
				characterCards: [],
				readonly: false,
				character,
				onChange,
				onEditCard,
				onCorruptedCardsChange,
				onAddAbilityClick,
				onAddItemClick,
				onBuyActiveSlot,
			},
		});

		const buyButton = screen.getByRole('button', { name: /Comprar.*PP/ });
		expect(buyButton).toBeDisabled();
	});
});
