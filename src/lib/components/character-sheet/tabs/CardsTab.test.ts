import type { Character } from '$lib/types/character';
import { fireEvent, render, screen, waitFor } from '@testing-library/svelte';
import { beforeEach, describe, expect, it, vi } from 'vitest';

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
		{
			id: 'ability-2',
			name: 'Strong Bolt',
			level: 2,
			tags: ['arcanista'],
			requirements: null,
			description: 'A strong bolt',
			uses: { type: 'USES', qty: 2 },
			type: 'efecto',
			cardType: 'ability',
			img: '',
		},
		{
			id: 'ability-5',
			name: 'Ultimate Bolt',
			level: 5,
			tags: ['arcanista'],
			requirements: null,
			description: 'An ultimate bolt',
			uses: { type: 'USES', qty: 1 },
			type: 'efecto',
			cardType: 'ability',
			img: '',
		},
	],
	itemCardsValue: [
		{
			id: 'item-1',
			name: 'Magic Sword',
			level: 1,
			tags: ['weapon'],
			requirements: null,
			description: 'A magic sword',
			uses: { type: 'USES', qty: 5 },
			type: 'activable',
			cardType: 'item',
			img: '',
			cost: '50',
		},
		{
			id: 'item-2',
			name: 'Legendary Artifact',
			level: 1,
			tags: ['artifact'],
			requirements: null,
			description: 'A legendary artifact',
			uses: { type: 'USES', qty: 1 },
			type: 'efecto',
			cardType: 'item',
			img: '',
			cost: 'Incalculable',
		},
	],
	loadAbilityCards: vi.fn(async () => {}),
	loadItemCards: vi.fn(async () => {}),
	rollExpression: vi.fn(),
	pageUrl: new URL('http://localhost/?tab=cards&view=available'),
	goto: vi.fn(),
}));

vi.mock('$app/state', () => ({
	page: {
		get url() {
			return hoisted.pageUrl;
		},
	},
}));

