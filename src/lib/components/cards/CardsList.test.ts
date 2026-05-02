import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/svelte';
import { tick } from 'svelte';
import CardsList from './CardsList.svelte';
import type { AbilityCard } from '$lib/types/cards/ability-card';
import type { ItemCard } from '$lib/types/cards/item-card';
import type { CharacterCard } from '$lib/types/character';

const mockCards: AbilityCard[] = [
	{
		id: 'card-1',
		name: 'Fire Bolt',
		description: 'A bolt of fire',
		cardType: 'ability',
		type: 'activable',
		level: 1,
		tags: ['arcanista'],
		img: '',
		uses: { type: 'RELOAD', qty: 3 },
		requirements: null,
	},
	{
		id: 'card-2',
		name: 'Shield',
		description: 'A shield',
		cardType: 'ability',
		type: 'efecto',
		level: 1,
		tags: ['combatiente'],
		img: '',
		uses: { type: 'USES', qty: 2 },
		requirements: null,
	},
];

const mockCharacterCards: CharacterCard[] = [
	{
		id: 'card-1',
		uses: 2,
		isActive: true,
		level: 1,
		cardType: 'ability',
		isOvercharged: false,
	},
	{
		id: 'card-2',
		uses: 1,
		isActive: true,
		level: 1,
		cardType: 'ability',
		isOvercharged: false,
	},
];

const mockAbilityCard: AbilityCard = {
	id: 'ability-1',
	name: 'Fire Bolt',
	description: 'A bolt of fire',
	cardType: 'ability',
	type: 'activable',
	level: 2,
	tags: ['arcanista'],
	img: '',
	uses: { type: 'RELOAD', qty: 3 },
	requirements: null,
};

const mockItemCardNumeric: ItemCard = {
	id: 'item-1',
	name: 'Magic Sword',
	description: 'A magic sword',
	cardType: 'item',
	type: 'activable',
	level: 1,
	tags: ['weapon'],
	img: '',
	uses: { type: 'USES', qty: 5 },
	requirements: null,
	cost: '50',
};

const mockItemCardIncalculable: ItemCard = {
	id: 'item-2',
	name: 'Legendary Artifact',
	description: 'A legendary artifact',
	cardType: 'item',
	type: 'efecto',
	level: 1,
	tags: ['artifact'],
	img: '',
	uses: { type: 'USES', qty: 1 },
	requirements: null,
	cost: 'Incalculable',
};

const mockActivableReloadCard: AbilityCard = {
	id: 'activable-reload-1',
	name: 'Adrenaline Surge',
	description: 'A surge of adrenaline',
	cardType: 'ability',
	type: 'activable',
	level: 1,
	tags: ['combatiente'],
	img: '',
	uses: { type: 'RELOAD', qty: 3 },
	requirements: null,
};

const mockActivableLongRestCard: AbilityCard = {
	id: 'activable-long-rest-1',
	name: 'Second Wind',
	description: 'A second wind',
	cardType: 'ability',
	type: 'activable',
	level: 1,
	tags: ['combatiente'],
	img: '',
	uses: { type: 'LONG_REST', qty: 1 },
	requirements: null,
};

const mockActivableUsesCard: AbilityCard = {
	id: 'activable-uses-1',
	name: 'Shield Block',
	description: 'Block with shield',
	cardType: 'ability',
	type: 'activable',
	level: 1,
	tags: ['combatiente'],
	img: '',
	uses: { type: 'USES', qty: 2 },
	requirements: null,
};

const mockActivableDayCard: AbilityCard = {
	id: 'activable-day-1',
	name: 'Daily Power',
	description: 'A daily power',
	cardType: 'ability',
	type: 'activable',
	level: 1,
	tags: ['combatiente'],
	img: '',
	uses: { type: 'DAY', qty: 1 },
	requirements: null,
};

const mockEfectoUsesCard: AbilityCard = {
	id: 'efecto-uses-1',
	name: 'Passive Aura',
	description: 'A passive aura',
	cardType: 'ability',
	type: 'efecto',
	level: 1,
	tags: ['combatiente'],
	img: '',
	uses: { type: 'USES', qty: 2 },
	requirements: null,
};

