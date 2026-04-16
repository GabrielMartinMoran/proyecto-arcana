import { describe, expect, it, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/svelte';
import type { Card } from '$lib/types/cards/card';
import type { Character } from '$lib/types/character';

const reloadableCard: Card = {
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
};

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
});
