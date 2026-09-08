import { fireEvent, render, screen } from '@testing-library/svelte';
import { tick } from 'svelte';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const rollContextMocks = vi.hoisted(() => ({
	rollExpression: vi.fn(),
}));

vi.mock('$lib/services/dice-roller-service', () => ({
	useDiceRollerService: () => ({
		rollExpression: rollContextMocks.rollExpression,
	}),
}));

import type { AbilityCard } from '$lib/types/cards/ability-card';
import type { ItemCard } from '$lib/types/cards/item-card';
import type { CharacterCard } from '$lib/types/character';
import CardsList from './CardsList.svelte';

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
		it('keeps reload control and the action button after the overload toggle in the active controls row', () => {
			const { container } = render(CardsList, {
				props: {
					cards: [mockCards[0]],
					characterCards: [mockCharacterCards[0]],
					listMode: 'active',
					readonly: false,
				},
			});

			const reloadControl = container.querySelector('.reload-control');
			const activeControls = container.querySelector('.active-controls');
			const overloadToggle = activeControls?.querySelector('.overload-checkbox');
			const actionButton = container.querySelector('.btn-use-card, .btn-reload-card');
			expect(reloadControl).toBeInTheDocument();
			expect(reloadControl).toHaveClass('button-height-rhythm');
			// Current order inside .active-controls: overload toggle, reload control, action button.
			expect(activeControls?.firstElementChild).toBe(overloadToggle);
			expect(overloadToggle?.nextElementSibling).toBe(reloadControl);
			expect(reloadControl?.nextElementSibling).toBe(actionButton);
		});

		it('renders ReloadControl and the current use action for active reloadable cards', () => {
			const { container } = render(CardsList, {
				props: {
					cards: mockCards,
					characterCards: mockCharacterCards,
					listMode: 'active',
					readonly: false,
				},
			});
			// Both cards are active with uses remaining: each renders a
			// ReloadControl plus the ✨ Usar action.
			expect(container.querySelectorAll('.reload-control')).toHaveLength(2);
			expect(screen.getAllByRole('button', { name: '✨ Usar' })).toHaveLength(2);
		});

		it('renders overload toggle on same row as the use action for activable cards', () => {
			const { container } = render(CardsList, {
				props: {
					cards: [mockCards[0]],
					characterCards: [mockCharacterCards[0]],
					listMode: 'active',
					readonly: false,
				},
			});
			// Should have both ✨ Usar action and overload toggle
			const actionButton = screen.getByRole('button', { name: '✨ Usar' });
			const overloadToggle = screen.getByRole('checkbox');
			const boxedToggle = overloadToggle.closest('label');
			expect(actionButton).toBeInTheDocument();
			expect(overloadToggle).toBeInTheDocument();
			expect(boxedToggle).toHaveClass('overload-checkbox');
			expect(boxedToggle).toHaveClass('boxed-control');
			expect(boxedToggle).toHaveClass('button-height-rhythm');
			expect(boxedToggle).toContainElement(overloadToggle);
			expect(boxedToggle).toHaveAttribute('title', 'Sobrecargada');
			expect(boxedToggle).toHaveTextContent('⚡ Sob');
			// Reload and overload live in .active-controls; action buttons live in .controls
			expect(boxedToggle?.closest('.active-controls')).not.toBeNull();
			expect(container.querySelector('.active-controls > .spacer')).toBeNull();
			// Deactivation is intentionally absent from the active card list.
			expect(screen.queryByRole('button', { name: 'Desactivar' })).not.toBeInTheDocument();
		});

		it('does not offer the reload action for non-reloadable cards', () => {
			render(CardsList, {
				props: {
					cards: [mockCards[1]],
					characterCards: [mockCharacterCards[1]],
					listMode: 'active',
					readonly: false,
				},
			});
			// Non-reloadable cards show ✨ Usar and never the 🎲 Recargar action.
			expect(screen.queryByRole('button', { name: '🎲 Recargar' })).toBeNull();
			expect(screen.getByRole('button', { name: '✨ Usar' })).toBeInTheDocument();
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
			expect(container.querySelector('.card-actions > .spacer')).toBeNull();
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
			expect(container.querySelector('.card-actions > .spacer')).toBeNull();
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
			expect(container.querySelector('.card-actions > .spacer')).toBeNull();
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
			expect(container.querySelector('.card-actions > .spacer')).toBeNull();
		});
	});

	describe('card activation and deactivation', () => {
		it('offers Desactivar in collection mode for an active activable card and deactivates it', async () => {
			const onChange = vi.fn();
			render(CardsList, {
				props: {
					cards: [mockCards[0]],
					characterCards: [{ ...mockCharacterCards[0], isActive: true }],
					listMode: 'collection',
					readonly: false,
					onChange,
				},
			});

			const deactivateButton = screen.getByRole('button', { name: 'Desactivar' });
			expect(deactivateButton).toBeInTheDocument();
			// The emoji stays as visual decoration; the accessible name is clean.
			expect(deactivateButton).toHaveTextContent('🚫 Desactivar');
			await fireEvent.click(deactivateButton);

			expect(onChange).toHaveBeenCalledWith([
				expect.objectContaining({ id: 'card-1', isActive: false }),
			]);
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
					characterCards: [{ ...mockCharacterCards[0], uses: 0 }],
					listMode: 'active',
					readonly: false,
					onCardReloadClick,
				},
			});

			const reloadButton = screen.getByRole('button', { name: '🎲 Recargar' });
			expect(reloadButton).not.toBeDisabled();
			await fireEvent.click(reloadButton);
			expect(onCardReloadClick).toHaveBeenCalledWith('card-1');
		});

		it('disables reload button when card is overcharged', () => {
			const overchargedCards: CharacterCard[] = [
				{
					...mockCharacterCards[0],
					uses: 0,
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
			const reloadButton = screen.getByRole('button', { name: '🎲 Recargar' });
			expect(reloadButton).toBeDisabled();
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

			const reloadBtn = screen.getByRole('button', { name: '🎲 Recargar' });
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
					characterCards: [{ ...mockCharacterCards[0], uses: 0 }],
					listMode: 'active',
					readonly: false,
					onChange,
					onCardReloadClick,
				},
			});

			// Initially reload should be enabled
			expect(screen.getByRole('button', { name: '🎲 Recargar' })).not.toBeDisabled();

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
			const overchargedReloadButton = screen.getByRole('button', { name: '🎲 Recargar' });
			expect(overchargedReloadButton).toBeDisabled();

			// A real user click cannot reach a disabled button; use the native
			// click() because fireEvent dispatches a synthetic event that
			// bypasses the disabled semantics of the button.
			overchargedReloadButton.click();
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
			expect(screen.getByRole('button', { name: '🎲 Recargar' })).not.toBeDisabled();

			// Click reload - callback should fire again
			await fireEvent.click(screen.getByRole('button', { name: '🎲 Recargar' }));
			expect(onCardReloadClick).toHaveBeenCalledWith('card-1');
		});
	});

	describe('custom cards', () => {
		const mockCustomCard: AbilityCard = {
			id: 'custom-abc',
			name: 'Custom Fire Bolt',
			description: 'A custom bolt',
			cardType: 'ability',
			type: 'activable',
			level: 1,
			tags: ['arcanista'],
			img: '',
			uses: { type: 'USES', qty: 2 },
			requirements: null,
		};

		it('shows edit button for custom card in collection', () => {
			render(CardsList, {
				props: {
					cards: [mockCustomCard],
					characterCards: [
						{
							id: 'custom-abc',
							uses: null,
							isActive: false,
							level: 1,
							cardType: 'ability',
							isOvercharged: false,
						},
					],
					listMode: 'collection',
					readonly: false,
				},
			});

			expect(screen.getByRole('button', { name: 'Editar' })).toBeInTheDocument();
		});

		it('does not show edit button for non-custom card in collection', () => {
			render(CardsList, {
				props: {
					cards: [mockCards[0]],
					characterCards: [mockCharacterCards[0]],
					listMode: 'collection',
					readonly: false,
				},
			});

			expect(screen.queryByRole('button', { name: 'Editar' })).not.toBeInTheDocument();
		});

		it('does not show edit button for custom card in active mode', () => {
			render(CardsList, {
				props: {
					cards: [mockCustomCard],
					characterCards: [
						{
							id: 'custom-abc',
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

			expect(screen.queryByRole('button', { name: 'Editar' })).not.toBeInTheDocument();
		});

		it('calls onEditCard when edit button is clicked', async () => {
			const onEditCard = vi.fn();
			render(CardsList, {
				props: {
					cards: [mockCustomCard],
					characterCards: [
						{
							id: 'custom-abc',
							uses: null,
							isActive: false,
							level: 1,
							cardType: 'ability',
							isOvercharged: false,
						},
					],
					listMode: 'collection',
					readonly: false,
					onEditCard,
				},
			});

			const editButton = screen.getByRole('button', { name: 'Editar' });
			await fireEvent.click(editButton);

			expect(onEditCard).toHaveBeenCalledWith(mockCustomCard);
		});

		it('keeps emoji visuals while exposing clean accessible names for the collection actions', () => {
			render(CardsList, {
				props: {
					cards: [mockCustomCard],
					characterCards: [
						{
							id: 'custom-abc',
							uses: null,
							isActive: false,
							level: 1,
							cardType: 'ability',
							isOvercharged: false,
						},
					],
					listMode: 'collection',
					readonly: false,
					onManageAssociation: vi.fn(),
				},
			});

			const removeButton = screen.getByRole('button', { name: 'Quitar' });
			expect(removeButton).toHaveTextContent('🗑️ Quitar');

			const editButton = screen.getByRole('button', { name: 'Editar' });
			expect(editButton).toHaveTextContent('✏️ Editar');

			const activateButton = screen.getByRole('button', { name: 'Activar' });
			expect(activateButton).toHaveTextContent('✅ Activar');

			const linkButton = screen.getByRole('button', { name: 'Vincular Custom Fire Bolt' });
			expect(linkButton).toHaveTextContent('🔗 Vincular');
		});
	});

	describe('layout and spacing', () => {
		it('does not render spacers in collection mode for efecto card', () => {
			const { container } = render(CardsList, {
				props: {
					cards: [mockEfectoUsesCard],
					characterCards: [
						{
							id: 'efecto-uses-1',
							uses: 2,
							isActive: false,
							level: 1,
							cardType: 'ability',
							isOvercharged: false,
						},
					],
					listMode: 'collection',
					readonly: false,
				},
			});

			expect(container.querySelector('.card-actions > .spacer')).toBeNull();
			expect(screen.getByRole('button', { name: 'Quitar' })).toBeInTheDocument();
			expect(screen.queryByRole('button', { name: /Activar|Desactivar/ })).not.toBeInTheDocument();
		});

		it('distributes controls with space-around in collection mode for custom activable card', () => {
			const mockCustomActivable: AbilityCard = {
				id: 'custom-activable',
				name: 'Custom Activable',
				description: 'A custom activable card',
				cardType: 'ability',
				type: 'activable',
				level: 1,
				tags: ['arcanista'],
				img: '',
				uses: { type: 'USES', qty: 2 },
				requirements: null,
			};

			const { container } = render(CardsList, {
				props: {
					cards: [mockCustomActivable],
					characterCards: [
						{
							id: 'custom-activable',
							uses: 2,
							isActive: false,
							level: 1,
							cardType: 'ability',
							isOvercharged: false,
						},
					],
					listMode: 'collection',
					readonly: false,
				},
			});

			const controls = container.querySelector('.card-actions');
			expect(controls).toBeInTheDocument();
			expect(container.querySelector('.card-actions > .spacer')).toBeNull();
			expect(screen.getByRole('button', { name: 'Editar' })).toBeInTheDocument();
			expect(screen.getByRole('button', { name: 'Quitar' })).toBeInTheDocument();
			expect(screen.getByRole('button', { name: 'Activar' })).toBeInTheDocument();
		});

		describe('action button layout', () => {
			it('applies flex-start for 1 action button in collection (static efecto)', () => {
				const { container } = render(CardsList, {
					props: {
						cards: [mockEfectoUsesCard],
						characterCards: [
							{
								id: 'efecto-uses-1',
								uses: 2,
								isActive: false,
								level: 1,
								cardType: 'ability',
								isOvercharged: false,
							},
						],
						listMode: 'collection',
						readonly: false,
					},
				});

				const controls = container.querySelector('.card-actions');
				expect(controls).toHaveClass('one');
				expect(controls).not.toHaveClass('two');
				expect(controls).not.toHaveClass('three');
			});

			it('applies space-between for 2 action buttons in collection (custom efecto)', () => {
				const mockCustomEfecto: AbilityCard = {
					id: 'custom-efecto',
					name: 'Custom Passive',
					description: 'A custom passive',
					cardType: 'ability',
					type: 'efecto',
					level: 1,
					tags: ['arcanista'],
					img: '',
					uses: { type: 'USES', qty: 2 },
					requirements: null,
				};

				const { container } = render(CardsList, {
					props: {
						cards: [mockCustomEfecto],
						characterCards: [
							{
								id: 'custom-efecto',
								uses: null,
								isActive: false,
								level: 1,
								cardType: 'ability',
								isOvercharged: false,
							},
						],
						listMode: 'collection',
						readonly: false,
					},
				});

				const controls = container.querySelector('.card-actions');
				expect(controls).toHaveClass('two');
				expect(controls).not.toHaveClass('one');
				expect(controls).not.toHaveClass('three');
			});

			it('applies space-between for 2 action buttons in collection (static activable)', () => {
				const { container } = render(CardsList, {
					props: {
						cards: [mockCards[0]],
						characterCards: [
							{
								id: 'card-1',
								uses: 2,
								isActive: false,
								level: 1,
								cardType: 'ability',
								isOvercharged: false,
							},
						],
						listMode: 'collection',
						readonly: false,
					},
				});

				const controls = container.querySelector('.card-actions');
				expect(controls).toHaveClass('two');
				expect(controls).not.toHaveClass('one');
				expect(controls).not.toHaveClass('three');
			});

			it('applies space-around for 3 action buttons in collection (custom activable)', () => {
				const mockCustomActivable: AbilityCard = {
					id: 'custom-activable',
					name: 'Custom Activable',
					description: 'A custom activable card',
					cardType: 'ability',
					type: 'activable',
					level: 1,
					tags: ['arcanista'],
					img: '',
					uses: { type: 'USES', qty: 2 },
					requirements: null,
				};

				const { container } = render(CardsList, {
					props: {
						cards: [mockCustomActivable],
						characterCards: [
							{
								id: 'custom-activable',
								uses: 2,
								isActive: false,
								level: 1,
								cardType: 'ability',
								isOvercharged: false,
							},
						],
						listMode: 'collection',
						readonly: false,
					},
				});

				const controls = container.querySelector('.card-actions');
				expect(controls).toHaveClass('three');
				expect(controls).not.toHaveClass('one');
				expect(controls).not.toHaveClass('two');
			});

			it('renders the active card controls in the dedicated .active-controls container', () => {
				const { container } = render(CardsList, {
					props: {
						cards: [mockCards[0]],
						characterCards: [mockCharacterCards[0]],
						listMode: 'active',
						readonly: false,
					},
				});

				// Active mode renders one controls row (.active-controls); the
				// collection .card-actions fallback is not present in active mode.
				const controls = container.querySelector('.active-controls');
				expect(controls).toBeInTheDocument();
				expect(container.querySelector('.card-actions')).toBeNull();
				expect(controls?.querySelector('.btn-use-card')).toBeInTheDocument();
			});
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

	describe('inline roll context', () => {
		const formulaCards: AbilityCard[] = [
			{
				...mockCards[0],
				name: 'Fire Bolt',
				description: 'Inflige 2d6 de daño',
			},
			{
				...mockCards[1],
				name: 'Shield',
				description: 'Recupera 1d4 + Cuerpo',
			},
		];

		const explosiveFormulaCard: AbilityCard = {
			...mockCards[0],
			name: 'Descarga Sobrenatural',
			description:
				'Realizas un ataque de conjuro (1d8e + Presencia) a distancia Media. Si impactas, infliges 1d8 de daño.',
		};

		beforeEach(() => {
			rollContextMocks.rollExpression.mockClear();
		});

		it('FEAT-card-inline-dice @character-sheet — renders formula buttons when a roll context is provided', () => {
			render(CardsList, {
				props: {
					cards: [formulaCards[0]],
					readonly: true,
					rollContext: { variables: { Cuerpo: 3 }, title: 'Ayla' },
				},
			});

			expect(screen.getByRole('button', { name: '2d6 🎲' })).toBeInTheDocument();
			expect(document.body).toHaveTextContent('Inflige');
		});

		it('FEAT-card-inline-dice @character-sheet @title — prefixes each card name with the character source title when a context is provided', async () => {
			render(CardsList, {
				props: {
					cards: formulaCards,
					readonly: true,
					rollContext: { variables: { Cuerpo: 3 }, title: 'Ayla' },
				},
			});

			await fireEvent.click(screen.getByRole('button', { name: '2d6 🎲' }));
			expect(rollContextMocks.rollExpression).toHaveBeenCalledWith({
				expression: '2d6',
				variables: { Cuerpo: 3 },
				title: 'Ayla: Fire Bolt',
			});

			await fireEvent.click(screen.getByRole('button', { name: '1d4 + Cuerpo 🎲' }));
			expect(rollContextMocks.rollExpression).toHaveBeenCalledWith({
				expression: '1d4+Cuerpo',
				variables: { Cuerpo: 3 },
				title: 'Ayla: Shield',
			});
		});

		it('FEAT-card-inline-dice @title @fallback — falls back to the card name when the source title is blank', async () => {
			render(CardsList, {
				props: {
					cards: [formulaCards[0]],
					readonly: true,
					rollContext: { variables: { Cuerpo: 3 }, title: '   ' },
				},
			});

			await fireEvent.click(screen.getByRole('button', { name: '2d6 🎲' }));
			expect(rollContextMocks.rollExpression).toHaveBeenCalledWith({
				expression: '2d6',
				variables: { Cuerpo: 3 },
				title: 'Fire Bolt',
			});
		});

		it('FEAT-card-inline-dice @explosive @title — rolls the explosive attack with the Ataque con title and keeps the plain damage title', async () => {
			render(CardsList, {
				props: {
					cards: [explosiveFormulaCard],
					readonly: true,
					rollContext: { variables: { Presencia: 5 }, title: 'Ayla' },
				},
			});

			await fireEvent.click(screen.getByRole('button', { name: '1d8💥 + Presencia 🎲' }));
			expect(rollContextMocks.rollExpression).toHaveBeenCalledWith({
				expression: '1d8e+Presencia',
				variables: { Presencia: 5 },
				title: 'Ayla: Ataque con Descarga Sobrenatural',
			});

			await fireEvent.click(screen.getByRole('button', { name: '1d8 🎲' }));
			expect(rollContextMocks.rollExpression).toHaveBeenCalledWith({
				expression: '1d8',
				variables: { Presencia: 5 },
				title: 'Ayla: Descarga Sobrenatural',
			});
		});

		it('FEAT-card-inline-dice @title @fallback — falls back to Ataque con plus the card name for explosive formulas with a blank source', async () => {
			render(CardsList, {
				props: {
					cards: [explosiveFormulaCard],
					readonly: true,
					rollContext: { variables: { Presencia: 5 }, title: '   ' },
				},
			});

			await fireEvent.click(screen.getByRole('button', { name: '1d8💥 + Presencia 🎲' }));
			expect(rollContextMocks.rollExpression).toHaveBeenCalledWith({
				expression: '1d8e+Presencia',
				variables: { Presencia: 5 },
				title: 'Ataque con Descarga Sobrenatural',
			});
		});

		it('FEAT-card-inline-dice @library — keeps every card read-only when no roll context is provided', () => {
			render(CardsList, {
				props: {
					cards: formulaCards,
					readonly: true,
				},
			});

			expect(document.body).toHaveTextContent('Inflige 2d6 de daño');
			expect(document.body).toHaveTextContent('Recupera 1d4 + Cuerpo');
			expect(screen.queryByRole('button', { name: /🎲/ })).toBeNull();
		});
	});

	describe('card association link action', () => {
		it('renders the link action with the card name for every card type when wired', () => {
			const onManageAssociation = vi.fn();
			render(CardsList, {
				props: {
					cards: mockCards,
					characterCards: mockCharacterCards,
					listMode: 'collection',
					readonly: false,
					onManageAssociation,
				},
			});

			expect(screen.getByRole('button', { name: 'Vincular Fire Bolt' })).toBeInTheDocument();
			expect(screen.getByRole('button', { name: 'Vincular Shield' })).toBeInTheDocument();
		});

		it('labels the action as editing when the card already has a parent', () => {
			render(CardsList, {
				props: {
					cards: [mockCards[0]],
					characterCards: [{ ...mockCharacterCards[0], grantedBy: 'parent-1' }],
					listMode: 'collection',
					readonly: false,
					onManageAssociation: vi.fn(),
				},
			});

			const linkButton = screen.getByRole('button', { name: 'Editar vinculación Fire Bolt' });
			expect(linkButton).toBeInTheDocument();
			// The 🔗 emoji remains as visual decoration; the accessible name is clean.
			expect(linkButton).toHaveTextContent('🔗 Revincular');
			expect(screen.queryByRole('button', { name: /^Vincular / })).not.toBeInTheDocument();
		});

		it('does not render the link action when the callback is not wired', () => {
			render(CardsList, {
				props: {
					cards: [mockCards[0]],
					characterCards: [mockCharacterCards[0]],
					listMode: 'collection',
					readonly: false,
				},
			});

			expect(screen.queryByRole('button', { name: /Vincular/ })).not.toBeInTheDocument();
		});

		it('calls onManageAssociation with the card when the action is clicked', async () => {
			const onManageAssociation = vi.fn();
			render(CardsList, {
				props: {
					cards: [mockCards[0]],
					characterCards: [mockCharacterCards[0]],
					listMode: 'collection',
					readonly: false,
					onManageAssociation,
				},
			});

			await fireEvent.click(screen.getByRole('button', { name: 'Vincular Fire Bolt' }));

			expect(onManageAssociation).toHaveBeenCalledWith(mockCards[0]);
		});

		it('does not render the link action in active mode', () => {
			render(CardsList, {
				props: {
					cards: [mockCards[0]],
					characterCards: [mockCharacterCards[0]],
					listMode: 'active',
					readonly: false,
					onManageAssociation: vi.fn(),
				},
			});

			expect(screen.queryByRole('button', { name: /Vincular/ })).not.toBeInTheDocument();
		});
	});

	describe('card link tag presentation', () => {
		const disciplinaMonasticaCard: AbilityCard = {
			id: 'disciplina-monastica-card',
			name: 'Disciplina Monástica',
			description: 'Disciplina del monje',
			cardType: 'ability',
			type: 'activable',
			level: 1,
			tags: ['Monje'],
			img: '',
			uses: { type: 'USES', qty: 2 },
			requirements: null,
		};

		const artesMarcialesCard: AbilityCard = {
			id: 'artes-marciales-card',
			name: 'Artes Marciales',
			description: 'Artes marciales del monje',
			cardType: 'ability',
			type: 'activable',
			level: 1,
			tags: ['Monje'],
			img: '',
			uses: { type: 'USES', qty: 3 },
			requirements: 'Disciplina Monástica',
		};

		const sangreMagicaEffectCard: AbilityCard = {
			...artesMarcialesCard,
			id: 'sangre-magica-card',
			name: 'Sangre Mágica',
			type: 'efecto',
			requirements: null,
		};

		const herenciaSobrenaturalEffectCard: AbilityCard = {
			...artesMarcialesCard,
			id: 'herencia-sobrenatural-card',
			name: 'Herencia Sobrenatural',
			type: 'efecto',
			requirements: null,
		};

		const pocionConsumibleCard: ItemCard = {
			id: 'pocion-card',
			name: 'Poción de Curación',
			description: 'Bebes la poción',
			cardType: 'item',
			type: 'consumible',
			level: 1,
			tags: ['Consumible'],
			img: '',
			uses: { type: 'USES', qty: 1 },
			requirements: null,
			cost: '50',
		};

		const parentOwned = (overrides: Partial<CharacterCard> = {}): CharacterCard => ({
			id: 'disciplina-monastica-card',
			uses: 2,
			isActive: true,
			level: 1,
			cardType: 'ability',
			isOvercharged: false,
			...overrides,
		});

		const childOwned = (overrides: Partial<CharacterCard> = {}): CharacterCard => ({
			id: 'artes-marciales-card',
			uses: 3,
			isActive: true,
			level: 1,
			cardType: 'ability',
			isOvercharged: false,
			grantedBy: 'disciplina-monastica-card',
			...overrides,
		});

		const effectParentOwned = (overrides: Partial<CharacterCard> = {}): CharacterCard => ({
			id: 'herencia-sobrenatural-card',
			uses: 1,
			isActive: false,
			level: 1,
			cardType: 'ability',
			isOvercharged: false,
			...overrides,
		});

		it('shows the compact 🔗 tag with the parent name for linked activable cards', () => {
			render(CardsList, {
				props: {
					cards: [artesMarcialesCard],
					characterCards: [childOwned(), parentOwned()],
					allCards: [artesMarcialesCard, disciplinaMonasticaCard],
					listMode: 'collection',
					readonly: false,
				},
			});

			expect(screen.getByText('🔗 Disciplina Monástica')).toBeInTheDocument();
		});

		it('shows the Activación gratuita badge when the flagged linked activable card has an active parent', () => {
			render(CardsList, {
				props: {
					cards: [artesMarcialesCard],
					characterCards: [childOwned({ doesNotConsumeActiveSlot: true }), parentOwned()],
					allCards: [artesMarcialesCard, disciplinaMonasticaCard],
					listMode: 'collection',
					readonly: false,
				},
			});

			expect(screen.getByText('🔗 Disciplina Monástica')).toBeInTheDocument();
			expect(screen.getByText('Activación gratuita')).toBeInTheDocument();
		});

		it('does not show the Activación gratuita badge nor invent use controls for a flagged linked activable card with an inactive activable parent', () => {
			render(CardsList, {
				props: {
					cards: [artesMarcialesCard],
					characterCards: [
						childOwned({ doesNotConsumeActiveSlot: true }),
						parentOwned({ isActive: false }),
					],
					allCards: [artesMarcialesCard, disciplinaMonasticaCard],
					listMode: 'collection',
					readonly: false,
				},
			});

			expect(screen.getByText('🔗 Disciplina Monástica')).toBeInTheDocument();
			expect(screen.getByText('Origen inactivo')).toBeInTheDocument();
			expect(screen.queryByText('Activación gratuita')).not.toBeInTheDocument();
		});

		it('shows the link tag for linked effect cards without inventing the Activación gratuita badge or Origen inactivo', () => {
			render(CardsList, {
				props: {
					cards: [sangreMagicaEffectCard],
					characterCards: [
						{
							...childOwned(),
							id: 'sangre-magica-card',
							cardType: 'ability',
						},
						parentOwned(),
					],
					allCards: [sangreMagicaEffectCard, disciplinaMonasticaCard],
					listMode: 'collection',
					readonly: false,
				},
			});

			expect(screen.getByText('🔗 Disciplina Monástica')).toBeInTheDocument();
			expect(screen.queryByText('Activación gratuita')).not.toBeInTheDocument();
			expect(screen.queryByText('Origen inactivo')).not.toBeInTheDocument();
		});

		it('does not show Origen inactivo for a linked effect card whose parent is an effect', () => {
			render(CardsList, {
				props: {
					cards: [sangreMagicaEffectCard],
					characterCards: [
						{
							...childOwned(),
							id: 'sangre-magica-card',
							grantedBy: 'herencia-sobrenatural-card',
							cardType: 'ability',
						},
						effectParentOwned(),
					],
					allCards: [sangreMagicaEffectCard, herenciaSobrenaturalEffectCard],
					listMode: 'collection',
					readonly: false,
				},
			});

			expect(screen.getByText('🔗 Herencia Sobrenatural')).toBeInTheDocument();
			expect(screen.queryByText('Origen inactivo')).not.toBeInTheDocument();
			expect(screen.queryByText('Activación gratuita')).not.toBeInTheDocument();
		});

		it('shows the Activación gratuita badge for a flagged activable child granted by an effect parent even when the parent is inactive', () => {
			render(CardsList, {
				props: {
					cards: [artesMarcialesCard],
					characterCards: [
						{
							...childOwned(),
							grantedBy: 'herencia-sobrenatural-card',
							doesNotConsumeActiveSlot: true,
						},
						effectParentOwned(),
					],
					allCards: [artesMarcialesCard, herenciaSobrenaturalEffectCard],
					listMode: 'collection',
					readonly: false,
				},
			});

			expect(screen.getByText('🔗 Herencia Sobrenatural')).toBeInTheDocument();
			expect(screen.getByText('Activación gratuita')).toBeInTheDocument();
			expect(screen.queryByText('Origen inactivo')).not.toBeInTheDocument();
		});

		it('shows the link tag for linked consumable cards without inventing the Activación gratuita badge', () => {
			render(CardsList, {
				props: {
					cards: [pocionConsumibleCard],
					characterCards: [
						{
							id: 'pocion-card',
							uses: 1,
							isActive: true,
							level: 1,
							cardType: 'item',
							isOvercharged: false,
							grantedBy: 'disciplina-monastica-card',
						},
						parentOwned(),
					],
					allCards: [pocionConsumibleCard, disciplinaMonasticaCard],
					listMode: 'collection',
					readonly: false,
				},
			});

			expect(screen.getByText('🔗 Disciplina Monástica')).toBeInTheDocument();
			expect(screen.queryByText('Activación gratuita')).not.toBeInTheDocument();
		});

		it('marks an orphan link as pending instead of pretending the exemption is in force', () => {
			render(CardsList, {
				props: {
					cards: [artesMarcialesCard],
					characterCards: [childOwned({ grantedBy: 'missing-parent-id' })],
					allCards: [artesMarcialesCard, disciplinaMonasticaCard],
					listMode: 'collection',
					readonly: false,
				},
			});

			expect(screen.getByText(/Vinculación pendiente/)).toBeInTheDocument();
			expect(screen.queryByText('Activación gratuita')).not.toBeInTheDocument();
		});

		it('does not render link chips for cards without an association', () => {
			render(CardsList, {
				props: {
					cards: [artesMarcialesCard],
					characterCards: [childOwned({ grantedBy: null })],
					allCards: [artesMarcialesCard, disciplinaMonasticaCard],
					listMode: 'collection',
					readonly: false,
				},
			});

			expect(screen.queryByText(/🔗/)).not.toBeInTheDocument();
			expect(screen.queryByText('Activación gratuita')).not.toBeInTheDocument();
		});

		it('exposes an accessible name with the slot exemption for effective links', () => {
			render(CardsList, {
				props: {
					cards: [artesMarcialesCard],
					characterCards: [childOwned({ doesNotConsumeActiveSlot: true }), parentOwned()],
					allCards: [artesMarcialesCard, disciplinaMonasticaCard],
					listMode: 'collection',
					readonly: false,
				},
			});

			expect(
				screen.getByLabelText(
					/Carta vinculada a Disciplina Monástica\. No consume una Ranura de Carta Activa/,
				),
			).toBeInTheDocument();
		});
	});
});