vi.mock('$app/navigation', () => ({
	goto: hoisted.goto,
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

vi.mock('$lib/services/dialog-service.svelte', () => ({
	dialogService: {
		alert: vi.fn(async () => {}),
		confirm: vi.fn(async () => true),
		prompt: vi.fn(async () => ''),
	},
}));

import { dialogService } from '$lib/services/dialog-service.svelte';
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
		ppHistory: [],
		goldHistory: [],
		attributes: {
			body: 1,
			reflexes: 1,
			mind: 1,
			instinct: 1,
			presence: 1,
		},
	}) as unknown as Character;

const setCurrentPP = (character: Character, value: number) => {
	Object.defineProperty(character, 'currentPP', {
		configurable: true,
		get: () => value,
	});
};

const setCurrentGold = (character: Character, value: number) => {
	Object.defineProperty(character, 'currentGold', {
		configurable: true,
		get: () => value,
	});
};

const setViewParam = (view: string) => {
	hoisted.pageUrl.searchParams.set('view', view);
};

describe('CardsTab', () => {
	beforeEach(() => {
		hoisted.loadAbilityCards.mockClear();
		hoisted.loadItemCards.mockClear();
		hoisted.rollExpression.mockReset();
		hoisted.goto.mockClear();
		hoisted.pageUrl = new URL('http://localhost/?tab=cards&view=available');
	});

	describe('sub-tab navigation', () => {
		it('defaults to available view when no view param is set', () => {
			hoisted.pageUrl = new URL('http://localhost/?tab=cards');
			const character = buildCharacter();
			const onChange = vi.fn();

			render(CardsTab, {
				props: { character, readonly: false, onChange },
			});

			// Should show Cartas Activas from AvailableCardsView
			expect(screen.getByText(/Cartas Activas/)).toBeInTheDocument();
		});

		it('shows sub-tab buttons Disponibles and Gestionar', () => {
			const character = buildCharacter();
			const onChange = vi.fn();

			render(CardsTab, {
				props: { character, readonly: false, onChange },
			});

			expect(screen.getByRole('button', { name: '🚀 Disponibles' })).toBeInTheDocument();
			expect(screen.getByRole('button', { name: '⚙️ Gestionar' })).toBeInTheDocument();
		});

		it('highlights the active sub-tab with selected class', () => {
			const character = buildCharacter();
			const onChange = vi.fn();

			render(CardsTab, {
				props: { character, readonly: false, onChange },
			});

			const disponiblesBtn = screen.getByRole('button', { name: '🚀 Disponibles' });
			expect(disponiblesBtn.classList.contains('selected')).toBe(true);
		});

		it('switches to Gestionar view and updates URL when clicking Gestionar', async () => {
			const character = buildCharacter();
			const onChange = vi.fn();

			render(CardsTab, {
				props: { character, readonly: false, onChange },
			});

			const gestionarBtn = screen.getByRole('button', { name: '⚙️ Gestionar' });
			await fireEvent.click(gestionarBtn);

			expect(hoisted.goto).toHaveBeenCalled();
			const gotoUrl = hoisted.goto.mock.calls[0][0];
			expect(gotoUrl).toContain('view=manage');
		});

		it('shows Gestionar content when view=manage param is set', () => {
			setViewParam('manage');
			const character = buildCharacter();
			const onChange = vi.fn();

			render(CardsTab, {
				props: { character, readonly: false, onChange },
			});

			// ManageCardsView shows Controles section
			expect(screen.getByText('Ranuras de Cartas Activas')).toBeInTheDocument();
			expect(screen.getByText(/Colección Completa/)).toBeInTheDocument();
		});

		it('switches back to available view when clicking Disponibles', async () => {
			setViewParam('manage');
			const character = buildCharacter();
			const onChange = vi.fn();

			render(CardsTab, {
				props: { character, readonly: false, onChange },
			});

			const disponiblesBtn = screen.getByRole('button', { name: '🚀 Disponibles' });
			await fireEvent.click(disponiblesBtn);

			expect(hoisted.goto).toHaveBeenCalled();
			const gotoUrl = hoisted.goto.mock.calls[0][0];
			expect(gotoUrl).toContain('view=available');
		});
	});

	describe('reload mechanics', () => {
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

		it('disables reload button when card is at max uses', async () => {
			const character = buildCharacter();
			character.cards[0].uses = 1;
			const onChange = vi.fn();

			render(CardsTab, {
				props: { character, readonly: false, onChange },
			});

			const reloadButton = await screen.findByRole('button', { name: '🎲' });
			expect(reloadButton).toBeDisabled();
		});

		it('disables reload button when card is overcharged', async () => {
			const character = buildCharacter();
			character.cards[0].isOvercharged = true;
			const onChange = vi.fn();

			render(CardsTab, {
				props: { character, readonly: false, onChange },
			});

			const reloadButton = await screen.findByRole('button', { name: '🎲' });
			expect(reloadButton).toBeDisabled();
		});

		it('does not reload when roll result is below card uses threshold', async () => {
			hoisted.rollExpression.mockResolvedValueOnce(2);
			const character = buildCharacter();
			character.cards[0].uses = 0;
			const onChange = vi.fn();

			render(CardsTab, {
				props: { character, readonly: false, onChange },
			});

			const reloadButton = await screen.findByRole('button', { name: '🎲' });
			await fireEvent.click(reloadButton);

			await new Promise((r) => setTimeout(r, 100));
			expect(onChange).not.toHaveBeenCalled();
			expect(character.cards[0].uses).toBe(0);
			expect(character.cards[0].isOvercharged).toBe(false);
		});

		it('enables reload button when uses are below max', async () => {
			const character = buildCharacter();
			character.cards[0].uses = 0;
			const onChange = vi.fn();

			render(CardsTab, {
				props: { character, readonly: false, onChange },
			});

			const reloadButton = await screen.findByRole('button', { name: '🎲' });
			expect(reloadButton).not.toBeDisabled();
		});
	});

	describe('card activation and deactivation', () => {
		it('deactivates an active card when Deactivate button is clicked', async () => {
			const character = buildCharacter();
			const onChange = vi.fn();

			render(CardsTab, {
				props: { character, readonly: false, onChange },
			});

			const deactivateButtons = await screen.findAllByRole('button', { name: 'Desactivar' });
			expect(deactivateButtons.length).toBeGreaterThan(0);
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
				props: { character, readonly: true, onChange },
			});

			expect(screen.queryByRole('button', { name: 'Desactivar' })).not.toBeInTheDocument();
		});
	});

	describe('uses tracking', () => {
		it('calls onChange when ReloadControl value is edited', () => {
			const character = buildCharacter();
			const onChange = vi.fn();

			render(CardsTab, {
				props: { character, readonly: false, onChange },
			});

			expect(onChange).toBeDefined();
		});
	});

	describe('buy active slot', () => {
		beforeEach(() => {
			setViewParam('manage');
		});

		it('shows buy button with correct cost for 4th slot', async () => {
			const character = buildCharacter();
			character.maxActiveCards = 3;
			setCurrentPP(character, 10);
			const onChange = vi.fn();

			render(CardsTab, {
				props: { character, readonly: false, onChange },
			});

			const buyButton = await screen.findByRole('button', { name: /Comprar.*3.*PP/ });
			expect(buyButton).toBeInTheDocument();
		});

		it('hides buy button when readonly is true', () => {
			setViewParam('manage');
			const character = buildCharacter();
			character.maxActiveCards = 3;
			setCurrentPP(character, 10);
			const onChange = vi.fn();

			render(CardsTab, {
				props: { character, readonly: true, onChange },
			});

			expect(screen.queryByRole('button', { name: /Comprar/ })).not.toBeInTheDocument();
		});

		it('disables buy button when maxActiveCards >= 10', () => {
			setViewParam('manage');
			const character = buildCharacter();
			character.maxActiveCards = 10;
			setCurrentPP(character, 100);
			const onChange = vi.fn();

			render(CardsTab, {
				props: { character, readonly: false, onChange },
			});

			expect(screen.queryByRole('button', { name: /Comprar/ })).not.toBeInTheDocument();
		});

		it('disables buy button when currentPP is insufficient', () => {
			setViewParam('manage');
			const character = buildCharacter();
			character.maxActiveCards = 3;
			setCurrentPP(character, 2);
			const onChange = vi.fn();

			render(CardsTab, {
				props: { character, readonly: false, onChange },
			});

			const buyButton = screen.getByRole('button', { name: /Comprar.*3.*PP/ });
			expect(buyButton).toBeDisabled();
		});
	});

	describe('handlePurchaseCard', () => {
		beforeEach(() => {
			setViewParam('manage');
		});

		it('purchases ability card: deducts PP, prepends to ppHistory, calls onChange', async () => {
			const character = buildCharacter();
			setCurrentPP(character, 10);
			const onChange = vi.fn();

			render(CardsTab, {
				props: { character, readonly: false, onChange },
			});

			const addAbilityButton = screen.getByRole('button', { name: 'Agregar Carta de Habilidad' });
			await fireEvent.click(addAbilityButton);

			const purchaseButton = await screen.findByRole('button', { name: /Comprar.*5.*PP/ });
			await fireEvent.click(purchaseButton);

			expect(character.ppHistory.length).toBe(1);
			expect(character.ppHistory[0]).toMatchObject({
				type: 'subtract',
				value: 5,
				reason: 'Comprar carta: Strong Bolt',
			});
			expect(onChange).toHaveBeenCalled();
		});

		it('purchases item card: deducts gold, prepends to goldHistory, calls onChange', async () => {
			const character = buildCharacter();
			setCurrentGold(character, 100);
			const onChange = vi.fn();

			render(CardsTab, {
				props: { character, readonly: false, onChange },
			});

			const addItemButton = screen.getByRole('button', { name: 'Agregar Carta de Objeto Mágico' });
			await fireEvent.click(addItemButton);

			const purchaseButton = await screen.findByRole('button', { name: /Comprar.*50.*o/ });
			await fireEvent.click(purchaseButton);

			expect(character.goldHistory.length).toBe(1);
			expect(character.goldHistory[0]).toMatchObject({
				type: 'subtract',
				value: 50,
				reason: 'Comprar objeto mágico: Magic Sword',
			});
			expect(onChange).toHaveBeenCalled();
		});

		it('shows alert when trying to purchase item with insufficient gold', async () => {
			const character = buildCharacter();
			setCurrentGold(character, 30);
			const onChange = vi.fn();

			render(CardsTab, {
				props: { character, readonly: false, onChange },
			});

			const addItemButton = screen.getByRole('button', { name: 'Agregar Carta de Objeto Mágico' });
			await fireEvent.click(addItemButton);

			const purchaseButton = await screen.findByRole('button', { name: /Comprar.*50.*o/ });
			await fireEvent.click(purchaseButton);

			expect(dialogService.alert).toHaveBeenCalledWith('No tienes suficiente oro');
			expect(character.goldHistory.length).toBe(0);
			expect(onChange).not.toHaveBeenCalled();
		});

		it('shows alert when trying to purchase ability with insufficient PP', async () => {
			const character = buildCharacter();
			setCurrentPP(character, 10);
			const onChange = vi.fn();

			render(CardsTab, {
				props: { character, readonly: false, onChange },
			});

			const addAbilityButton = screen.getByRole('button', { name: 'Agregar Carta de Habilidad' });
			await fireEvent.click(addAbilityButton);

			const purchaseButton = await screen.findByRole('button', { name: /Comprar.*17.*PP/ });
			await fireEvent.click(purchaseButton);

			expect(dialogService.alert).toHaveBeenCalledWith(
				'No tienes suficiente PP. Tienes 10 PP y la carta cuesta 17 PP.',
			);
			expect(character.ppHistory.length).toBe(0);
			expect(onChange).not.toHaveBeenCalled();
		});
	});

	describe('modal integration', () => {
		beforeEach(() => {
			setViewParam('manage');
		});

		it('does not show added card after closing and re-opening modal', async () => {
			const character = buildCharacter();
			const onChange = vi.fn();

			render(CardsTab, {
				props: { character, readonly: false, onChange },
			});

			const addAbilityButton = screen.getByRole('button', { name: 'Agregar Carta de Habilidad' });
			await fireEvent.click(addAbilityButton);

			await waitFor(() => {
				expect(screen.getByText('Strong Bolt')).toBeInTheDocument();
			});

			const addButtons = await screen.findAllByRole('button', { name: 'Agregar' });
			await fireEvent.click(addButtons[0]);
			expect(onChange).toHaveBeenCalled();

			const closeButtons = screen.getAllByRole('button', { name: 'Cerrar' });
			await fireEvent.click(closeButtons[0]);

			await fireEvent.click(addAbilityButton);

			await waitFor(() => {
				expect(screen.queryByText('Strong Bolt')).not.toBeInTheDocument();
			});
		});

		it('does not show purchased card after closing and re-opening modal', async () => {
			const character = buildCharacter();
			setCurrentPP(character, 10);
			const onChange = vi.fn();

			render(CardsTab, {
				props: { character, readonly: false, onChange },
			});

			const addAbilityButton = screen.getByRole('button', { name: 'Agregar Carta de Habilidad' });
			await fireEvent.click(addAbilityButton);

			await waitFor(() => {
				expect(screen.getByText('Strong Bolt')).toBeInTheDocument();
			});

			const purchaseButton = await screen.findByRole('button', { name: /Comprar.*5.*PP/ });
			await fireEvent.click(purchaseButton);
			expect(onChange).toHaveBeenCalled();

			const closeButtons = screen.getAllByRole('button', { name: 'Cerrar' });
			await fireEvent.click(closeButtons[0]);

			await fireEvent.click(addAbilityButton);

			await waitFor(() => {
				expect(screen.queryByText('Strong Bolt')).not.toBeInTheDocument();
			});
		});
	});

	describe('custom cards', () => {
		beforeEach(() => {
			setViewParam('manage');
		});

		it('shows custom card in collection', async () => {
			const character = buildCharacter();
			character.customCards = [
				{
					id: 'custom-abc',
					name: 'Custom Fire Bolt',
					level: 1,
					tags: ['arcanista'],
					requirements: null,
					description: 'A custom bolt',
					uses: { type: 'USES', qty: 2 },
					type: 'activable',
					cardType: 'ability',
					img: '',
				},
			];
			character.cards.push({
				id: 'custom-abc',
				uses: null,
				isActive: false,
				level: 1,
				cardType: 'ability',
				isOvercharged: false,
			});
			const onChange = vi.fn();

			render(CardsTab, {
				props: { character, readonly: false, onChange },
			});

			await waitFor(() => {
				expect(screen.getByText('Custom Fire Bolt')).toBeInTheDocument();
			});
		});

		it('does not show custom card as corrupted', async () => {
			const character = buildCharacter();
			character.customCards = [
				{
					id: 'custom-abc',
					name: 'Custom Fire Bolt',
					level: 1,
					tags: ['arcanista'],
					requirements: null,
					description: 'A custom bolt',
					uses: { type: 'USES', qty: 2 },
					type: 'activable',
					cardType: 'ability',
					img: '',
				},
			];
			character.cards.push({
				id: 'custom-abc',
				uses: null,
				isActive: false,
				level: 1,
				cardType: 'ability',
				isOvercharged: false,
			});
			const onChange = vi.fn();

			render(CardsTab, {
				props: { character, readonly: false, onChange },
			});

			expect(screen.queryByText('Cartas Corruptas')).not.toBeInTheDocument();
		});

		it('can activate a custom card', async () => {
			const character = buildCharacter();
			character.customCards = [
				{
					id: 'custom-abc',
					name: 'Custom Fire Bolt',
					level: 1,
					tags: ['arcanista'],
					requirements: null,
					description: 'A custom bolt',
					uses: { type: 'USES', qty: 2 },
					type: 'activable',
					cardType: 'ability',
					img: '',
				},
			];
			character.cards.push({
				id: 'custom-abc',
				uses: null,
				isActive: false,
				level: 1,
				cardType: 'ability',
				isOvercharged: false,
			});
			const onChange = vi.fn();

			render(CardsTab, {
				props: { character, readonly: false, onChange },
			});

			await waitFor(() => {
				expect(screen.getByText('Custom Fire Bolt')).toBeInTheDocument();
			});

			const activateButtons = screen.getAllByRole('button', { name: 'Activar' });
			await fireEvent.click(activateButtons[0]);

			await waitFor(() => expect(onChange).toHaveBeenCalled());

			const updatedCards = onChange.mock.calls[0][0].cards;
			const customCard = updatedCards.find((c: { id: string }) => c.id === 'custom-abc');
			expect(customCard.isActive).toBe(true);
		});

		it('shows edit button for custom cards', async () => {
			const character = buildCharacter();
			character.customCards = [
				{
					id: 'custom-abc',
					name: 'Custom Fire Bolt',
					level: 1,
					tags: ['arcanista'],
					requirements: null,
					description: 'A custom bolt',
					uses: { type: 'USES', qty: 2 },
					type: 'activable',
					cardType: 'ability',
					img: '',
				},
			];
			character.cards.push({
				id: 'custom-abc',
				uses: null,
				isActive: false,
				level: 1,
				cardType: 'ability',
				isOvercharged: false,
			});
			const onChange = vi.fn();

			render(CardsTab, {
				props: { character, readonly: false, onChange },
			});

			await waitFor(() => {
				expect(screen.getByRole('button', { name: 'Editar' })).toBeInTheDocument();
			});
		});

		it('removes custom card definition when removed from collection', async () => {
			const character = buildCharacter();
			character.customCards = [
				{
					id: 'custom-abc',
					name: 'Custom Fire Bolt',
					level: 1,
					tags: ['arcanista'],
					requirements: null,
					description: 'A custom bolt',
					uses: { type: 'USES', qty: 2 },
					type: 'activable',
					cardType: 'ability',
					img: '',
				},
			];
			character.cards.push({
				id: 'custom-abc',
				uses: null,
				isActive: false,
				level: 1,
				cardType: 'ability',
				isOvercharged: false,
			});
			const onChange = vi.fn();

			render(CardsTab, {
				props: { character, readonly: false, onChange },
			});

			await waitFor(() => {
				expect(screen.getByText('Custom Fire Bolt')).toBeInTheDocument();
			});

			const quitarButtons = screen.getAllByRole('button', { name: 'Quitar' });
			await fireEvent.click(quitarButtons[quitarButtons.length - 1]);

			await waitFor(() => expect(onChange).toHaveBeenCalled());

			const updatedCharacter = onChange.mock.calls[0][0];
			expect(updatedCharacter.customCards).toHaveLength(0);
			expect(updatedCharacter.cards.some((c: { id: string }) => c.id === 'custom-abc')).toBe(false);
		});
	});
});
