import { fireEvent, render, screen, within } from '@testing-library/svelte';
import { tick } from 'svelte';
import { describe, expect, it, vi } from 'vitest';
import type { Card } from '$lib/types/cards/card';
import type { CharacterCard } from '$lib/types/character';
import CardAssociationModal from './CardAssociationModal.svelte';

const buildCard = (id: string, name: string, overrides: Partial<Card> = {}): Card => ({
	id,
	name,
	level: 1,
	tags: [],
	requirements: null,
	description: 'descripción',
	uses: { type: 'USES', qty: 3 },
	type: 'activable',
	cardType: 'ability',
	img: '',
	...overrides,
});

const buildCharacterCard = (id: string, overrides: Partial<CharacterCard> = {}): CharacterCard => ({
	id,
	uses: 3,
	isActive: true,
	level: 1,
	cardType: 'ability',
	isOvercharged: false,
	...overrides,
});

const disciplinaMonastica = buildCard('disciplina-id', 'Disciplina Monástica');
const artesMarciales = buildCard('artes-id', 'Artes Marciales', {
	requirements: 'Disciplina Monástica',
});
const pactoSupremo = buildCard('pacto-id', 'Pacto Supremo');
const noPoseida = buildCard('ghost-id', 'Carta No Poseída');
const sintonica = buildCard('sintonia-acero-id', 'Sintonía con el Acero');
const sintoniaFluida = buildCard('sintonia-fluida-id', 'Sintonía Fluida');
const espadachin = buildCard('espadachin-id', 'Espadachín', {
	requirements: 'Sintonía con el Acero | Sintonía Fluida',
});
const estirpeCustom = buildCard('custom-dragon', 'Estirpe Dracónica');
const alientoDracnico = buildCard('aliento-id', 'Aliento Dracónico', {
	requirements: 'Estirpe Dracónica',
});

const getParentSelect = (): HTMLSelectElement =>
	screen.getByLabelText('Vinculada a') as HTMLSelectElement;

const getOptionTexts = (select: HTMLSelectElement): string[] =>
	Array.from(select.options).map((option) => option.textContent ?? '');

