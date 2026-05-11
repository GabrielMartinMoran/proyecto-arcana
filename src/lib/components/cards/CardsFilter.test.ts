import type { Card } from '$lib/types/cards/card';
import { fireEvent, render, screen, within } from '@testing-library/svelte';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// ---- Mock SvelteKit internals used by cards-filter-service ----
vi.mock('$app/navigation', () => ({
	replaceState: vi.fn(),
}));

vi.mock('$app/state', () => ({
	page: {
		url: new URL('http://localhost/'),
	},
}));

import CardsFilter from './CardsFilter.svelte';
import CardsFilterHarness from './CardsFilterHarness.svelte';

const emptyFilters = { name: '', level: [], tags: [], type: '' };

const openMultiSelect = async (summary: RegExp) => {
	const summaryButton = screen.getByText(summary);
	await fireEvent.click(summaryButton);
	return summaryButton.closest('.multi-select') as HTMLElement;
};

const getCheckboxesIn = (container: HTMLElement) =>
	Array.from(container.querySelectorAll<HTMLInputElement>('input[type="checkbox"]'));

const expectEveryCheckboxUnchecked = (container: HTMLElement) => {
	for (const checkbox of getCheckboxesIn(container)) {
		expect(checkbox).not.toBeChecked();
	}
};

const buildAbilityCard = (name: string, tags: string[]): Card =>
	({
		id: name.toLowerCase().replace(/\s/g, '-'),
		name,
		level: 1,
		tags,
		requirements: null,
		description: '',
		uses: { type: 'USES', qty: 1 },
		type: 'activable',
		cardType: 'ability',
		img: '',
	}) as unknown as Card;

const buildItemCard = (name: string, tags: string[]): Card =>
	({
		id: name.toLowerCase().replace(/\s/g, '-'),
		name,
		level: 1,
		tags,
		requirements: null,
		description: '',
		uses: { type: 'USES', qty: 1 },
		type: 'activable',
		cardType: 'item',
		img: '',
		cost: '10',
	}) as unknown as Card;

