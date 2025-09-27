<script lang="ts">
	import { replaceState } from '$app/navigation';
	import { page } from '$app/state';
	import type { Card } from '$lib/types/card';
	import { capitalize, removeDiacritics } from '$lib/utils/formatting';
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
		type: string;
	};

	const buildEmptyFilters = () => ({
		name: '',
		level: [],
		tags: [],
		type: '',
	});

	const buildFiltersFromURL = () => {
		const name = page.url.searchParams.get('name') ?? '';
		const level = page.url.searchParams
			.getAll('level')
			.filter((tag) => tag !== '')
			.map(Number)
			.filter((x) => x > 0);
		const tags = page.url.searchParams.getAll('tags').filter((tag) => tag !== '');
		const type = page.url.searchParams.get('type') ?? '';

		return {
			name,
			level,
			tags,
			type,
		};
	};

	const updateURLFilters = () => {
		if (filters.name) {
			page.url.searchParams.set('name', filters.name);
		} else {
			page.url.searchParams.delete('name');
		}

		if (filters.level.length === 0) {
			page.url.searchParams.delete('level');
		} else {
			page.url.searchParams.set('level', filters.level.join(','));
		}

		if (filters.tags.length === 0) {
			page.url.searchParams.delete('tags');
		} else {
			page.url.searchParams.set('tags', filters.tags.join(','));
		}

		if (!filters.type) {
			page.url.searchParams.delete('type');
		} else {
			page.url.searchParams.set('type', filters.type);
		}

		const queryParams = page.url.searchParams.toString();

		const newUrl = `${page.url.pathname}${queryParams ? `?${queryParams}` : ''}`;
		replaceState(newUrl, {});
	};

	let filters: Filters = $derived(buildFiltersFromURL());

	const onFilterChange = () => {
		const results = cards.filter((card) => {
			return (
				removeDiacritics(card.name.toLowerCase()).includes(
					removeDiacritics(filters.name.toLowerCase()),
				) &&
				(filters.level.length === 0 || filters.level.includes(card.level)) &&
				(filters.tags.length === 0 || filters.tags.every((tag) => card.tags.includes(tag))) &&
				(!filters.type || filters.type === card.type)
			);
		});
		onFilter(results);
		updateURLFilters();
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

	const getAvailableTypes = () => {
		const types = new Set(cards.map((card) => card.type));
		return Array.from(types).sort();
	};
</script>

<Container>
	<div class="filters">
		<input
			type="text"
			placeholder="Buscar por nombre"
			bind:value={filters.name}
			oninput={() => onFilterChange()}
		/>
		<select
			onchange={(event) => {
				filters.type = (event.target as HTMLSelectElement).value;
				onFilterChange();
			}}
		>
			<option value="">Todos los Tipos</option>
			{#each getAvailableTypes() as type (type)}
				<option value={type}>{capitalize(type)}</option>
			{/each}
		</select>
		<MultiSelect
			summary="Niveles"
			options={getAvailableLevels().map((x) => ({ value: x, label: `Nivel ${x}` }))}
			value={filters.level}
			onChange={(values: any[]) => {
				filters.level = values;
				onFilterChange();
			}}
		/>
		<MultiSelect
			summary="Etiquetas"
			options={getAvailableTags().map((x) => ({ value: x, label: x }))}
			value={filters.tags}
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
		justify-content: space-evenly;
		align-items: center;
		gap: var(--spacing-md);
		flex-grow: 1;
		flex-wrap: wrap;

		input {
			flex: 1;
			min-width: 300px;
		}

		select {
			width: 200px;
			padding: var(--spacing-sm);
		}
	}
</style>