describe('CardAssociationModal', () => {
	it('should show the dialog with the child name and the labeled parent selector when opened', () => {
		const child = buildCharacterCard(artesMarciales.id);
		const parent = buildCharacterCard(disciplinaMonastica.id);

		render(CardAssociationModal, {
			props: {
				opened: true,
				child,
				characterCards: [child, parent],
				allCards: [artesMarciales, disciplinaMonastica],
				onClose: vi.fn(),
				onSave: vi.fn(),
			},
		});

		const dialog = screen.getByRole('dialog');
		expect(within(dialog).getByText('Vincular carta')).toBeInTheDocument();
		expect(within(dialog).getByText('Artes Marciales')).toBeInTheDocument();
		expect(getParentSelect()).toBeInTheDocument();
	});

	it('should offer only owned options and exclude the child itself', () => {
		const child = buildCharacterCard(artesMarciales.id);
		const parent = buildCharacterCard(disciplinaMonastica.id);
		const other = buildCharacterCard(pactoSupremo.id);

		render(CardAssociationModal, {
			props: {
				opened: true,
				child,
				characterCards: [child, parent, other],
				allCards: [artesMarciales, disciplinaMonastica, pactoSupremo, noPoseida],
				onClose: vi.fn(),
				onSave: vi.fn(),
			},
		});

		const optionTexts = getOptionTexts(getParentSelect());
		// Placeholder + the two owned candidates; the unowned definition and
		// the child itself are never offered.
		expect(optionTexts).toHaveLength(3);
		expect(optionTexts.filter((text) => text.includes('Disciplina Monástica'))).toHaveLength(1);
		expect(optionTexts.filter((text) => text.includes('Pacto Supremo'))).toHaveLength(1);
		expect(optionTexts.some((text) => text.includes('Carta No Poseída'))).toBe(false);
		expect(optionTexts.some((text) => text.includes('Artes Marciales'))).toBe(false);
	});

	it('should mark and order first the options that fulfill the requirement', () => {
		const child = buildCharacterCard(artesMarciales.id);
		const parent = buildCharacterCard(disciplinaMonastica.id);
		const other = buildCharacterCard(pactoSupremo.id);

		render(CardAssociationModal, {
			props: {
				opened: true,
				child,
				characterCards: [child, parent, other],
				allCards: [artesMarciales, disciplinaMonastica, pactoSupremo],
				onClose: vi.fn(),
				onSave: vi.fn(),
			},
		});

		const optionTexts = getOptionTexts(getParentSelect());
		expect(optionTexts[0]).toBe('— Sin vinculación —');
		expect(optionTexts[1]).toContain('Disciplina Monástica');
		expect(optionTexts[1]).toContain('[Requerimiento cumplido]');
		expect(optionTexts[2]).toContain('Pacto Supremo');
		expect(optionTexts[2]).not.toContain('[Requerimiento cumplido]');
	});

	it('should mark owned custom cards and identify them as custom', () => {
		const child = buildCharacterCard(alientoDracnico.id);
		const custom = buildCharacterCard(estirpeCustom.id);
		const other = buildCharacterCard(disciplinaMonastica.id);

		render(CardAssociationModal, {
			props: {
				opened: true,
				child,
				characterCards: [child, custom, other],
				allCards: [alientoDracnico, estirpeCustom, disciplinaMonastica],
				onClose: vi.fn(),
				onSave: vi.fn(),
			},
		});

		const optionTexts = getOptionTexts(getParentSelect());
		expect(optionTexts[1]).toContain('Estirpe Dracónica');
		expect(optionTexts[1]).toContain('Personalizada');
		expect(optionTexts[1]).toContain('[Requerimiento cumplido]');
	});

	it('should preselect the only candidate that fulfills the requirement', () => {
		const child = buildCharacterCard(artesMarciales.id);
		const parent = buildCharacterCard(disciplinaMonastica.id);
		const other = buildCharacterCard(pactoSupremo.id);

		render(CardAssociationModal, {
			props: {
				opened: true,
				child,
				characterCards: [child, parent, other],
				allCards: [artesMarciales, disciplinaMonastica, pactoSupremo],
				onClose: vi.fn(),
				onSave: vi.fn(),
			},
		});

		expect(getParentSelect().value).toBe(disciplinaMonastica.id);
	});

	it('should not preselect any parent when several alternatives fulfill an OR requirement', () => {
		const child = buildCharacterCard(espadachin.id);
		const first = buildCharacterCard(sintonica.id);
		const second = buildCharacterCard(sintoniaFluida.id);

		render(CardAssociationModal, {
			props: {
				opened: true,
				child,
				characterCards: [child, first, second],
				allCards: [espadachin, sintonica, sintoniaFluida],
				onClose: vi.fn(),
				onSave: vi.fn(),
			},
		});

		const select = getParentSelect();
		expect(select.value).toBe('');
		expect(
			getOptionTexts(select).filter((text) => text.includes('[Requerimiento cumplido]')),
		).toHaveLength(2);
	});

	it('should save the selected parent through onSave when the user confirms', async () => {
		const onSave = vi.fn();
		const child = buildCharacterCard(artesMarciales.id);
		const parent = buildCharacterCard(disciplinaMonastica.id);

		render(CardAssociationModal, {
			props: {
				opened: true,
				child,
				characterCards: [child, parent],
				allCards: [artesMarciales, disciplinaMonastica],
				onClose: vi.fn(),
				onSave,
			},
		});

		await fireEvent.click(
			within(screen.getByRole('dialog')).getByRole('button', { name: 'Guardar' }),
		);

		expect(onSave).toHaveBeenCalledWith(artesMarciales.id, disciplinaMonastica.id, false);
	});

	it('should preselect the current parent and offer Sin vinculación when the card already has a parent', () => {
		const child = buildCharacterCard(artesMarciales.id, {
			grantedBy: disciplinaMonastica.id,
		});
		const parent = buildCharacterCard(disciplinaMonastica.id);

		render(CardAssociationModal, {
			props: {
				opened: true,
				child,
				characterCards: [child, parent],
				allCards: [artesMarciales, disciplinaMonastica],
				onClose: vi.fn(),
				onSave: vi.fn(),
			},
		});

		expect(getParentSelect().value).toBe(disciplinaMonastica.id);
		expect(getOptionTexts(getParentSelect())[0]).toBe('— Sin vinculación —');
		expect(screen.queryByRole('button', { name: 'Quitar vinculación' })).not.toBeInTheDocument();
	});

	it('should save a null parent when the user selects Sin vinculación', async () => {
		const onSave = vi.fn();
		const child = buildCharacterCard(artesMarciales.id, {
			grantedBy: disciplinaMonastica.id,
		});
		const parent = buildCharacterCard(disciplinaMonastica.id);

		render(CardAssociationModal, {
			props: {
				opened: true,
				child,
				characterCards: [child, parent],
				allCards: [artesMarciales, disciplinaMonastica],
				onClose: vi.fn(),
				onSave,
			},
		});

		await fireEvent.change(getParentSelect(), { target: { value: '' } });
		expect(getParentSelect().value).toBe('');

		await fireEvent.click(
			within(screen.getByRole('dialog')).getByRole('button', { name: 'Guardar' }),
		);

		expect(onSave).toHaveBeenCalledWith(artesMarciales.id, null, false);
	});

	it('should save a null parent idempotently when the card has no link', async () => {
		const onSave = vi.fn();
		const child = buildCharacterCard(pactoSupremo.id);

		render(CardAssociationModal, {
			props: {
				opened: true,
				child,
				characterCards: [child],
				allCards: [pactoSupremo],
				onClose: vi.fn(),
				onSave,
			},
		});

		expect(getParentSelect().value).toBe('');
		await fireEvent.click(
			within(screen.getByRole('dialog')).getByRole('button', { name: 'Guardar' }),
		);

		expect(screen.queryByRole('alert')).not.toBeInTheDocument();
		expect(getParentSelect()).not.toHaveAttribute('aria-invalid', 'true');
		expect(onSave).toHaveBeenCalledWith(pactoSupremo.id, null, false);
	});

	it('should not save and should show an inline error when the link would create a cycle', async () => {
		const onSave = vi.fn();
		const cardA = buildCharacterCard('card-a', { grantedBy: 'card-b' });
		const cardB = buildCharacterCard('card-b');

		render(CardAssociationModal, {
			props: {
				opened: true,
				child: cardB,
				characterCards: [cardA, cardB],
				allCards: [buildCard('card-a', 'Carta A'), buildCard('card-b', 'Carta B')],
				onClose: vi.fn(),
				onSave,
			},
		});

		await fireEvent.change(getParentSelect(), { target: { value: 'card-a' } });
		await fireEvent.click(
			within(screen.getByRole('dialog')).getByRole('button', { name: 'Guardar' }),
		);

		expect(screen.getByRole('alert')).toHaveTextContent(
			'La asociación crearía un ciclo entre cartas.',
		);
		expect(onSave).not.toHaveBeenCalled();
	});

	it('should call onClose on Cancelar without saving', async () => {
		const onClose = vi.fn();
		const onSave = vi.fn();
		const child = buildCharacterCard(artesMarciales.id);
		const parent = buildCharacterCard(disciplinaMonastica.id);

		render(CardAssociationModal, {
			props: {
				opened: true,
				child,
				characterCards: [child, parent],
				allCards: [artesMarciales, disciplinaMonastica],
				onClose,
				onSave,
			},
		});

		await fireEvent.click(
			within(screen.getByRole('dialog')).getByRole('button', { name: 'Cancelar' }),
		);

		expect(onClose).toHaveBeenCalled();
		expect(onSave).not.toHaveBeenCalled();
	});

	it('should not emit or mutate when canceling after selecting Sin vinculación', async () => {
		const onClose = vi.fn();
		const onSave = vi.fn();
		const child = buildCharacterCard(artesMarciales.id, {
			grantedBy: disciplinaMonastica.id,
		});
		const parent = buildCharacterCard(disciplinaMonastica.id);

		render(CardAssociationModal, {
			props: {
				opened: true,
				child,
				characterCards: [child, parent],
				allCards: [artesMarciales, disciplinaMonastica],
				onClose,
				onSave,
			},
		});

		await fireEvent.change(getParentSelect(), { target: { value: '' } });
		await fireEvent.click(
			within(screen.getByRole('dialog')).getByRole('button', { name: 'Cancelar' }),
		);

		expect(onClose).toHaveBeenCalled();
		expect(onSave).not.toHaveBeenCalled();
		expect(child.grantedBy).toBe(disciplinaMonastica.id);
	});

	it('should close on Escape', async () => {
		const onClose = vi.fn();
		const child = buildCharacterCard(artesMarciales.id);
		const parent = buildCharacterCard(disciplinaMonastica.id);

		render(CardAssociationModal, {
			props: {
				opened: true,
				child,
				characterCards: [child, parent],
				allCards: [artesMarciales, disciplinaMonastica],
				onClose,
				onSave: vi.fn(),
			},
		});

		await tick();
		await fireEvent.keyDown(window, { key: 'Escape' });

		expect(onClose).toHaveBeenCalled();
	});

	it('should focus the parent selector when the modal opens', async () => {
		const child = buildCharacterCard(artesMarciales.id);
		const parent = buildCharacterCard(disciplinaMonastica.id);

		render(CardAssociationModal, {
			props: {
				opened: true,
				child,
				characterCards: [child, parent],
				allCards: [artesMarciales, disciplinaMonastica],
				onClose: vi.fn(),
				onSave: vi.fn(),
			},
		});

		await tick();
		expect(getParentSelect()).toHaveFocus();
	});

	describe('slot exemption choice', () => {
		const renderModal = (
			child: CharacterCard,
			extraCards: CharacterCard[] = [],
			onSave = vi.fn(),
			onClose = vi.fn(),
		) => {
			render(CardAssociationModal, {
				props: {
					opened: true,
					child,
					characterCards: [child, ...extraCards],
					allCards: [artesMarciales, disciplinaMonastica, pactoSupremo],
					onClose,
					onSave,
				},
			});
			return { onSave, onClose };
		};

		const getSlotChoice = (): HTMLInputElement =>
			screen.getByLabelText('No consume una Ranura de Carta Activa') as HTMLInputElement;

		const save = async () => {
			await fireEvent.click(
				within(screen.getByRole('dialog')).getByRole('button', { name: 'Guardar' }),
			);
		};

		it('shows the slot choice with an associated label and help for an activable child', () => {
			const child = buildCharacterCard(artesMarciales.id);
			const parent = buildCharacterCard(disciplinaMonastica.id);

			renderModal(child, [parent]);

			const choice = getSlotChoice();
			expect(choice).toBeInTheDocument();
			expect(choice).not.toBeChecked();
			expect(
				screen.getByText('La carta activable se mantiene en Cartas Activas sin ocupar una ranura.'),
			).toBeInTheDocument();
		});

		it('starts unchecked when the existing association carries no flag', () => {
			const child = buildCharacterCard(artesMarciales.id, {
				grantedBy: disciplinaMonastica.id,
			});
			const parent = buildCharacterCard(disciplinaMonastica.id);

			renderModal(child, [parent]);

			expect(getSlotChoice()).not.toBeChecked();
		});

		it('starts checked when the existing association carries the flag', () => {
			const child = buildCharacterCard(artesMarciales.id, {
				grantedBy: disciplinaMonastica.id,
				doesNotConsumeActiveSlot: true,
			});
			const parent = buildCharacterCard(disciplinaMonastica.id);

			renderModal(child, [parent]);

			expect(getSlotChoice()).toBeChecked();
		});

		it('saves the flag together with the parent when the user checks it', async () => {
			const onSave = vi.fn();
			const child = buildCharacterCard(artesMarciales.id);
			const parent = buildCharacterCard(disciplinaMonastica.id);

			renderModal(child, [parent], onSave);

			await fireEvent.click(getSlotChoice());
			expect(getSlotChoice()).toBeChecked();

			await save();

			expect(onSave).toHaveBeenCalledWith(artesMarciales.id, disciplinaMonastica.id, true);
		});

		it('saves an explicit false when the user leaves the option unchecked', async () => {
			const onSave = vi.fn();
			const child = buildCharacterCard(artesMarciales.id);
			const parent = buildCharacterCard(disciplinaMonastica.id);

			renderModal(child, [parent], onSave);

			await save();

			expect(onSave).toHaveBeenCalledWith(artesMarciales.id, disciplinaMonastica.id, false);
		});

		it('edits an existing true flag back to false and saves it', async () => {
			const onSave = vi.fn();
			const child = buildCharacterCard(artesMarciales.id, {
				grantedBy: disciplinaMonastica.id,
				doesNotConsumeActiveSlot: true,
			});
			const parent = buildCharacterCard(disciplinaMonastica.id);

			renderModal(child, [parent], onSave);

			expect(getSlotChoice()).toBeChecked();
			await fireEvent.click(getSlotChoice());
			expect(getSlotChoice()).not.toBeChecked();

			await save();

			expect(onSave).toHaveBeenCalledWith(artesMarciales.id, disciplinaMonastica.id, false);
		});

		it('does not render the slot choice for an effect child', () => {
			const effect = buildCard('sangre-id', 'Sangre Mágica', { type: 'efecto' });
			const child = buildCharacterCard(effect.id);
			const parent = buildCharacterCard(disciplinaMonastica.id);

			render(CardAssociationModal, {
				props: {
					opened: true,
					child,
					characterCards: [child, parent],
					allCards: [effect, disciplinaMonastica],
					onClose: vi.fn(),
					onSave: vi.fn(),
				},
			});

			expect(
				screen.queryByLabelText('No consume una Ranura de Carta Activa'),
			).not.toBeInTheDocument();
			expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
		});

		it('does not render the slot choice for a consumible child', () => {
			const consumible = buildCard('pocion-id', 'Poción de Curación', { type: 'consumible' });
			const child = buildCharacterCard(consumible.id);
			const parent = buildCharacterCard(disciplinaMonastica.id);

			render(CardAssociationModal, {
				props: {
					opened: true,
					child,
					characterCards: [child, parent],
					allCards: [consumible, disciplinaMonastica],
					onClose: vi.fn(),
					onSave: vi.fn(),
				},
			});

			expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
		});

		it('does not mutate or persist when canceling after toggling the option', async () => {
			const onSave = vi.fn();
			const onClose = vi.fn();
			const child = buildCharacterCard(artesMarciales.id);
			const parent = buildCharacterCard(disciplinaMonastica.id);

			renderModal(child, [parent], onSave, onClose);

			await fireEvent.click(getSlotChoice());
			await fireEvent.click(
				within(screen.getByRole('dialog')).getByRole('button', { name: 'Cancelar' }),
			);

			expect(onSave).not.toHaveBeenCalled();
			expect(child.doesNotConsumeActiveSlot).toBeUndefined();
		});

		it('unlinks without a parent-ownership error when the no-slot option is checked with no parent selected', async () => {
			const onSave = vi.fn();
			const child = buildCharacterCard(artesMarciales.id);
			const parent = buildCharacterCard(disciplinaMonastica.id);

			renderModal(child, [parent], onSave);

			await fireEvent.change(getParentSelect(), { target: { value: '' } });
			await fireEvent.click(getSlotChoice());

			await save();

			expect(screen.queryByRole('alert')).not.toBeInTheDocument();
			expect(onSave).toHaveBeenCalledWith(artesMarciales.id, null, false);
		});
	});
});
