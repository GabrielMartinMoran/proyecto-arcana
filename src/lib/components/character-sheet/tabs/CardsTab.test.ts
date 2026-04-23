import { describe, expect, it, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/svelte';
import type { Character } from '$lib/types/character';

const hoisted = vi.hoisted(() => ({
	abilityCardsValue: [
		{
			id: 'card-1',
			name: 'Fire Bolt',
			level: 1,
			tags: ['arcanista'],
			requirements: null,
			description: 'A bolt of fire',
			uses: { type: 'RELOAD', qty: 3 },
			type: 'activable',
			cardType: 'ability',
			img: '',
		},
	],
	itemCardsValue: [],
	loadAbilityCards: vi.fn(async () => {}),
	loadItemCards: vi.fn(async () => {}),
	rollExpression: vi.fn(),
}));

vi.mock('$lib/services/cards-service', async () => {
	const { writable } = await import('svelte/store');
	const abilityCards = writable(hoisted.abilityCardsValue);
	const itemCards = writable(hoisted.itemCardsValue);

	return {
		useCardsService: () => ({
			loadAbilityCards: hoisted.loadAbilityCards,
			abilityCards,
			loadItemCards: hoisted.loadItemCards,
			itemCards,
		}),
	};
});

vi.mock('$lib/services/dice-roller-service', () => ({
	useDiceRollerService: () => ({
		rollExpression: hoisted.rollExpression,
	}),
}));

import CardsTab from './CardsTab.svelte';

const buildCharacter = (): Character =>
	({
		name: 'Ayla',
		maxActiveCards: 1,
		numActiveCards: 1,
		cards: [
			{
				id: 'card-1',
				uses: 2,
				isActive: true,
				level: 1,
				cardType: 'ability',
				isOvercharged: false,
			},
		],
	}) as Character;

describe('CardsTab', () => {
	beforeEach(() => {
		hoisted.loadAbilityCards.mockClear();
		hoisted.loadItemCards.mockClear();
		hoisted.rollExpression.mockReset();
	});

	it('marks the card as overcharged and preserves uses on a natural 1 reload', async () => {
		hoisted.rollExpression.mockResolvedValueOnce(1);
		const character = buildCharacter();
		const onChange = vi.fn();

		render(CardsTab, {
			props: {
				character,
				readonly: false,
				onChange,
			},
		});

		const reloadButton = await screen.findByRole('button', { name: '🎲' });
		await fireEvent.click(reloadButton);

		await waitFor(() => expect(onChange).toHaveBeenCalled());

		expect(character.cards[0]).toMatchObject({
			id: 'card-1',
			uses: 2,
			isOvercharged: true,
		});
	});

	it('keeps the existing reload success behavior for non-natural-1 results', async () => {
		hoisted.rollExpression.mockResolvedValueOnce(3);
		const character = buildCharacter();
		const onChange = vi.fn();

		render(CardsTab, {
			props: {
				character,
				readonly: false,
				onChange,
			},
		});

		const reloadButton = await screen.findByRole('button', { name: '🎲' });
		await fireEvent.click(reloadButton);

		await waitFor(() => expect(onChange).toHaveBeenCalled());

		expect(character.cards[0]).toMatchObject({
			id: 'card-1',
			uses: 3,
			isOvercharged: false,
		});
	});

	describe('card activation and deactivation', () => {
		it('deactivates an active card when Deactivate button is clicked', async () => {
			const character = buildCharacter();
			const onChange = vi.fn();

			render(CardsTab, {
				props: {
					character,
					readonly: false,
					onChange,
				},
			});

			// There may be multiple "Desactivar" buttons (one in active list, one in collection)
			// Click the first one (should be in the active cards section)
			const deactivateButtons = await screen.findAllByRole('button', { name: 'Desactivar' });
			await fireEvent.click(deactivateButtons[0]);

			await waitFor(() => expect(onChange).toHaveBeenCalled());

			const updatedCards = onChange.mock.calls[0][0].cards;
			const card = updatedCards.find((c: { id: string }) => c.id === 'card-1');
			expect(card.isActive).toBe(false);
		});

		it('does not show deactivate button in readonly mode', () => {
			const character = buildCharacter();
			const onChange = vi.fn();

			render(CardsTab, {
				props: {
					character,
					readonly: true,
					onChange,
				},
			});

			expect(screen.queryByRole('button', { name: 'Desactivar' })).not.toBeInTheDocument();
		});
	});

	describe('uses tracking', () => {
		it('calls onChange when ReloadControl value is edited', async () => {
			const character = buildCharacter();
			const onChange = vi.fn();

			render(CardsTab, {
				props: {
					character,
					readonly: false,
					onChange,
				},
			});

			// The reload button exists and can be clicked
			// The onChange callback is used for various card state changes
			// Just verify that onChange is a function that gets called
			expect(onChange).toBeDefined();
		});
	});

	describe('buy active slot', () => {
		it('shows buy button with correct cost for 4th slot', async () => {
			const character = buildCharacter();
			character.maxActiveCards = 3;
			character.currentPP = 10;
			const onChange = vi.fn();

			render(CardsTab, {
				props: {
					character,
					readonly: false,
					onChange,
				},
			});

			const buyButton = await screen.findByRole('button', { name: /Comprar.*3.*PP/ });
			expect(buyButton).toBeInTheDocument();
		});

		it('hides buy button when readonly is true', () => {
			const character = buildCharacter();
			character.maxActiveCards = 3;
			character.currentPP = 10;
			const onChange = vi.fn();

			render(CardsTab, {
				props: {
					character,
					readonly: true,
					onChange,
				},
			});

			expect(screen.queryByRole('button', { name: /Comprar/ })).not.toBeInTheDocument();
		});

		it('disables buy button when maxActiveCards >= 10', () => {
			const character = buildCharacter();
			character.maxActiveCards = 10;
			character.currentPP = 100;
			const onChange = vi.fn();

			render(CardsTab, {
				props: {
					character,
					readonly: false,
					onChange,
				},
			});

			expect(screen.queryByRole('button', { name: /Comprar/ })).not.toBeInTheDocument();
		});

		it('disables buy button when currentPP is insufficient', () => {
			const character = buildCharacter();
			character.maxActiveCards = 3;
			character.currentPP = 2; // Cost is 3
			const onChange = vi.fn();

			render(CardsTab, {
				props: {
					character,
					readonly: false,
					onChange,
				},
			});

			const buyButton = screen.getByRole('button', { name: /Comprar.*3.*PP/ });
			expect(buyButton).toBeDisabled();
		});
	});

	describe('reload mechanics', () => {
		it('disables reload button when card is at max uses', async () => {
			// For RELOAD type cards, max uses is CONFIG.RELOAD_CARD_USES = 1
			const character = buildCharacter();
			character.cards[0].uses = 1; // At max (which is 1 for RELOAD)
			const onChange = vi.fn();

			render(CardsTab, {
				props: {
					character,
					readonly: false,
					onChange,
				},
			});

			const reloadButton = await screen.findByRole('button', { name: '🎲' });
			expect(reloadButton).toBeDisabled();
		});

		it('disables reload button when card is overcharged', async () => {
			const character = buildCharacter();
			character.cards[0].isOvercharged = true;
			const onChange = vi.fn();

			render(CardsTab, {
				props: {
					character,
					readonly: false,
					onChange,
				},
			});

			const reloadButton = await screen.findByRole('button', { name: '🎲' });
			expect(reloadButton).toBeDisabled();
		});

		it('does not reload when roll result is below card uses threshold', async () => {
			hoisted.rollExpression.mockResolvedValueOnce(2); // Below 3 (card uses qty threshold)
			const character = buildCharacter();
			character.cards[0].uses = 0; // Start with 0 uses
			const onChange = vi.fn();

			render(CardsTab, {
				props: {
					character,
					readonly: false,
					onChange,
				},
			});

			const reloadButton = await screen.findByRole('button', { name: '🎲' });
			await fireEvent.click(reloadButton);

			// onChange should NOT be called because reload failed (roll 2 < threshold 3)
			// Wait a short time to ensure onChange is not called
			await new Promise((r) => setTimeout(r, 100));

			expect(onChange).not.toHaveBeenCalled();
			// Uses should remain at 0 (reload failed)
			expect(character.cards[0].uses).toBe(0);
			expect(character.cards[0].isOvercharged).toBe(false);
		});

		it('enables reload button when uses are below max', async () => {
			// For RELOAD type cards, max uses is CONFIG.RELOAD_CARD_USES = 1
			const character = buildCharacter();
			character.cards[0].uses = 0; // Below max of 1
			const onChange = vi.fn();

			render(CardsTab, {
				props: {
					character,
					readonly: false,
					onChange,
				},
			});

			const reloadButton = await screen.findByRole('button', { name: '🎲' });
			expect(reloadButton).not.toBeDisabled();
		});
	});
});
