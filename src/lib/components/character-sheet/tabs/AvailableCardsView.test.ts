import { mapAbilityCard } from '$lib/mappers/card-mapper';
import type { Card } from '$lib/types/cards/card';
import type { CharacterCard } from '$lib/types/character';
import type { FormulaContext } from '$lib/utils/modifiers-calculator';
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

const buildEffectCard = (
	id: string,
	name: string,
	uses: Card['uses'] = { type: 'USES', qty: 1 },
): Card => ({
	id,
	name,
	level: 1,
	tags: [],
	requirements: null,
	description: 'test effect',
	uses,
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

	it('FEAT-card-uses-formula @interaction @contract — offers the usage control for a finite effect card and spends a use', async () => {
		const cards: Card[] = [buildEffectCard('effect-1', 'Heal')];
		const characterCards: CharacterCard[] = [
			buildCharacterCard('effect-1', { isActive: true, uses: 1 }),
		];

		const { container } = render(AvailableCardsView, {
			props: {
				cards,
				characterCards,
				maxActiveCards: 3,
				readonly: false,
				onChange,
				onCardReloadClick,
			},
		});

		// Effect cards keep their prose and gain only the usage control: they
		// are never activable, so no activation toggle or Desactivar action.
		expect(screen.getByText('Heal')).toBeInTheDocument();
		expect(container.querySelector('.reload-control')).toBeInTheDocument();
		const useButton = screen.getByRole('button', { name: '✨ Usar' });
		expect(useButton).not.toBeDisabled();
		expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
		expect(screen.queryByRole('button', { name: 'Desactivar' })).not.toBeInTheDocument();

		await fireEvent.click(useButton);

		expect(onChange).toHaveBeenCalledWith([expect.objectContaining({ id: 'effect-1', uses: 0 })]);
	});

	it('FEAT-card-uses-formula @interaction — disables the use action for a depleted finite effect card', () => {
		const cards: Card[] = [buildEffectCard('effect-1', 'Heal')];
		const characterCards: CharacterCard[] = [
			buildCharacterCard('effect-1', { isActive: true, uses: 0 }),
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

		expect(screen.getByRole('button', { name: '✨ Usar' })).toBeDisabled();
		expect(screen.queryByRole('button', { name: '🎲 Recargar' })).not.toBeInTheDocument();
	});

	it('FEAT-card-uses-formula @contract — hides every control for an unlimited effect card', () => {
		const cards: Card[] = [buildEffectCard('effect-1', 'Heal', { type: null, qty: 0 })];
		const characterCards: CharacterCard[] = [buildCharacterCard('effect-1', { isActive: true })];

		const { container } = render(AvailableCardsView, {
			props: {
				cards,
				characterCards,
				maxActiveCards: 3,
				readonly: false,
				onChange,
				onCardReloadClick,
			},
		});

		expect(container.querySelector('.reload-control')).toBeNull();
		expect(screen.queryByRole('button', { name: '✨ Usar' })).toBeNull();
		expect(screen.queryByRole('button', { name: 'Desactivar' })).toBeNull();
		expect(screen.queryByRole('checkbox')).toBeNull();
	});

	it('FEAT-card-uses-formula @contract — never exposes the reload action for a RELOAD effect card', () => {
		const cards: Card[] = [buildEffectCard('effect-1', 'Heal', { type: 'RELOAD', qty: 3 })];
		const characterCards: CharacterCard[] = [
			buildCharacterCard('effect-1', { isActive: true, uses: 0 }),
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

		expect(screen.queryByRole('button', { name: '🎲 Recargar' })).not.toBeInTheDocument();
		expect(screen.getByRole('button', { name: '✨ Usar' })).toBeDisabled();
		expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
	});

	it('FEAT-card-uses-formula @contract — hides the effect usage control when the view is readonly', () => {
		const cards: Card[] = [buildEffectCard('effect-1', 'Heal')];
		const characterCards: CharacterCard[] = [
			buildCharacterCard('effect-1', { isActive: true, uses: 1 }),
		];

		const { container } = render(AvailableCardsView, {
			props: {
				cards,
				characterCards,
				maxActiveCards: 3,
				readonly: true,
				onChange,
				onCardReloadClick,
			},
		});

		expect(container.querySelector('.reload-control')).toBeNull();
		expect(screen.queryByRole('button', { name: '✨ Usar' })).toBeNull();
	});

	it('passes onCardReloadClick to reloadable activable cards', async () => {
		const cards: Card[] = [buildActivableCard('card-1', 'Fire Bolt', 'RELOAD')];
		const characterCards: CharacterCard[] = [
			buildCharacterCard('card-1', { isActive: true, uses: 0 }),
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

		const reloadButton = await screen.findByRole('button', { name: '🎲 Recargar' });
		expect(reloadButton).not.toBeDisabled();
		await fireEvent.click(reloadButton);

		expect(onCardReloadClick).toHaveBeenCalledWith('card-1');
	});

	describe('inline roll context', () => {
		it('FEAT-card-inline-dice @character-sheet — forwards the roll context to the Cartas Activas CardsList', () => {
			const cards: Card[] = [
				{ ...buildActivableCard('card-1', 'Fire Bolt'), description: 'Inflige 1d6 + Cuerpo' },
			];
			const characterCards: CharacterCard[] = [buildCharacterCard('card-1', { isActive: true })];

			render(AvailableCardsView, {
				props: {
					cards,
					characterCards,
					maxActiveCards: 3,
					readonly: false,
					onChange,
					onCardReloadClick,
					rollContext: { variables: { Cuerpo: 3 }, title: 'Hoja de cartas' },
				},
			});

			expect(screen.getByRole('button', { name: '1d6 + Cuerpo 🎲' })).toBeInTheDocument();
		});

		it('FEAT-card-inline-dice @character-sheet — forwards the roll context to the Efectos Activos CardsList', () => {
			const cards: Card[] = [
				{ ...buildEffectCard('effect-1', 'Heal'), description: 'Recupera 1d8 de salud' },
			];
			const characterCards: CharacterCard[] = [buildCharacterCard('effect-1', { isActive: true })];

			render(AvailableCardsView, {
				props: {
					cards,
					characterCards,
					maxActiveCards: 3,
					readonly: false,
					onChange,
					onCardReloadClick,
					rollContext: { variables: {}, title: 'Hoja de cartas' },
				},
			});

			expect(screen.getByRole('button', { name: '1d8 🎲' })).toBeInTheDocument();
		});

		it('FEAT-card-inline-dice @library — keeps cards read-only prose when no roll context is provided', () => {
			const cards: Card[] = [
				{ ...buildActivableCard('card-1', 'Fire Bolt'), description: 'Inflige 1d6 + Cuerpo' },
			];
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

			expect(document.body).toHaveTextContent('Inflige 1d6 + Cuerpo');
			expect(screen.queryByRole('button', { name: /🎲/ })).toBeNull();
		});
	});

	describe('card link presentation', () => {
		it('FEAT-card-associated-free @available @slots — keeps linked slot-free activable cards inside Cartas Activas and excludes them from the counter', () => {
			const cards: Card[] = [
				buildActivableCard('disciplina', 'Disciplina Monástica'),
				buildActivableCard('artes', 'Artes Marciales'),
				buildActivableCard('fuego', 'Fuego Rápido'),
			];
			const characterCards: CharacterCard[] = [
				buildCharacterCard('disciplina', { isActive: true }),
				buildCharacterCard('artes', {
					isActive: true,
					grantedBy: 'disciplina',
					doesNotConsumeActiveSlot: true,
				}),
				buildCharacterCard('fuego', { isActive: true }),
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

			// The linked activable card is excluded from the slot counter but
			// stays visible inside the Cartas Activas list.
			expect(screen.getByText('Cartas Activas (2/3)')).toBeInTheDocument();
			expect(screen.getByText('Artes Marciales')).toBeInTheDocument();
			expect(screen.getByText('🔗 Disciplina Monástica')).toBeInTheDocument();
			expect(screen.getByText('Activación gratuita')).toBeInTheDocument();
			// No separate linked section is created.
			expect(screen.queryByText(/Cartas vinculadas/)).not.toBeInTheDocument();
		});

		it('FEAT-card-associated-free @available @slots — keeps counting the flagged linked card when its activable parent is inactive', () => {
			const cards: Card[] = [
				buildActivableCard('disciplina', 'Disciplina Monástica'),
				buildActivableCard('artes', 'Artes Marciales'),
				buildActivableCard('fuego', 'Fuego Rápido'),
			];
			const characterCards: CharacterCard[] = [
				buildCharacterCard('disciplina', { isActive: false }),
				buildCharacterCard('artes', {
					isActive: true,
					grantedBy: 'disciplina',
					doesNotConsumeActiveSlot: true,
				}),
				buildCharacterCard('fuego', { isActive: true }),
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

			// The flagged card still consumes the slot while its activable
			// parent is inactive: the exemption is not effective yet, so the
			// Activación gratuita badge must not appear.
			expect(screen.getByText('Cartas Activas (2/3)')).toBeInTheDocument();
			expect(screen.getByText('Origen inactivo')).toBeInTheDocument();
			expect(screen.queryByText('Activación gratuita')).not.toBeInTheDocument();
			expect(screen.queryByText(/vinculada sin ranura/)).not.toBeInTheDocument();
		});

		it('FEAT-card-associated-free @effects — keeps linked effect cards in Efectos Activos with the link tag and without the Activación gratuita badge or Origen inactivo', () => {
			const cards: Card[] = [
				buildEffectCard('sangre', 'Sangre Mágica'),
				buildEffectCard('herencia', 'Herencia Sobrenatural'),
			];
			const characterCards: CharacterCard[] = [
				buildCharacterCard('sangre', { isActive: true, grantedBy: 'herencia' }),
				buildCharacterCard('herencia', { isActive: false }),
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

			// Both effect cards live in Efectos Activos; the linked child shows
			// only its origin, never Origen inactivo from an effect parent.
			expect(screen.getByText('Efectos Activos (2)')).toBeInTheDocument();
			expect(screen.getByText('Sangre Mágica')).toBeInTheDocument();
			expect(screen.getByText('🔗 Herencia Sobrenatural')).toBeInTheDocument();
			expect(screen.queryByText('Activación gratuita')).not.toBeInTheDocument();
			expect(screen.queryByText('Origen inactivo')).not.toBeInTheDocument();
		});

		it('FEAT-card-associated-free @available @accessibility — exposes an accessible name with the slot exemption', () => {
			const cards: Card[] = [
				buildActivableCard('disciplina', 'Disciplina Monástica'),
				buildActivableCard('artes', 'Artes Marciales'),
			];
			const characterCards: CharacterCard[] = [
				buildCharacterCard('disciplina', { isActive: true }),
				buildCharacterCard('artes', {
					isActive: true,
					grantedBy: 'disciplina',
					doesNotConsumeActiveSlot: true,
				}),
			];

			render(AvailableCardsView, {
				props: {
					cards,
					characterCards,
					maxActiveCards: 2,
					readonly: false,
					onChange,
					onCardReloadClick,
				},
			});

			expect(screen.getByLabelText(/No consume una Ranura de Carta Activa/)).toBeInTheDocument();
		});

		it('FEAT-card-associated-free @available — omits the linked legend when there are no effective linked cards', () => {
			const cards: Card[] = [buildActivableCard('fuego', 'Fuego Rápido')];
			const characterCards: CharacterCard[] = [buildCharacterCard('fuego', { isActive: true })];

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
			expect(screen.queryByText(/vinculada sin ranura/)).not.toBeInTheDocument();
		});
	});

	describe('formula uses context', () => {
		const buildContext = (overrides: Partial<FormulaContext> = {}): FormulaContext => ({
			cuerpo: 1,
			reflejos: 1,
			mente: 1,
			instinto: 1,
			presencia: 1,
			ppGastados: 0,
			...overrides,
		});

		const mapFormulaCard = (type: string) =>
			mapAbilityCard({
				name: 'Reprensión Infernal',
				level: 1,
				type,
				tags: ['Linaje'],
				description: 'La usas un número de veces por día de descanso igual a tu Presencia',
				uses: { type: 'LONG_REST', formula: 'presencia' },
			});

		it('FEAT-card-uses-formula @character-sheet — forwards the formula context to the Cartas Activas list', () => {
			const formulaCard = mapFormulaCard('activable');

			render(AvailableCardsView, {
				props: {
					cards: [formulaCard],
					characterCards: [buildCharacterCard(formulaCard.id, { isActive: true })],
					maxActiveCards: 3,
					readonly: false,
					onChange,
					onCardReloadClick,
					formulaContext: buildContext({ presencia: 4 }),
				},
			});

			expect(screen.getByText('Usos: 4')).toBeInTheDocument();
		});

		it('FEAT-card-uses-formula @character-sheet — forwards the formula context to the Efectos Activos list', () => {
			const formulaCard = mapFormulaCard('efecto');

			render(AvailableCardsView, {
				props: {
					cards: [formulaCard],
					characterCards: [buildCharacterCard(formulaCard.id, { isActive: false })],
					maxActiveCards: 3,
					readonly: false,
					onChange,
					onCardReloadClick,
					formulaContext: buildContext({ presencia: 4 }),
				},
			});

			expect(screen.getByText('Usos: 4')).toBeInTheDocument();
		});

		it('FEAT-card-uses-formula @library — hides the chip for a formula card without a context', () => {
			const formulaCard = mapFormulaCard('efecto');

			render(AvailableCardsView, {
				props: {
					cards: [formulaCard],
					characterCards: [buildCharacterCard(formulaCard.id, { isActive: false })],
					maxActiveCards: 3,
					readonly: false,
					onChange,
					onCardReloadClick,
				},
			});

			expect(screen.queryByText(/Usos:/)).not.toBeInTheDocument();
		});
	});
});
