import { fireEvent, render, screen, within } from '@testing-library/svelte';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Creature } from '$lib/types/creature';

const mocks = vi.hoisted(() => ({
	rollExpression: vi.fn(),
	openRollModal: vi.fn(),
}));

vi.mock('$app/paths', () => ({
	resolve: (path: string) => path,
}));

vi.mock('$lib/services/dice-roller-service', () => ({
	useDiceRollerService: () => ({
		rollExpression: mocks.rollExpression,
		rollModal: {
			openRollModal: mocks.openRollModal,
		},
	}),
}));

import Statblock from './Statblock.svelte';

const buildCreature = (overrides: Partial<Creature> = {}): Creature => ({
	id: 'creature-1',
	name: 'Bestia de prueba',
	lineage: 'Bestia',
	tier: 1,
	size: 'Mediana',
	attributes: {
		body: 1,
		reflexes: 2,
		mind: 3,
		instinct: 4,
		presence: 5,
	},
	stats: {
		maxHealth: 10,
		evasion: { value: 12, note: null },
		physicalMitigation: { value: 1, note: null },
		magicalMitigation: { value: 2, note: null },
		speed: { value: 6, note: null },
	},
	languages: [],
	attacks: [],
	traits: [],
	actions: [],
	reactions: [],
	interactions: [],
	behavior: '',
	img: null,
	...overrides,
});