describe('CardsList', () => {
	describe('render', () => {
		it('keeps reload control as the first active sibling with local button-rhythm styling', () => {
			const { container } = render(CardsList, {
				props: {
					cards: [mockCards[0]],
					characterCards: [mockCharacterCards[0]],
					listMode: 'active',
					readonly: false,
				},
			});

			const reloadControl = container.querySelector('.reload-control');
			const activeControls = reloadControl?.parentElement;
			const overloadToggle = activeControls?.querySelector('.overload-checkbox');
			expect(reloadControl).toBeInTheDocument();
			expect(reloadControl).toHaveClass('button-height-rhythm');
			expect(activeControls?.firstElementChild).toBe(reloadControl);
			expect(reloadControl?.nextElementSibling).toBe(overloadToggle);
		});

		it('renders ReloadControl for active reloadable cards', () => {
			render(CardsList, {
				props: {
					cards: mockCards,
					characterCards: mockCharacterCards,
					listMode: 'active',
					readonly: false,
				},
			});
			// card-1 is reloadable and active, should show ReloadControl
			const diceButtons = screen.getAllByRole('button', { name: '🎲' });
			expect(diceButtons.length).toBeGreaterThan(0);
		});

		it('renders overload toggle on same row as reload for activable cards', () => {
			const { container } = render(CardsList, {
				props: {
					cards: [mockCards[0]],
					characterCards: [mockCharacterCards[0]],
					listMode: 'active',
					readonly: false,
				},
			});
			// Should have both dice button and overload toggle
			const diceButton = screen.getByRole('button', { name: '🎲' });
			const overloadToggle = screen.getByRole('checkbox');
			const boxedToggle = overloadToggle.closest('label');
			expect(diceButton).toBeInTheDocument();
			expect(overloadToggle).toBeInTheDocument();
			expect(boxedToggle).toHaveClass('overload-checkbox');
			expect(boxedToggle).toHaveClass('boxed-control');
			expect(boxedToggle).toHaveClass('button-height-rhythm');
			expect(boxedToggle).toContainElement(overloadToggle);
			expect(boxedToggle).toHaveAttribute('title', 'Sobrecargada');
			expect(boxedToggle).toHaveTextContent('⚡ Sob');
			// No spacer rendered when card is activable AND has reload uses
			expect(container.querySelector('.controls > .spacer')).toBeNull();
			// The deactivate button follows the overload toggle directly
			const deactivateButton = container.querySelector('.controls > .overload-checkbox + button');
			expect(deactivateButton).toHaveTextContent('Desactivar');
		});

		it('does not render ReloadControl for non-reloadable cards', () => {
			render(CardsList, {
				props: {
					cards: [mockCards[1]],
					characterCards: [mockCharacterCards[1]],
					listMode: 'active',
					readonly: false,
				},
			});
			const diceButton = screen.queryByRole('button', { name: /tirar para recargar/i });
			expect(diceButton).toBeNull();
		});

		it('renders overcharge toggle for activable + RELOAD card', () => {
			render(CardsList, {
				props: {
					cards: [mockActivableReloadCard],
					characterCards: [
						{
							id: 'activable-reload-1',
							uses: 3,
							isActive: true,
							level: 1,
							cardType: 'ability',
							isOvercharged: false,
						},
					],
					listMode: 'active',
					readonly: false,
				},
			});
			const overloadToggle = screen.queryByRole('checkbox');
			expect(overloadToggle).toBeInTheDocument();
		});

		it('does NOT render overcharge toggle for activable + LONG_REST card', () => {
			const { container } = render(CardsList, {
				props: {
					cards: [mockActivableLongRestCard],
					characterCards: [
						{
							id: 'activable-long-rest-1',
							uses: 1,
							isActive: true,
							level: 1,
							cardType: 'ability',
							isOvercharged: false,
						},
					],
					listMode: 'active',
					readonly: false,
				},
			});
			const overloadToggle = screen.queryByRole('checkbox');
			expect(overloadToggle).not.toBeInTheDocument();
			expect(container.querySelector('.controls > .spacer')).toBeInTheDocument();
		});

		it('does NOT render overcharge toggle for activable + USES card', () => {
			const { container } = render(CardsList, {
				props: {
					cards: [mockActivableUsesCard],
					characterCards: [
						{
							id: 'activable-uses-1',
							uses: 2,
							isActive: true,
							level: 1,
							cardType: 'ability',
							isOvercharged: false,
						},
					],
					listMode: 'active',
					readonly: false,
				},
			});
			const overloadToggle = screen.queryByRole('checkbox');
			expect(overloadToggle).not.toBeInTheDocument();
			expect(container.querySelector('.controls > .spacer')).toBeInTheDocument();
		});

		it('does NOT render overcharge toggle for activable + DAY card', () => {
			const { container } = render(CardsList, {
				props: {
					cards: [mockActivableDayCard],
					characterCards: [
						{
							id: 'activable-day-1',
							uses: 1,
							isActive: true,
							level: 1,
							cardType: 'ability',
							isOvercharged: false,
						},
					],
					listMode: 'active',
					readonly: false,
				},
			});
			const overloadToggle = screen.queryByRole('checkbox');
			expect(overloadToggle).not.toBeInTheDocument();
			expect(container.querySelector('.controls > .spacer')).toBeInTheDocument();
		});

		it('does NOT render overcharge toggle for efecto + USES card', () => {
			const { container } = render(CardsList, {
				props: {
					cards: [mockEfectoUsesCard],
					characterCards: [
						{
							id: 'efecto-uses-1',
							uses: 2,
							isActive: true,
							level: 1,
							cardType: 'ability',
							isOvercharged: false,
						},
					],
					listMode: 'active',
					readonly: false,
				},
			});
			const overloadToggle = screen.queryByRole('checkbox');
			expect(overloadToggle).not.toBeInTheDocument();
			expect(container.querySelector('.controls > .spacer')).toBeInTheDocument();
		});
	});

	describe('overcharge state', () => {
		it('keeps native checkbox behavior and reports the updated overcharge state', async () => {
			const onChange = vi.fn();
			render(CardsList, {
				props: {
					cards: [mockCards[0]],
					characterCards: [mockCharacterCards[0]],
					listMode: 'active',
					readonly: false,
					onChange,
				},
			});

			const overloadToggle = screen.getByRole('checkbox');
			await fireEvent.click(overloadToggle);
			await tick();

			expect(onChange).toHaveBeenCalledWith([
				expect.objectContaining({ id: 'card-1', isOvercharged: true }),
			]);
		});

		it('keeps reload callback behavior unchanged', async () => {
			const onCardReloadClick = vi.fn();
			render(CardsList, {
				props: {
					cards: [mockCards[0]],
					characterCards: [mockCharacterCards[0]],
					listMode: 'active',
					readonly: false,
					onCardReloadClick,
				},
			});

			await fireEvent.click(screen.getByRole('button', { name: '🎲' }));
			expect(onCardReloadClick).toHaveBeenCalledWith('card-1');
		});

		it('disables reload button when card is overcharged', async () => {
			const overchargedCards: CharacterCard[] = [
				{
					...mockCharacterCards[0],
					isOvercharged: true,
				},
			];
			render(CardsList, {
				props: {
					cards: [mockCards[0]],
					characterCards: overchargedCards,
					listMode: 'active',
					readonly: false,
				},
			});
			const diceButton = screen.getByRole('button', { name: '🎲' });
			expect(diceButton).toBeDisabled();
		});

		it('reports edited uses through CardsList and keeps reload callback wiring intact after parent update', async () => {
			const onChange = vi.fn();
			const onCardReloadClick = vi.fn();
			render(CardsList, {
				props: {
					cards: [mockCards[0]],
					characterCards: [{ ...mockCharacterCards[0], uses: 0 }],
					listMode: 'active',
					readonly: false,
					onChange,
					onCardReloadClick,
				},
			});

			const reloadBtn = screen.getByRole('button', { name: '🎲' });
			expect(reloadBtn).not.toBeDisabled();
			await fireEvent.click(reloadBtn);
			expect(onCardReloadClick).toHaveBeenCalledWith('card-1');
		});

		it('toggling overcharge disables reload and re-enables when toggled off with parent update', async () => {
			const onChange = vi.fn();
			const onCardReloadClick = vi.fn();
			const { rerender } = render(CardsList, {
				props: {
					cards: [mockCards[0]],
					characterCards: [mockCharacterCards[0]],
					listMode: 'active',
					readonly: false,
					onChange,
					onCardReloadClick,
				},
			});

			// Initially reload should be enabled
			expect(screen.getByRole('button', { name: '🎲' })).not.toBeDisabled();

			// Toggle overcharge ON
			const overloadToggle = screen.getByRole('checkbox');
			await fireEvent.click(overloadToggle);
			await tick();

			expect(onChange).toHaveBeenCalledWith([
				expect.objectContaining({ id: 'card-1', isOvercharged: true }),
			]);

			// Get updated cards and rerender with them
			const [overchargedCards] = onChange.mock.lastCall as [CharacterCard[]];
			await rerender({
				cards: [mockCards[0]],
				characterCards: overchargedCards,
				listMode: 'active',
				readonly: false,
				onChange,
				onCardReloadClick,
			});

			// Reload should now be disabled
			expect(screen.getByRole('button', { name: '🎲' })).toBeDisabled();

			// Click reload - callback should NOT fire (button is disabled)
			await fireEvent.click(screen.getByRole('button', { name: '🎲' }));
			expect(onCardReloadClick).not.toHaveBeenCalled();

			// Toggle overcharge OFF
			await fireEvent.click(screen.getByRole('checkbox'));
			await tick();

			expect(onChange).toHaveBeenCalledWith([
				expect.objectContaining({ id: 'card-1', isOvercharged: false }),
			]);

			// Rerender with updated cards
			const [normalCards] = onChange.mock.lastCall as [CharacterCard[]];
			await rerender({
				cards: [mockCards[0]],
				characterCards: normalCards,
				listMode: 'active',
				readonly: false,
				onChange,
				onCardReloadClick,
			});

			// Reload should be re-enabled
			expect(screen.getByRole('button', { name: '🎲' })).not.toBeDisabled();

			// Click reload - callback should fire again
			await fireEvent.click(screen.getByRole('button', { name: '🎲' }));
			expect(onCardReloadClick).toHaveBeenCalledWith('card-1');
		});
	});

	describe('listMode="all"', () => {
		it('renders purchase button with PP for ability card when currentPP is sufficient', () => {
			render(CardsList, {
				props: {
					cards: [mockAbilityCard],
					listMode: 'all',
					readonly: false,
					currentPP: 5,
				},
			});

			const purchaseButton = screen.getByRole('button', { name: /Comprar.*5.*PP/ });
			expect(purchaseButton).toBeInTheDocument();
			expect(purchaseButton).not.toBeDisabled();
		});

		it('renders purchase button with "o" for item card with numeric cost when currentGold is sufficient', () => {
			render(CardsList, {
				props: {
					cards: [mockItemCardNumeric],
					listMode: 'all',
					readonly: false,
					currentGold: 100,
				},
			});

			const purchaseButton = screen.getByRole('button', { name: /Comprar.*50.*o/ });
			expect(purchaseButton).toBeInTheDocument();
			expect(purchaseButton).not.toBeDisabled();
		});

		it('does not render purchase button for item card with Incalculable cost', () => {
			render(CardsList, {
				props: {
					cards: [mockItemCardIncalculable],
					listMode: 'all',
					readonly: false,
					currentGold: 1000,
				},
			});

			expect(screen.queryByRole('button', { name: /Comprar/ })).not.toBeInTheDocument();
		});

		it('disables purchase button for item card when currentGold is insufficient', () => {
			render(CardsList, {
				props: {
					cards: [mockItemCardNumeric],
					listMode: 'all',
					readonly: false,
					currentGold: 30,
				},
			});

			const purchaseButton = screen.getByRole('button', { name: /Comprar.*50.*o/ });
			expect(purchaseButton).toBeInTheDocument();
			expect(purchaseButton).toBeDisabled();
		});

		it('disables purchase button for ability card when currentPP is insufficient', () => {
			render(CardsList, {
				props: {
					cards: [mockAbilityCard],
					listMode: 'all',
					readonly: false,
					currentPP: 3,
				},
			});

			const purchaseButton = screen.getByRole('button', { name: /Comprar.*5.*PP/ });
			expect(purchaseButton).toBeInTheDocument();
			expect(purchaseButton).toBeDisabled();
		});
	});
});
