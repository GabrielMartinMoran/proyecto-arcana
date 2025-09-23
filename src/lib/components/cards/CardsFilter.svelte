<script lang="ts">
	import type { Card } from '$lib/types/card';
	import { removeDiacritics } from '$lib/utils/formatting';
	import Container from '../ui/Container.svelte';
	import MultiSelect from '../ui/MultiSelect.svelte';

	type Props = {
		cards: Card[];
		onFilter: (results: Card[]) => void;
	};

	let { cards, onFilter }: Props = $props();

	type Filters = {
		name: string;
		level: number[];
		tags: string[];
	};

	const buildEmptyFilters = () => ({
		name: '',
		level: [],
		tags: [],
	});

	let filters: Filters = $state(buildEmptyFilters());

	const onFilterChange = () => {
		const results = cards.filter((card) => {
			return (
				removeDiacritics(card.name.toLowerCase()).includes(
					removeDiacritics(filters.name.toLowerCase()),
				) &&
				(filters.level.length === 0 || filters.level.includes(card.level)) &&
				(filters.tags.length === 0 || filters.tags.every((tag) => card.tags.includes(tag)))
			);
		});
		onFilter(results);
	};

	const resetFilters = () => {
		filters = buildEmptyFilters();
		onFilterChange();
	};

	const getAvailableLevels = () => {
		const levels = new Set(cards.map((card) => card.level));
		return Array.from(levels).sort((a, b) => a - b);
	};

	const getAvailableTags = () => {
		const tags = new Set(cards.flatMap((card) => card.tags));
		return Array.from(tags).sort();
	};
</script>

<Container>
	<div class="filters">
		<input
			type="text"
			placeholder="Filtrar por nombre"
			bind:value={filters.name}
			oninput={() => onFilterChange()}
		/>
		<MultiSelect
			summary="Filtrar por Nivel"
			options={getAvailableLevels().map((x) => ({ value: x, label: `Nivel ${x}` }))}
			onChange={(values: any[]) => {
				filters.level = values;
				onFilterChange();
			}}
		/>
		<MultiSelect
			summary="Filtrar por Etiqueta"
			options={getAvailableTags().map((x) => ({ value: x, label: x }))}
			onChange={(values: any[]) => {
				filters.tags = values;
				onFilterChange();
			}}
		/>
		<button onclick={resetFilters}>Limpiar Filtros</button>
	</div>
</Container>

<style>
	.filters {
		display: flex;
		flex-direction: row;
		gap: var(--spacing-md);
		flex-grow: 1;

		input {
			flex: 1;
		}
	}
</style>
