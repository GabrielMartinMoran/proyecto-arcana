import { describe, expect, it, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/svelte';
import type { Card } from '$lib/types/cards/card';
import type { Character } from '$lib/types/character';

// ---- Mock SvelteKit internals used by cards-filter-service ----
vi.mock('$app/navigation', () => ({
	replaceState: vi.fn(),
}));

vi.mock('$app/state', () => ({
	page: {
		url: new URL('http://localhost/'),
	},
}));

import AddCardModal from './AddCardModal.svelte';

const buildCharacter = (overrides: Partial<Character> = {}): Character =>
	({
		name: 'Ayla',
		attributes: {
			body: 1,
			reflexes: 1,
			mind: 1,
			instinct: 1,
			presence: 1,
		},
		cards: [],
		ppHistory: [],
		goldHistory: [],
		...overrides,
	}) as unknown as Character;

const allCards: Card[] = [
	{
		id: 'available-card',
		name: 'Available Card',
		level: 1,
		tags: ['common'],
		requirements: null,
		description: 'Available to everyone',
		uses: { type: 'USES', qty: 1 },
		type: 'activable',
		cardType: 'ability',
		img: '',
	},
	{
		id: 'unavailable-card',
		name: 'Unavailable Card',
		level: 1,
		tags: ['common'],
		requirements: 'Cuerpo 2',
		description: 'Requires body 2',
		uses: { type: 'USES', qty: 1 },
		type: 'activable',
		cardType: 'ability',
		img: '',
	},
	{
		id: 'owned-card',
		name: 'Owned Card',
		level: 1,
		tags: ['common'],
		requirements: null,
		description: 'Already owned',
		uses: { type: 'USES', qty: 1 },
		type: 'activable',
		cardType: 'ability',
		img: '',
	},
];

describe('AddCardModal', () => {
	const onClose = vi.fn();
	const onCardsChange = vi.fn();
	const onPurchaseCard = vi.fn();

	beforeEach(() => {
		onClose.mockClear();
		onCardsChange.mockClear();
		onPurchaseCard.mockClear();
	});

	describe('toggle "Ver Solo disponibles"', () => {
		it('shows only available cards when toggle is on (default)', async () => {
			const character = buildCharacter({
				cards: [
					{
						id: 'owned-card',
						uses: null,
						isActive: false,
						level: 1,
						cardType: 'ability',
						isOvercharged: false,
					},
				],
			});

			render(AddCardModal, {
				props: {
					opened: true,
					cards: allCards,
					character,
					onClose,
					onCardsChange,
					onPurchaseCard,
				},
			});

			// Should show available-card, should NOT show unavailable-card or owned-card
			await waitFor(() => {
				expect(screen.getByText('Available Card')).toBeInTheDocument();
			});
			expect(screen.queryByText('Unavailable Card')).not.toBeInTheDocument();
			expect(screen.queryByText('Owned Card')).not.toBeInTheDocument();
		});

		it('shows all unowned cards when toggle is off', async () => {
			const character = buildCharacter({
				cards: [
					{
						id: 'owned-card',
						uses: null,
						isActive: false,
						level: 1,
						cardType: 'ability',
						isOvercharged: false,
					},
				],
			});

			render(AddCardModal, {
				props: {
					opened: true,
					cards: allCards,
					character,
					onClose,
					onCardsChange,
					onPurchaseCard,
				},
			});

			// Uncheck "Ver Solo disponibles"
			const toggle = await screen.findByLabelText('Ver Solo disponibles');
			await fireEvent.click(toggle);

			await waitFor(() => {
				expect(screen.getByText('Available Card')).toBeInTheDocument();
			});
			expect(screen.getByText('Unavailable Card')).toBeInTheDocument();
			expect(screen.queryByText('Owned Card')).not.toBeInTheDocument();
		});
	});

	describe('reactive recalculation', () => {
		it('removes a card from the list after it is added to character.cards', async () => {
			const character = buildCharacter();

			const { rerender } = render(AddCardModal, {
				props: {
					opened: true,
					cards: allCards,
					character,
					onClose,
					onCardsChange,
					onPurchaseCard,
				},
			});

			await waitFor(() => {
				expect(screen.getByText('Available Card')).toBeInTheDocument();
			});

			// Simulate adding the card by updating character.cards
			const updatedCharacter = buildCharacter({
				cards: [
					{
						id: 'available-card',
						uses: null,
						isActive: false,
						level: 1,
						cardType: 'ability',
						isOvercharged: false,
					},
				],
			});

			await rerender({ character: updatedCharacter });

			await waitFor(() => {
				expect(screen.queryByText('Available Card')).not.toBeInTheDocument();
			});
		});

		it('removes a card from the list after it is purchased (simulated via character.cards update)', async () => {
			const character = buildCharacter();

			const { rerender } = render(AddCardModal, {
				props: {
					opened: true,
					cards: allCards,
					character,
					onClose,
					onCardsChange,
					onPurchaseCard,
				},
			});

			// Turn off "only availables" so the unavailable card is visible
			const toggle = await screen.findByLabelText('Ver Solo disponibles');
			await fireEvent.click(toggle);

			await waitFor(() => {
				expect(screen.getByText('Unavailable Card')).toBeInTheDocument();
			});

			// Simulate purchase by updating character.cards
			const updatedCharacter = buildCharacter({
				cards: [
					{
						id: 'unavailable-card',
						uses: null,
						isActive: false,
						level: 1,
						cardType: 'ability',
						isOvercharged: false,
					},
				],
			});

			await rerender({ character: updatedCharacter });

			await waitFor(() => {
				expect(screen.queryByText('Unavailable Card')).not.toBeInTheDocument();
			});
		});
	});
});
