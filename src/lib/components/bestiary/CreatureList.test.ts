import { fireEvent, render, screen, within } from '@testing-library/svelte';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import type { Creature } from '$lib/types/creature';
import CreatureList from './CreatureList.svelte';

const componentSource = readFileSync(
	join(process.cwd(), 'src/lib/components/bestiary/CreatureList.svelte'),
	'utf8',
);

const createCreature = (
	overrides: Partial<Creature> & Pick<Creature, 'id' | 'name'>,
): Creature => ({
	lineage: 'Goblinoide',
	tier: 1,
	size: 'Pequeño',
	attributes: { body: 2, reflexes: 3, mind: 1, instinct: 2, presence: 1 },
	stats: {
		maxHealth: 8,
		evasion: { value: 1, note: null },
		physicalMitigation: { value: 0, note: null },
		magicalMitigation: { value: 0, note: null },
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

const goblin = createCreature({
	id: 'goblin',
	name: 'Goblin',
	lineage: 'Goblinoide',
	tier: 1,
});
const dragon = createCreature({ id: 'dragon', name: 'Dragón', lineage: 'Dragón', tier: 3 });
const wolf = createCreature({ id: 'wolf', name: 'Lobo', lineage: 'Bestia', tier: 2 });

// `Linaje` stays in the accessible name but is hidden with `.sr-only`, so the
// visible text is the component text without those hidden nodes.
const visibleTextOf = (element: Element): string => {
	const clone = element.cloneNode(true) as Element;
	clone.querySelectorAll('.sr-only').forEach((hidden) => hidden.remove());
	return clone.textContent?.replace(/\s+/g, ' ').trim() ?? '';
};

const getCatalogueHeader = (): HTMLElement => {
	const header = screen.getByText('Nombre').closest<HTMLElement>('.catalogue-header');
	if (!header) {
		throw new Error('Catalogue header is not rendered');
	}
	return header;
};

describe('CreatureList', () => {
	it('renders every creature as an actionable control showing name, lineage value and tier', () => {
		render(CreatureList, {
			props: { creatures: [goblin, dragon], selectedCreatureId: null, onSelect: vi.fn() },
		});

		expect(screen.getAllByRole('button')).toHaveLength(2);

		const goblinButton = screen.getByRole('button', { name: /Goblin/ });
		expect(goblinButton).toHaveTextContent('Goblin');
		expect(visibleTextOf(goblinButton)).toContain('Goblinoide');
		expect(visibleTextOf(goblinButton)).not.toContain('Linaje');
		expect(goblinButton).toHaveTextContent('Rango 1');

		const dragonButton = screen.getByRole('button', { name: /Dragón/ });
		expect(dragonButton).toHaveTextContent('Dragón');
		expect(visibleTextOf(dragonButton)).toContain('Dragón');
		expect(dragonButton).toHaveTextContent('Rango 3');
	});

	it('@catalogue-layout labels the catalogue columns Nombre, Linaje and Rango', () => {
		render(CreatureList, {
			props: { creatures: [goblin, dragon], selectedCreatureId: null, onSelect: vi.fn() },
		});

		const header = getCatalogueHeader();
		expect(header).toHaveTextContent(/^Nombre Linaje Rango$/);
		expect(within(header).getByText('Nombre')).toBeInTheDocument();
		expect(within(header).getByText('Linaje')).toBeInTheDocument();
		expect(within(header).getByText('Rango')).toBeInTheDocument();
	});

	it('@catalogue-layout aligns the header and every creature row on the shared catalogue grid', () => {
		render(CreatureList, {
			props: { creatures: [goblin, dragon, wolf], selectedCreatureId: null, onSelect: vi.fn() },
		});

		expect(getCatalogueHeader()).toHaveClass('catalogue-grid');

		const rows = screen.getAllByRole('button');
		expect(rows).toHaveLength(3);
		for (const row of rows) {
			expect(row).toHaveClass('catalogue-grid');
		}
	});

	it('@catalogue-layout shows each lineage as a plain value and keeps its Linaje context hidden', () => {
		render(CreatureList, {
			props: { creatures: [goblin, dragon], selectedCreatureId: null, onSelect: vi.fn() },
		});

		const [goblinRow, dragonRow] = screen.getAllByRole('button');
		expect(visibleTextOf(goblinRow)).toBe('Goblin Goblinoide Rango 1');
		expect(visibleTextOf(dragonRow)).toBe('Dragón Dragón Rango 3');

		for (const row of [goblinRow, dragonRow]) {
			expect(visibleTextOf(row)).not.toContain('Linaje');
			expect(row.querySelector('.creature-lineage .sr-only')).toHaveTextContent('Linaje');
		}
	});

	it('keeps the creature name, lineage and tier in the accessible name', () => {
		render(CreatureList, {
			props: { creatures: [goblin], selectedCreatureId: null, onSelect: vi.fn() },
		});

		const goblinButton = screen.getByRole('button', { name: /Goblin/ });
		expect(goblinButton).toHaveAccessibleName(/Linaje Goblinoide/);
		expect(goblinButton).toHaveAccessibleName(/Rango 1/);
	});

	it('preserves the received order instead of sorting by tier or name', () => {
		render(CreatureList, {
			props: { creatures: [dragon, goblin, wolf], selectedCreatureId: null, onSelect: vi.fn() },
		});

		const [first, second, third] = screen.getAllByRole('button');
		expect(first).toHaveAccessibleName(/Dragón/);
		expect(second).toHaveAccessibleName(/Goblin/);
		expect(third).toHaveAccessibleName(/Lobo/);
	});

	it('marks exactly the selected creature as pressed when the selection matches', () => {
		render(CreatureList, {
			props: { creatures: [goblin, dragon], selectedCreatureId: 'goblin', onSelect: vi.fn() },
		});

		const pressedButtons = screen.getAllByRole('button', { pressed: true });
		expect(pressedButtons).toHaveLength(1);
		expect(pressedButtons[0]).toHaveAccessibleName(/Goblin/);
		expect(screen.getAllByRole('button', { pressed: false })).toHaveLength(1);
	});

	it('marks no creature as pressed when nothing is selected', () => {
		render(CreatureList, {
			props: { creatures: [goblin, dragon], selectedCreatureId: null, onSelect: vi.fn() },
		});

		expect(screen.queryAllByRole('button', { pressed: true })).toHaveLength(0);
		expect(screen.getAllByRole('button', { pressed: false })).toHaveLength(2);
	});

	it('marks no creature as pressed when the selection is absent from the filtered list', () => {
		render(CreatureList, {
			props: { creatures: [goblin, dragon], selectedCreatureId: 'not-listed', onSelect: vi.fn() },
		});

		expect(screen.queryAllByRole('button', { pressed: true })).toHaveLength(0);
	});

	it('invokes onSelect with the clicked creature', async () => {
		const onSelect = vi.fn();
		render(CreatureList, {
			props: { creatures: [goblin, dragon], selectedCreatureId: null, onSelect },
		});

		await fireEvent.click(screen.getByRole('button', { name: /Goblin/ }));

		expect(onSelect).toHaveBeenCalledTimes(1);
		expect(onSelect).toHaveBeenCalledWith(goblin);
	});

	it('keeps the pressed state controlled by the parent after a click', async () => {
		const onSelect = vi.fn();
		render(CreatureList, {
			props: { creatures: [goblin, dragon], selectedCreatureId: null, onSelect },
		});

		await fireEvent.click(screen.getByRole('button', { name: /Goblin/ }));

		expect(onSelect).toHaveBeenCalledTimes(1);
		expect(screen.queryAllByRole('button', { pressed: true })).toHaveLength(0);
	});

	it('shows a comprehensible empty state when no creatures are provided', () => {
		render(CreatureList, {
			props: { creatures: [], selectedCreatureId: null, onSelect: vi.fn() },
		});

		expect(screen.getByRole('status')).toHaveTextContent('No hay criaturas para mostrar');
		expect(screen.queryAllByRole('button')).toHaveLength(0);
		expect(screen.queryByRole('list')).not.toBeInTheDocument();
	});

	it('does not show the empty state while creatures are listed', () => {
		render(CreatureList, {
			props: { creatures: [goblin], selectedCreatureId: null, onSelect: vi.fn() },
		});

		expect(screen.queryByRole('status')).not.toBeInTheDocument();
	});
});

describe('CreatureList catalogue grid contract', () => {
	it('declares the contracted column tracks on the shared grid rule', () => {
		expect(componentSource).toMatch(
			/\.catalogue-grid\s*\{[^}]*grid-template-columns:\s*minmax\(\s*0,\s*2fr\s*\)\s+minmax\(\s*0,\s*1fr\s*\)\s+4\.5rem/,
		);
	});

	it('keeps the visually hidden lineage context local to the component', () => {
		expect(componentSource).toMatch(/\.sr-only\s*\{[^}]*position:\s*absolute/);
		expect(componentSource).toMatch(/\.sr-only\s*\{[^}]*clip:\s*rect\(/);
		expect(componentSource).not.toMatch(/:global\s*\(/);
	});
});
