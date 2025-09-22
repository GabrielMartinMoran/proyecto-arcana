<script lang="ts">
	import CardsList from '$lib/components/cards/CardsList.svelte';
	import { useCardsService } from '$lib/services/cards-service';
	import { onMount } from 'svelte';

	const { loadCards, cards } = useCardsService();

	onMount(async () => {
		await loadCards();
	});
</script>

<section>
	<h1>Galería de Cartas</h1>
	<CardsList cards={$cards} />
</section>