describe('CardsFilter', () => {
	const onFiltersChange = vi.fn();
	const onResetFilters = vi.fn();

	beforeEach(() => {
		onFiltersChange.mockClear();
		onResetFilters.mockClear();
	});

	describe('ability card tag grouping', () => {
		it('displays group headers for ability tags', async () => {
			const cards = [
				buildAbilityCard('Fire Bolt', ['arcanista']),
				buildAbilityCard('Heal', ['curación']),
				buildAbilityCard('Human Trait', ['humano']),
			];

			render(CardsFilter, {
				props: {
					cards,
					filters: { name: '', level: [], tags: [], type: '' },
					onFiltersChange,
					onResetFilters,
					cardType: 'ability',
				},
			});

			// Open the Etiquetas multi-select
			const etiquetasSummary = screen.getByText(/Etiquetas/i);
			await fireEvent.click(etiquetasSummary);

			expect(screen.getByText('Arquetipos')).toBeInTheDocument();
			expect(screen.getByText('Linajes')).toBeInTheDocument();
			expect(screen.getByText('Mecánicas')).toBeInTheDocument();
		});

		it('shows tags under their respective group headers', async () => {
			const cards = [
				buildAbilityCard('Fire Bolt', ['arcanista']),
				buildAbilityCard('Human Trait', ['humano']),
			];

			render(CardsFilter, {
				props: {
					cards,
					filters: { name: '', level: [], tags: [], type: '' },
					onFiltersChange,
					onResetFilters,
					cardType: 'ability',
				},
			});

			const etiquetasSummary = screen.getByText(/Etiquetas/i);
			await fireEvent.click(etiquetasSummary);

			expect(screen.getByLabelText('Arcanista')).toBeInTheDocument();
			expect(screen.getByLabelText('Humano')).toBeInTheDocument();
		});

		it('shows Otros group for unmapped ability tags', async () => {
			const cards = [buildAbilityCard('Unknown', ['nuevotag'])];

			render(CardsFilter, {
				props: {
					cards,
					filters: { name: '', level: [], tags: [], type: '' },
					onFiltersChange,
					onResetFilters,
					cardType: 'ability',
				},
			});

			const etiquetasSummary = screen.getByText(/Etiquetas/i);
			await fireEvent.click(etiquetasSummary);

			expect(screen.getByText('Otros')).toBeInTheDocument();
			expect(screen.getByLabelText('Nuevotag')).toBeInTheDocument();
		});

		it('does not show Otros group when all ability tags are mapped', async () => {
			const cards = [
				buildAbilityCard('Fire Bolt', ['arcanista']),
				buildAbilityCard('Heal', ['curación']),
			];

			render(CardsFilter, {
				props: {
					cards,
					filters: { name: '', level: [], tags: [], type: '' },
					onFiltersChange,
					onResetFilters,
					cardType: 'ability',
				},
			});

			const etiquetasSummary = screen.getByText(/Etiquetas/i);
			await fireEvent.click(etiquetasSummary);

			// 'Otros' should not appear as a group header
			const otrosHeader = Array.from(document.querySelectorAll('.group-header')).find(
				(el) => el.textContent === 'Otros',
			);
			expect(otrosHeader).toBeUndefined();
		});
	});

	describe('item card tag grouping', () => {
		it('displays group headers for item tags', async () => {
			const cards = [
				buildItemCard('Sword', ['arma']),
				buildItemCard('Amulet', ['mente']),
				buildItemCard('Potion', ['poción']),
			];

			render(CardsFilter, {
				props: {
					cards,
					filters: { name: '', level: [], tags: [], type: '' },
					onFiltersChange,
					onResetFilters,
					cardType: 'item',
				},
			});

			const etiquetasSummary = screen.getByText(/Etiquetas/i);
			await fireEvent.click(etiquetasSummary);

			expect(screen.getByText('Atributos')).toBeInTheDocument();
			expect(screen.getByText('Equipamiento')).toBeInTheDocument();
			expect(screen.getByText('Otros')).toBeInTheDocument();
		});

		it('shows Otros group for unmapped item tags', async () => {
			const cards = [buildItemCard('Unknown', ['nuevotag'])];

			render(CardsFilter, {
				props: {
					cards,
					filters: { name: '', level: [], tags: [], type: '' },
					onFiltersChange,
					onResetFilters,
					cardType: 'item',
				},
			});

			const etiquetasSummary = screen.getByText(/Etiquetas/i);
			await fireEvent.click(etiquetasSummary);

			expect(screen.getByText('Otros')).toBeInTheDocument();
			expect(screen.getByLabelText('Nuevotag')).toBeInTheDocument();
		});
	});

	describe('group header behavior', () => {
		it('renders group headers in bold without checkboxes', async () => {
			const cards = [buildAbilityCard('Fire Bolt', ['arcanista'])];

			const { container } = render(CardsFilter, {
				props: {
					cards,
					filters: { name: '', level: [], tags: [], type: '' },
					onFiltersChange,
					onResetFilters,
					cardType: 'ability',
				},
			});

			const etiquetasSummary = screen.getByText(/Etiquetas/i);
			await fireEvent.click(etiquetasSummary);

			const header = container.querySelector('.group-header');
			expect(header).toBeInTheDocument();
			expect(header).toHaveClass('group-header');
			expect(header?.querySelector('input[type="checkbox"]')).toBeNull();
		});
	});

	describe('tag selection', () => {
		it('selects grouped tags from more than one group by clicking their visible labels', async () => {
			const cards = [
				buildAbilityCard('Fire Bolt', ['arcanista']),
				buildAbilityCard('Human Trait', ['humano']),
			];
			const onFiltersChange = vi.fn();

			render(CardsFilterHarness, {
				props: {
					cards,
					initialFilters: emptyFilters,
					cardType: 'ability',
					onFiltersChange,
				},
			});

			await openMultiSelect(/Etiquetas/i);
			await fireEvent.click(screen.getByText('Arcanista'));
			await fireEvent.click(screen.getByText('Humano'));

			expect(screen.getByLabelText('Arcanista')).toBeChecked();
			expect(screen.getByLabelText('Humano')).toBeChecked();
			expect(screen.getByText(/Etiquetas \(2\)/i)).toBeInTheDocument();
			expect(onFiltersChange).toHaveBeenLastCalledWith({
				...emptyFilters,
				tags: ['arcanista', 'humano'],
			});
		});

		it('leaves every grouped tag checkbox unchecked after the local multi-select clear', async () => {
			const cards = [
				buildAbilityCard('Fire Bolt', ['arcanista']),
				buildAbilityCard('Human Trait', ['humano']),
			];

			render(CardsFilterHarness, {
				props: {
					cards,
					initialFilters: emptyFilters,
					cardType: 'ability',
				},
			});

			const tagsMultiSelect = await openMultiSelect(/Etiquetas/i);
			await fireEvent.click(screen.getByText('Arcanista'));
			await fireEvent.click(screen.getByText('Humano'));
			expect(getCheckboxesIn(tagsMultiSelect).filter((checkbox) => checkbox.checked)).toHaveLength(
				2,
			);

			await fireEvent.click(within(tagsMultiSelect).getByRole('button', { name: 'Limpiar' }));

			expect(screen.getByText(/Etiquetas \(0\)/i)).toBeInTheDocument();
			expectEveryCheckboxUnchecked(tagsMultiSelect);
		});

		it('leaves every grouped tag checkbox unchecked after the global filters clear', async () => {
			const cards = [
				buildAbilityCard('Fire Bolt', ['arcanista']),
				buildAbilityCard('Human Trait', ['humano']),
			];

			render(CardsFilterHarness, {
				props: {
					cards,
					initialFilters: emptyFilters,
					cardType: 'ability',
				},
			});

			const tagsMultiSelect = await openMultiSelect(/Etiquetas/i);
			await fireEvent.click(screen.getByText('Arcanista'));
			await fireEvent.click(screen.getByText('Humano'));
			expect(getCheckboxesIn(tagsMultiSelect).filter((checkbox) => checkbox.checked)).toHaveLength(
				2,
			);

			await fireEvent.click(screen.getByRole('button', { name: 'Limpiar Filtros' }));

			expect(screen.getByText(/Etiquetas \(0\)/i)).toBeInTheDocument();
			expectEveryCheckboxUnchecked(tagsMultiSelect);
		});

		it('toggles only the clicked grouped tag option when clicking its visible label', async () => {
			const cards = [
				buildAbilityCard('Fire Bolt', ['arcanista']),
				buildAbilityCard('Human Trait', ['humano']),
				buildAbilityCard('Healing Word', ['curación']),
			];

			render(CardsFilterHarness, {
				props: {
					cards,
					initialFilters: emptyFilters,
					cardType: 'ability',
				},
			});

			const tagsMultiSelect = await openMultiSelect(/Etiquetas/i);

			await fireEvent.click(screen.getByText('Humano'));

			expect(screen.getByLabelText('Humano')).toBeChecked();
			expect(screen.getByLabelText('Arcanista')).not.toBeChecked();
			expect(screen.getByLabelText('Curación')).not.toBeChecked();
			expect(getCheckboxesIn(tagsMultiSelect).filter((checkbox) => checkbox.checked)).toHaveLength(
				1,
			);
		});

		it('uses implicit grouped tag labels without raw option ids', async () => {
			const cards = [
				buildAbilityCard('Fire Bolt', ['arcanista']),
				buildAbilityCard('Human Trait', ['humano']),
			];

			render(CardsFilter, {
				props: {
					cards,
					filters: { name: '', level: [], tags: [], type: '' },
					onFiltersChange,
					onResetFilters,
					cardType: 'ability',
				},
			});

			const tagsMultiSelect = await openMultiSelect(/Etiquetas/i);
			const labels = Array.from(tagsMultiSelect.querySelectorAll<HTMLLabelElement>('label'));

			expect(labels.map((label) => label.htmlFor)).toEqual(['', '']);
			expect(getCheckboxesIn(tagsMultiSelect).map((checkbox) => checkbox.id)).toEqual(['', '']);
		});

		it('calls onFiltersChange with lowercase tag value when a tag is selected', async () => {
			const cards = [buildAbilityCard('Fire Bolt', ['arcanista'])];

			render(CardsFilter, {
				props: {
					cards,
					filters: { name: '', level: [], tags: [], type: '' },
					onFiltersChange,
					onResetFilters,
					cardType: 'ability',
				},
			});

			const etiquetasSummary = screen.getByText(/Etiquetas/i);
			await fireEvent.click(etiquetasSummary);

			const checkbox = screen.getByLabelText('Arcanista');
			await fireEvent.click(checkbox);

			expect(onFiltersChange).toHaveBeenCalled();
			const lastCall = onFiltersChange.mock.lastCall?.[0];
			expect(lastCall.tags).toContain('arcanista');
		});

		it('clears selected tag checkbox visually from the local multi-select clear button', async () => {
			const cards = [buildAbilityCard('Fire Bolt', ['arcanista'])];

			render(CardsFilterHarness, {
				props: {
					cards,
					initialFilters: emptyFilters,
					cardType: 'ability',
				},
			});

			await fireEvent.click(screen.getByText(/Etiquetas/i));
			const checkbox = screen.getByLabelText('Arcanista') as HTMLInputElement;
			await fireEvent.click(checkbox);
			expect(checkbox).toBeChecked();

			await fireEvent.click(screen.getByRole('button', { name: 'Limpiar' }));

			expect(checkbox).not.toBeChecked();
		});

		it('clears selected tag checkbox visually from the global filters clear button', async () => {
			const cards = [buildAbilityCard('Fire Bolt', ['arcanista'])];

			render(CardsFilterHarness, {
				props: {
					cards,
					initialFilters: emptyFilters,
					cardType: 'ability',
				},
			});

			await fireEvent.click(screen.getByText(/Etiquetas/i));
			const checkbox = screen.getByLabelText('Arcanista') as HTMLInputElement;
			await fireEvent.click(checkbox);
			expect(checkbox).toBeChecked();

			await fireEvent.click(screen.getByRole('button', { name: 'Limpiar Filtros' }));

			expect(checkbox).not.toBeChecked();
		});

		it('stores capitalized displayed tags canonically and clears their visual selection', async () => {
			const cards = [buildAbilityCard('Fire Bolt', ['Arcanista'])];
			const onFiltersChange = vi.fn();

			render(CardsFilterHarness, {
				props: {
					cards,
					initialFilters: emptyFilters,
					cardType: 'ability',
					onFiltersChange,
				},
			});

			await fireEvent.click(screen.getByText(/Etiquetas/i));
			const checkbox = screen.getByLabelText('Arcanista') as HTMLInputElement;
			await fireEvent.click(checkbox);

			expect(onFiltersChange).toHaveBeenLastCalledWith({ ...emptyFilters, tags: ['arcanista'] });
			expect(checkbox).toBeChecked();

			await fireEvent.click(screen.getByRole('button', { name: 'Limpiar' }));

			expect(checkbox).not.toBeChecked();
		});

		it('emits a new filter object without mutating the previously received filters', async () => {
			const cards = [buildAbilityCard('Fire Bolt', ['arcanista'])];
			const receivedFilters = { name: '', level: [], tags: [], type: '' };

			render(CardsFilter, {
				props: {
					cards,
					filters: receivedFilters,
					onFiltersChange,
					onResetFilters,
					cardType: 'ability',
				},
			});

			await fireEvent.click(screen.getByText(/Etiquetas/i));
			await fireEvent.click(screen.getByLabelText('Arcanista'));

			expect(onFiltersChange).toHaveBeenCalledWith({ ...emptyFilters, tags: ['arcanista'] });
			expect(onFiltersChange.mock.lastCall?.[0]).not.toBe(receivedFilters);
			expect(receivedFilters).toEqual(emptyFilters);
		});
	});

	describe('levels multi-select', () => {
		it('remains flat without group headers', async () => {
			const cards = [
				buildAbilityCard('Card L1', ['arcanista']),
				buildAbilityCard('Card L2', ['arcanista']),
			];
			cards[1].level = 2;

			render(CardsFilter, {
				props: {
					cards,
					filters: { name: '', level: [], tags: [], type: '' },
					onFiltersChange,
					onResetFilters,
					cardType: 'ability',
				},
			});

			const nivelesSummary = screen.getByText(/Niveles/i);
			await fireEvent.click(nivelesSummary);

			expect(screen.getByLabelText('Nivel 1')).toBeInTheDocument();
			expect(screen.getByLabelText('Nivel 2')).toBeInTheDocument();
			expect(
				nivelesSummary.closest('.multi-select')?.querySelectorAll('.group-header').length,
			).toBe(0);
		});

		it('clears selected level checkbox visually from the global filters clear button', async () => {
			const cards = [
				buildAbilityCard('Card L1', ['arcanista']),
				buildAbilityCard('Card L2', ['arcanista']),
			];
			cards[1].level = 2;

			render(CardsFilterHarness, {
				props: {
					cards,
					initialFilters: emptyFilters,
					cardType: 'ability',
				},
			});

			await fireEvent.click(screen.getByText(/Niveles/i));
			const checkbox = screen.getByLabelText('Nivel 2') as HTMLInputElement;
			await fireEvent.click(checkbox);
			expect(checkbox).toBeChecked();

			await fireEvent.click(screen.getByRole('button', { name: 'Limpiar Filtros' }));

			expect(checkbox).not.toBeChecked();
		});
	});
});
