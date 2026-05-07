import { describe, expect, it, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/svelte';
import type { Card } from '$lib/types/cards/card';

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
			// Scope query to the Niveles dropdown (the opened details element)
			const nivelesDetails = nivelesSummary.closest('details') as HTMLElement;
			expect(nivelesDetails.querySelectorAll('.group-header').length).toBe(0);
		});
	});
});
