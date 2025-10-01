<script lang="ts">
	import CardsFilter from '$lib/components/cards/CardsFilter.svelte';
	import CardsList from '$lib/components/cards/CardsList.svelte';
	import { useCardFiltersService } from '$lib/services/cards-filter-service';
	import { useCardsService } from '$lib/services/cards-service';
	import type { CardFilters } from '$lib/types/card-filters';
	import { filterCards } from '$lib/utils/card-filtering';
	import { onDestroy, onMount } from 'svelte';
	import { get } from 'svelte/store';

	const { loadItemCards, itemCards: cardsStore } = useCardsService();

	const { buildEmptyFilters, getFiltersFromURL, updateURLFilters } = useCardFiltersService();

	let filters: CardFilters = $state(getFiltersFromURL());

	let cards = $derived(filterCards(get(cardsStore), filters));

	onMount(async () => {
		await loadItemCards();
	});

	const unsubscribe = cardsStore.subscribe(() => {
		cards = filterCards(get(cardsStore), filters);
	});

	onDestroy(() => {
		unsubscribe();
	});

	const onFiltersChange = (newFilters: CardFilters) => {
		filters = newFilters;
		cards = filterCards(get(cardsStore), filters);
		updateURLFilters(filters);
	};

	const onResetFilters = () => {
		onFiltersChange(buildEmptyFilters());
	};
</script>

<section>
	<h1>Objetos Mágicos</h1>
	<CardsFilter cards={$cardsStore} {onFiltersChange} {onResetFilters} {filters} />
	<CardsList {cards} />
</section>

<style>
	section {
		display: flex;
		flex-direction: column;
		gap: var(--spacing-md);
		width: 100%;
	}
</style>
