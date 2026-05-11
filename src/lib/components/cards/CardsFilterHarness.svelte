<script lang="ts">
	import type { CardFilters } from '$lib/types/card-filters';
	import type { Card } from '$lib/types/cards/card';
	import CardsFilter from './CardsFilter.svelte';

	type Props = {
		cards: Card[];
		initialFilters: CardFilters;
		cardType: 'ability' | 'item';
		onFiltersChange?: (filters: CardFilters) => void;
		onResetFilters?: () => void;
		includeOnlyAvailablesFilter?: boolean;
	};

	let {
		cards,
		initialFilters,
		cardType,
		onFiltersChange = () => {},
		onResetFilters = () => {},
		includeOnlyAvailablesFilter = false,
	}: Props = $props();

	const cloneFilters = (filters: CardFilters): CardFilters => ({
		...filters,
		level: [...filters.level],
		tags: [...filters.tags],
	});

	const emptyFilters = (filters: CardFilters): CardFilters => ({
		name: '',
		level: [],
		tags: [],
		type: '',
		...(filters.onlyAvailables !== undefined ? { onlyAvailables: false } : {}),
	});

	class FilterHarnessState {
		current = $state<CardFilters>({ name: '', level: [], tags: [], type: '' });

		constructor(createInitialFilters: () => CardFilters) {
			this.current = createInitialFilters();
		}
	}

	const filterState = new FilterHarnessState(() => cloneFilters(initialFilters));

	const handleFiltersChange = (nextFilters: CardFilters) => {
		onFiltersChange(nextFilters);
		filterState.current = nextFilters;
	};

	const handleResetFilters = () => {
		onResetFilters();
		filterState.current = emptyFilters(filterState.current);
	};
</script>

<CardsFilter
	{cards}
	filters={filterState.current}
	{cardType}
	{includeOnlyAvailablesFilter}
	onFiltersChange={handleFiltersChange}
	onResetFilters={handleResetFilters}
/>