describe('Statblock inline dice formula buttons', () => {
	beforeEach(() => {
		mocks.rollExpression.mockClear();
		mocks.openRollModal.mockClear();
	});

	it('FEAT-statblock-inline-dice @multiple-formulas — renders action formulas in prose order', () => {
		render(Statblock, {
			props: {
				creature: buildCreature({
					actions: [
						{
							name: 'Explosión arcana',
							detail: 'Inflige 1d6 + 5 + 4d2 y luego 2d6 + 3',
							uses: null,
						},
					],
				}),
			},
		});

		const buttons = screen
			.getAllByRole('button')
			.filter((button) => ['1d6 + 5 + 4d2', '2d6 + 3'].includes(button.textContent ?? ''));

		expect(buttons.map((button) => button.textContent)).toEqual(['1d6 + 5 + 4d2', '2d6 + 3']);
	});

	it('FEAT-statblock-inline-dice @attack-notes — rolls attack note formulas with creature-prefixed attack name', async () => {
		render(Statblock, {
			props: {
				creature: buildCreature({
					name: 'Bestia ígnea',
					attacks: [
						{ name: 'Mordida', bonus: 2, damage: '1d8', note: 'El objetivo sangra 1d6 + 2' },
					],
				}),
			},
		});

		await fireEvent.click(screen.getByRole('button', { name: '1d6 + 2' }));

		expect(mocks.rollExpression).toHaveBeenCalledWith({
			expression: '1d6+2',
			title: 'Bestia ígnea: Mordida',
		});
	});

	it('FEAT-statblock-inline-dice @rolling — rolls action formulas with creature-prefixed action name', async () => {
		render(Statblock, {
			props: {
				creature: buildCreature({
					name: 'Bestia ígnea',
					actions: [{ name: 'Golpe brutal', detail: 'Inflige 1d8+1 de daño', uses: null }],
				}),
			},
		});

		await fireEvent.click(screen.getByRole('button', { name: '1d8+1' }));

		expect(mocks.rollExpression).toHaveBeenCalledWith({
			expression: '1d8+1',
			title: 'Bestia ígnea: Golpe brutal',
		});
		expect(mocks.openRollModal).not.toHaveBeenCalled();
	});

	it('FEAT-statblock-inline-dice @foundry-embedded — inline rolls use the same direct roll service path', async () => {
		render(Statblock, {
			props: {
				creature: buildCreature({
					actions: [{ name: 'Descarga', detail: 'Inflige 2d6', uses: null }],
				}),
			},
		});

		await fireEvent.click(screen.getByRole('button', { name: '2d6' }));

		expect(mocks.rollExpression).toHaveBeenCalledWith({
			expression: '2d6',
			title: 'Bestia de prueba: Descarga',
		});
		expect(mocks.openRollModal).not.toHaveBeenCalled();
	});

	it('FEAT-statblock-inline-dice @traits @reactions @interactions — rolls trait formulas with creature-prefixed trait name', async () => {
		render(Statblock, {
			props: {
				creature: buildCreature({
					name: 'Bestia ígnea',
					traits: [{ name: 'Sangre ígnea', detail: 'Al ser golpeado causa 1d6' }],
				}),
			},
		});

		await fireEvent.click(screen.getByRole('button', { name: '1d6' }));

		expect(mocks.rollExpression).toHaveBeenCalledWith({
			expression: '1d6',
			title: 'Bestia ígnea: Sangre ígnea',
		});
	});

	it.each([
		[
			'Sangre ígnea',
			{ traits: [{ name: 'Sangre ígnea', detail: 'Al ser golpeado causa 1d6' }] },
			'1d6',
		],
		[
			'Contraataque',
			{ reactions: [{ name: 'Contraataque', detail: 'Responde con 2d6 + 3', uses: null }] },
			'2d6 + 3',
		],
		[
			'Amenaza arcana',
			{
				interactions: [{ name: 'Amenaza arcana', detail: 'Fuerza una tirada de 3d4', uses: null }],
			},
			'3d4',
		],
	])(
		'FEAT-statblock-inline-dice @traits @reactions @interactions — renders %s formula',
		(_name, overrides, button) => {
			render(Statblock, { props: { creature: buildCreature(overrides as Partial<Creature>) } });

			expect(screen.getByRole('button', { name: button })).toBeInTheDocument();
		},
	);

	it('FEAT-statblock-inline-dice @behavior @stat-notes — rolls behavior and speed note formulas with creature-prefixed source titles', async () => {
		render(Statblock, {
			props: {
				creature: buildCreature({
					name: 'Bestia ígnea',
					behavior: 'Prefiere usar 1d6 trucos',
					stats: {
						maxHealth: 10,
						evasion: { value: 12, note: null },
						physicalMitigation: { value: 1, note: null },
						magicalMitigation: { value: 2, note: null },
						speed: { value: 6, note: 'Corre 2d6 metros extra' },
					},
				}),
			},
		});

		expect(screen.getByRole('button', { name: '1d6' })).toBeInTheDocument();

		await fireEvent.click(screen.getByRole('button', { name: '1d6' }));
		await fireEvent.click(screen.getByRole('button', { name: '2d6' }));

		expect(mocks.rollExpression).toHaveBeenCalledWith({
			expression: '1d6',
			title: 'Bestia ígnea: Comportamiento',
		});
		expect(mocks.rollExpression).toHaveBeenCalledWith({
			expression: '2d6',
			title: 'Bestia ígnea: Velocidad',
		});
	});

	it('FEAT-statblock-inline-dice @non-matches — preserves non-formula text without inline buttons', () => {
		render(Statblock, {
			props: {
				creature: buildCreature({
					actions: [
						{
							name: 'Texto técnico',
							detail: 'Tiene CD 15, rango 6, código abc1d6 y texto 1d6abc',
							uses: null,
						},
					],
				}),
			},
		});

		const action = screen.getByText(/Texto técnico/).closest('.action') as HTMLElement;
		expect(within(action).queryByRole('button')).toBeNull();
		expect(
			screen.getByText(/Tiene CD 15, rango 6, código abc1d6 y texto 1d6abc/),
		).toBeInTheDocument();
	});

	it('FEAT-statblock-inline-dice @existing-damage — leaves existing attack damage button unchanged', () => {
		render(Statblock, {
			props: {
				creature: buildCreature({
					attacks: [{ name: 'Garra', bonus: 1, damage: '1d6', note: null }],
				}),
			},
		});

		expect(screen.getByRole('button', { name: '1d6 💥' })).toBeInTheDocument();
		expect(screen.queryByRole('button', { name: '1d6' })).toBeNull();
	});
});
