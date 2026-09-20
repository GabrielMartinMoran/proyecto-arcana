import { fireEvent, render, screen, within } from '@testing-library/svelte';
import { describe, expect, it, vi } from 'vitest';
import type { Creature } from '$lib/types/creature';
import BestiaryFilter from './BestiaryFilter.svelte';

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

const goblin = createCreature({ id: 'goblin', name: 'Goblin', lineage: 'Goblinoide', tier: 1 });
const hobgoblin = createCreature({
	id: 'hobgoblin',
	name: 'Hobgoblin',
	lineage: 'Goblinoide',
	tier: 2,
});
const dragon = createCreature({ id: 'dragon', name: 'Dragón', lineage: 'Dragón', tier: 3 });
const wolf = createCreature({ id: 'wolf', name: 'Lobo', lineage: 'Bestia', tier: 2 });
const construct = createCreature({ id: 'construct', name: 'Constructo', lineage: '', tier: 1 });

const creatures = [goblin, hobgoblin, dragon, wolf, construct];

type FilterShape = { name: string; tier: string; lineage?: string };

const renderBestiaryFilter = (filters: FilterShape) => {
	const onFiltersChange = vi.fn();
	const onResetFilters = vi.fn();
	const view = render(BestiaryFilter, {
		props: { creatures, filters, onFiltersChange, onResetFilters },
	});

	return { ...view, onFiltersChange, onResetFilters };
};

const getLineageSelect = () => screen.getByRole('combobox', { name: 'Linaje' });

describe('BestiaryFilter lineage selector', () => {
	it('shows a single-select lineage combobox labelled Linaje with an empty all-lineages option', () => {
		renderBestiaryFilter({ name: '', tier: '' });

		const lineageSelect = getLineageSelect();
		expect(lineageSelect).toHaveValue('');

		const allLineagesOption = within(lineageSelect).getByRole('option', {
			name: 'Todos los Linajes',
		});
		expect(allLineagesOption).toHaveValue('');
	});

	it('lists each non-empty lineage once in deterministic order', () => {
		renderBestiaryFilter({ name: '', tier: '' });

		const optionLabels = within(getLineageSelect())
			.getAllByRole('option')
			.map((option) => option.textContent?.trim());

		expect(optionLabels).toEqual(['Todos los Linajes', 'Bestia', 'Dragón', 'Goblinoide']);
	});

	it('selects the lineage received from props', () => {
		renderBestiaryFilter({ name: '', tier: '', lineage: 'Dragón' });

		expect(getLineageSelect()).toHaveValue('Dragón');
	});

	it('treats an omitted lineage filter as empty for backwards compatibility', () => {
		renderBestiaryFilter({ name: '', tier: '' });

		expect(getLineageSelect()).toHaveValue('');
	});

	it('emits the chosen lineage preserving the current name and tier', async () => {
		const { onFiltersChange } = renderBestiaryFilter({ name: 'gob', tier: '2' });

		await fireEvent.change(getLineageSelect(), { target: { value: 'Goblinoide' } });

		expect(onFiltersChange).toHaveBeenCalledTimes(1);
		expect(onFiltersChange).toHaveBeenCalledWith({
			name: 'gob',
			tier: '2',
			lineage: 'Goblinoide',
		});
	});

	it('emits an empty lineage when the all-lineages option is chosen', async () => {
		const { onFiltersChange } = renderBestiaryFilter({ name: '', tier: '', lineage: 'Bestia' });

		await fireEvent.change(getLineageSelect(), { target: { value: '' } });

		expect(onFiltersChange).toHaveBeenCalledTimes(1);
		expect(onFiltersChange).toHaveBeenCalledWith({ name: '', tier: '', lineage: '' });
	});

	it('delegates clearing all filters to the parent', async () => {
		const { onResetFilters } = renderBestiaryFilter({
			name: 'gob',
			tier: '2',
			lineage: 'Goblinoide',
		});

		await fireEvent.click(screen.getByRole('button', { name: 'Limpiar Filtros' }));

		expect(onResetFilters).toHaveBeenCalledTimes(1);
	});

	it('returns the lineage selector to the all-lineages option when the parent clears the filters', async () => {
		const { rerender, onFiltersChange, onResetFilters } = renderBestiaryFilter({
			name: 'gob',
			tier: '2',
			lineage: 'Goblinoide',
		});

		await fireEvent.click(screen.getByRole('button', { name: 'Limpiar Filtros' }));
		await rerender({ creatures, filters: { name: '', tier: '' }, onFiltersChange, onResetFilters });

		const lineageSelect = getLineageSelect();
		expect(lineageSelect).toHaveValue('');
		within(lineageSelect).getByRole('option', { name: 'Todos los Linajes' });
	});
});

describe('BestiaryFilter existing controls', () => {
	it('keeps the name search and tier filter working alongside the lineage selector', async () => {
		const { onFiltersChange } = renderBestiaryFilter({ name: 'dra', tier: '2' });

		const nameInput = screen.getByPlaceholderText('Buscar por nombre');
		expect(nameInput).toHaveValue('dra');

		const tierSelect = screen.getByRole('option', { name: 'Rango 2' }).closest('select');
		expect(tierSelect).toHaveValue('2');

		await fireEvent.input(nameInput, { target: { value: 'dragon' } });

		expect(onFiltersChange).toHaveBeenCalledTimes(1);
		expect(onFiltersChange).toHaveBeenCalledWith({ name: 'dragon', tier: '2' });
	});
});
