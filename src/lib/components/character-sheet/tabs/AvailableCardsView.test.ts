import type { Card } from '$lib/types/cards/card';
import type { CharacterCard } from '$lib/types/character';
import { fireEvent, render, screen } from '@testing-library/svelte';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import AvailableCardsView from './AvailableCardsView.svelte';

const buildActivableCard = (
	id: string,
	name: string,
	usesType: 'USES' | 'RELOAD' = 'USES',
): Card => ({
	id,
	name,
	level: 1,
	tags: [],
	requirements: null,
	description: 'test card',
	uses: { type: usesType, qty: usesType === 'USES' ? 3 : 0 },
	type: 'activable',
	cardType: 'ability',
	img: '',
});

const buildEffectCard = (id: string, name: string): Card => ({
	id,
	name,
	level: 1,
	tags: [],
	requirements: null,
	description: 'test effect',
	uses: { type: 'USES', qty: 1 },
	type: 'efecto',
	cardType: 'ability',
	img: '',
});

const buildCharacterCard = (id: string, overrides: Partial<CharacterCard> = {}): CharacterCard => ({
	id,
	uses: null,
	isActive: true,
	level: 1,
	cardType: 'ability',
	isOvercharged: false,
	...overrides,
});

describe('AvailableCardsView', () => {
	let onChange: ReturnType<typeof vi.fn>;
	let onCardReloadClick: ReturnType<typeof vi.fn>;

	beforeEach(() => {
		onChange = vi.fn();
		onCardReloadClick = vi.fn();
	});

	it('shows Cartas Activas container with count header', () => {
		const cards: Card[] = [buildActivableCard('card-1', 'Fire Bolt')];
		const characterCards: CharacterCard[] = [buildCharacterCard('card-1', { isActive: true })];

		render(AvailableCardsView, {
			props: {
				cards,
				characterCards,
				maxActiveCards: 3,
				readonly: false,
				onChange,
				onCardReloadClick,
			},
		});

		expect(screen.getByText('Cartas Activas (1/3)')).toBeInTheDocument();
	});

	it('shows Efectos Activos container with count header', () => {
		const cards: Card[] = [buildEffectCard('effect-1', 'Heal')];
		const characterCards: CharacterCard[] = [buildCharacterCard('effect-1', { isActive: false })];

		render(AvailableCardsView, {
			props: {
				cards,
				characterCards,
				maxActiveCards: 3,
				readonly: false,
				onChange,
				onCardReloadClick,
			},
		});

		expect(screen.getByText('Efectos Activos (1)')).toBeInTheDocument();
	});

	it('filters only active + activable cards into Cartas Activas', () => {
		const cards: Card[] = [
			buildActivableCard('card-1', 'Fire Bolt'),
			buildEffectCard('effect-1', 'Heal'),
		];
		const characterCards: CharacterCard[] = [
			buildCharacterCard('card-1', { isActive: true }),
			buildCharacterCard('effect-1', { isActive: true }),
		];

		render(AvailableCardsView, {
			props: {
				cards,
				characterCards,
				maxActiveCards: 3,
				readonly: false,
				onChange,
				onCardReloadClick,
			},
		});

		// Cartas Activas should show Fire Bolt (activable)
		const activasContainer = screen.getByText('Cartas Activas (1/3)').closest('div');
		expect(activasContainer).toBeTruthy();

		// Fire Bolt should be rendered somewhere
		expect(screen.getByText('Fire Bolt')).toBeInTheDocument();
		// Heal should also be rendered (in Efectos Activos)
		expect(screen.getByText('Heal')).toBeInTheDocument();
	});

	it('shows all effect cards in Efectos Activos regardless of isActive status', () => {
		const cards: Card[] = [
			buildEffectCard('effect-1', 'Active Heal'),
			buildEffectCard('effect-2', 'Inactive Buff'),
		];
		const characterCards: CharacterCard[] = [
			buildCharacterCard('effect-1', { isActive: true }),
			buildCharacterCard('effect-2', { isActive: false }),
		];

		render(AvailableCardsView, {
			props: {
				cards,
				characterCards,
				maxActiveCards: 3,
				readonly: false,
				onChange,
				onCardReloadClick,
			},
		});

		// Both effect cards should appear in Efectos Activos
		expect(screen.getByText('Active Heal')).toBeInTheDocument();
		expect(screen.getByText('Inactive Buff')).toBeInTheDocument();
		expect(screen.getByText('Efectos Activos (2)')).toBeInTheDocument();
	});

	it('shows empty state when no active activable cards', () => {
		const cards: Card[] = [buildActivableCard('card-1', 'Fire Bolt')];
		const characterCards: CharacterCard[] = [buildCharacterCard('card-1', { isActive: false })];

		render(AvailableCardsView, {
			props: {
				cards,
				characterCards,
				maxActiveCards: 3,
				readonly: false,
				onChange,
				onCardReloadClick,
			},
		});

		expect(screen.getByText('Cartas Activas (0/3)')).toBeInTheDocument();
		expect(
			screen.getByText(
				'No tienes cartas activables equipadas. Ve a Gestionar para activar cartas.',
			),
		).toBeInTheDocument();
	});

	it('shows empty state when no effect cards in collection', () => {
		const cards: Card[] = [buildActivableCard('card-1', 'Fire Bolt')];
		const characterCards: CharacterCard[] = [buildCharacterCard('card-1', { isActive: true })];

		render(AvailableCardsView, {
			props: {
				cards,
				characterCards,
				maxActiveCards: 3,
				readonly: false,
				onChange,
				onCardReloadClick,
			},
		});

		expect(screen.getByText('Efectos Activos (0)')).toBeInTheDocument();
		expect(screen.getByText('No tienes cartas de efecto en tu colección.')).toBeInTheDocument();
	});

	it('Efectos Activos section cards are display-only (no action buttons)', () => {
		const cards: Card[] = [buildEffectCard('effect-1', 'Heal')];
		const characterCards: CharacterCard[] = [buildCharacterCard('effect-1', { isActive: true })];

		render(AvailableCardsView, {
			props: {
				cards,
				characterCards,
				maxActiveCards: 3,
				readonly: false,
				onChange,
				onCardReloadClick,
			},
		});

		// In Efectos Activos, there should be NO Desactivar button
		// (readonly=true means no buttons rendered by CardsList)
		// The card name should still be visible
		expect(screen.getByText('Heal')).toBeInTheDocument();
		// No Desactivar button for effect cards
		expect(screen.queryByRole('button', { name: 'Desactivar' })).not.toBeInTheDocument();
	});

	it('passes onCardReloadClick to reloadable activable cards', async () => {
		const cards: Card[] = [buildActivableCard('card-1', 'Fire Bolt', 'RELOAD')];
		const characterCards: CharacterCard[] = [buildCharacterCard('card-1', { isActive: true })];

		render(AvailableCardsView, {
			props: {
				cards,
				characterCards,
				maxActiveCards: 3,
				readonly: false,
				onChange,
				onCardReloadClick,
			},
		});

		const reloadButton = await screen.findByRole('button', { name: '🎲' });
		await fireEvent.click(reloadButton);

		expect(onCardReloadClick).toHaveBeenCalledWith('card-1');
	});
});
