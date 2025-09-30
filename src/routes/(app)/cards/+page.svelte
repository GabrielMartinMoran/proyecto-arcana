<script lang="ts">
	import CardsFilter from '$lib/components/cards/CardsFilter.svelte';
	import CardsList from '$lib/components/cards/CardsList.svelte';
	import { useCardsService } from '$lib/services/cards-service';
	import type { Card } from '$lib/types/card';
	import { onMount } from 'svelte';

	const { loadCards, cards: cardsStore } = useCardsService();

	onMount(async () => {
		await loadCards();
	});

	let cards = $derived($cardsStore);

	const onCardFilter = (results: Card[]) => {
		cards = results;
	};
</script>

<section>
	<h1>Galería de Cartas</h1>
	<CardsFilter cards={$cardsStore} onFilter={onCardFilter} />
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
