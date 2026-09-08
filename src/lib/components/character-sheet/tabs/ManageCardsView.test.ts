import type { Card } from '$lib/types/cards/card';
import type { Character, CharacterCard } from '$lib/types/character';
import { fireEvent, render, screen, within } from '@testing-library/svelte';
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

	describe('inline roll context', () => {
		it('FEAT-card-inline-dice @character-sheet — forwards the roll context to the Colección Completa CardsList', () => {
			const character = buildCharacter();
			const cards: Card[] = [
				{ ...buildCard('card-1', 'Fire Bolt'), description: 'Inflige 1d6 + Cuerpo' },
			];
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
					rollContext: { variables: { Cuerpo: 3 }, title: 'Hoja de cartas' },
				},
			});

			expect(screen.getByRole('button', { name: '1d6 + Cuerpo 🎲' })).toBeInTheDocument();
		});

		it('FEAT-card-inline-dice @library — keeps collection cards read-only prose when no roll context is provided', () => {
			const character = buildCharacter();
			const cards: Card[] = [
				{ ...buildCard('card-1', 'Fire Bolt'), description: 'Inflige 1d6 + Cuerpo' },
			];
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

			expect(document.body).toHaveTextContent('Inflige 1d6 + Cuerpo');
			expect(screen.queryByRole('button', { name: /🎲/ })).toBeNull();
		});
	});

	describe('card association from Gestionar', () => {
		const renderManageView = (cards: Card[], characterCards: CharacterCard[], readonly: boolean) =>
			render(ManageCardsView, {
				props: {
					cards,
					characterCards,
					readonly,
					character: buildCharacter(),
					onChange,
					onEditCard,
					onCorruptedCardsChange,
					onAddAbilityClick,
					onAddItemClick,
					onBuyActiveSlot,
				},
			});

		const parentCard: Card = {
			...buildCard('parent-1', 'Disciplina Monástica'),
			type: 'activable',
		};
		const childCard: Card = {
			...buildCard('child-1', 'Artes Marciales'),
			requirements: 'Disciplina Monástica',
		};
		const effectCard: Card = buildCard('effect-1', 'Sangre Mágica', 'efecto');

		it('opens the link modal for any card type and offers owned parent options', async () => {
			renderManageView(
				[parentCard, childCard, effectCard],
				[
					buildCharacterCard('parent-1', { isActive: true }),
					buildCharacterCard('child-1'),
					buildCharacterCard('effect-1'),
				],
				false,
			);

			await fireEvent.click(screen.getByRole('button', { name: 'Vincular Artes Marciales' }));

			const dialog = screen.getByRole('dialog');
			expect(within(dialog).getByText('Vincular carta')).toBeInTheDocument();
			expect(within(dialog).getByText('Artes Marciales')).toBeInTheDocument();

			const select = within(dialog).getByLabelText('Vinculada a') as HTMLSelectElement;
			const optionTexts = Array.from(select.options).map((option) => option.textContent ?? '');
			expect(optionTexts.some((text) => text.includes('Disciplina Monástica'))).toBe(true);
			expect(optionTexts.some((text) => text.includes('[Requerimiento cumplido]'))).toBe(true);
		});

		it('preselects the only candidate that fulfills the requirement and saves through onChange', async () => {
			renderManageView(
				[parentCard, childCard],
				[buildCharacterCard('parent-1', { isActive: true }), buildCharacterCard('child-1')],
				false,
			);

			await fireEvent.click(screen.getByRole('button', { name: 'Vincular Artes Marciales' }));

			const dialog = screen.getByRole('dialog');
			const select = within(dialog).getByLabelText('Vinculada a') as HTMLSelectElement;
			expect(select.value).toBe('parent-1');

			await fireEvent.click(within(dialog).getByRole('button', { name: 'Guardar' }));

			expect(onChange).toHaveBeenCalledWith([
				expect.objectContaining({ id: 'parent-1' }),
				expect.objectContaining({ id: 'child-1', grantedBy: 'parent-1' }),
			]);
			expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
		});

		it('closes the modal on cancel without reporting changes', async () => {
			renderManageView(
				[parentCard, childCard],
				[buildCharacterCard('parent-1', { isActive: true }), buildCharacterCard('child-1')],
				false,
			);

			await fireEvent.click(screen.getByRole('button', { name: 'Vincular Artes Marciales' }));

			const dialog = screen.getByRole('dialog');
			await fireEvent.click(within(dialog).getByRole('button', { name: 'Cancelar' }));

			expect(onChange).not.toHaveBeenCalled();
			expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
		});

		it('edits the existing link and can remove it through Sin vinculación', async () => {
			renderManageView(
				[parentCard, childCard],
				[
					buildCharacterCard('parent-1', { isActive: true }),
					buildCharacterCard('child-1', { grantedBy: 'parent-1' }),
				],
				false,
			);

			await fireEvent.click(
				screen.getByRole('button', { name: 'Editar vinculación Artes Marciales' }),
			);

			const dialog = screen.getByRole('dialog');
			const select = within(dialog).getByLabelText('Vinculada a') as HTMLSelectElement;
			expect(select.value).toBe('parent-1');

			await fireEvent.change(select, { target: { value: '' } });
			expect(select.value).toBe('');
			await fireEvent.click(within(dialog).getByRole('button', { name: 'Guardar' }));

			expect(onChange).toHaveBeenCalledWith([
				expect.objectContaining({ id: 'parent-1' }),
				expect.objectContaining({ id: 'child-1', grantedBy: null }),
			]);
		});

		it('does not mutate the current character cards when saving the link', async () => {
			const childRow = buildCharacterCard('child-1');
			const parentRow = buildCharacterCard('parent-1', { isActive: true });

			renderManageView([parentCard, childCard], [parentRow, childRow], false);

			await fireEvent.click(screen.getByRole('button', { name: 'Vincular Artes Marciales' }));
			await fireEvent.click(
				within(screen.getByRole('dialog')).getByRole('button', { name: 'Guardar' }),
			);

			expect(childRow.grantedBy).toBeUndefined();
			expect(parentRow.grantedBy).toBeUndefined();
		});

		it('unlinks idempotently when saving without a parent and closes without error', async () => {
			renderManageView([childCard], [buildCharacterCard('child-1')], false);

			await fireEvent.click(screen.getByRole('button', { name: 'Vincular Artes Marciales' }));

			const dialog = screen.getByRole('dialog');
			await fireEvent.click(within(dialog).getByRole('button', { name: 'Guardar' }));

			expect(within(dialog).queryByRole('alert')).not.toBeInTheDocument();
			expect(onChange).toHaveBeenCalledWith([
				expect.objectContaining({ id: 'child-1', grantedBy: null }),
			]);
			expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
		});

		it('persists the no-slot choice when saving a new link with the option checked', async () => {
			renderManageView(
				[parentCard, childCard],
				[buildCharacterCard('parent-1', { isActive: true }), buildCharacterCard('child-1')],
				false,
			);

			await fireEvent.click(screen.getByRole('button', { name: 'Vincular Artes Marciales' }));

			const dialog = screen.getByRole('dialog');
			await fireEvent.click(within(dialog).getByLabelText('No consume una Ranura de Carta Activa'));
			await fireEvent.click(within(dialog).getByRole('button', { name: 'Guardar' }));

			expect(onChange).toHaveBeenCalledWith([
				expect.objectContaining({ id: 'parent-1' }),
				expect.objectContaining({
					id: 'child-1',
					grantedBy: 'parent-1',
					doesNotConsumeActiveSlot: true,
				}),
			]);
		});

		it('persists an explicit false when the no-slot option is left unchecked', async () => {
			renderManageView(
				[parentCard, childCard],
				[buildCharacterCard('parent-1', { isActive: true }), buildCharacterCard('child-1')],
				false,
			);

			await fireEvent.click(screen.getByRole('button', { name: 'Vincular Artes Marciales' }));
			await fireEvent.click(
				within(screen.getByRole('dialog')).getByRole('button', { name: 'Guardar' }),
			);

			expect(onChange).toHaveBeenCalledWith([
				expect.objectContaining({ id: 'parent-1' }),
				expect.objectContaining({
					id: 'child-1',
					grantedBy: 'parent-1',
					doesNotConsumeActiveSlot: false,
				}),
			]);
		});

		it('does not offer the no-slot option for an effect child', async () => {
			renderManageView(
				[parentCard, effectCard],
				[buildCharacterCard('parent-1', { isActive: true }), buildCharacterCard('effect-1')],
				false,
			);

			await fireEvent.click(screen.getByRole('button', { name: 'Vincular Sangre Mágica' }));

			const dialog = screen.getByRole('dialog');
			expect(within(dialog).queryByRole('checkbox')).not.toBeInTheDocument();
		});

		it('preselects the existing no-slot choice when editing the link', async () => {
			renderManageView(
				[parentCard, childCard],
				[
					buildCharacterCard('parent-1', { isActive: true }),
					buildCharacterCard('child-1', {
						grantedBy: 'parent-1',
						doesNotConsumeActiveSlot: true,
					}),
				],
				false,
			);

			await fireEvent.click(
				screen.getByRole('button', { name: 'Editar vinculación Artes Marciales' }),
			);

			const dialog = screen.getByRole('dialog');
			const choice = within(dialog).getByLabelText(
				'No consume una Ranura de Carta Activa',
			) as HTMLInputElement;
			expect(choice).toBeChecked();
		});

		it('clears the no-slot flag when removing the link', async () => {
			renderManageView(
				[parentCard, childCard],
				[
					buildCharacterCard('parent-1', { isActive: true }),
					buildCharacterCard('child-1', {
						grantedBy: 'parent-1',
						doesNotConsumeActiveSlot: true,
					}),
				],
				false,
			);

			await fireEvent.click(
				screen.getByRole('button', { name: 'Editar vinculación Artes Marciales' }),
			);
			const dialog = screen.getByRole('dialog');
			const select = within(dialog).getByLabelText('Vinculada a') as HTMLSelectElement;
			await fireEvent.change(select, { target: { value: '' } });
			await fireEvent.click(within(dialog).getByRole('button', { name: 'Guardar' }));

			const [updatedCards] = onChange.mock.calls[0] as [CharacterCard[]];
			const child = updatedCards.find((card) => card.id === 'child-1');
			expect(child).toMatchObject({ grantedBy: null });
			expect(child).not.toHaveProperty('doesNotConsumeActiveSlot');
		});
	});
});
