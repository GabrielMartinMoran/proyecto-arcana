<script lang="ts">
	import Card from '$lib/components/cards/Card.svelte';
	import { useCardsService } from '$lib/services/cards-service';
	import { onMount } from 'svelte';

	const { loadCards, cards } = useCardsService();

	onMount(async () => {
		await loadCards();
	});
</script>

<section>
	<h1>Galería de Cartas</h1>
	<div class="cards">
		{#each $cards as card (card.id)}
			<Card {card} />
		{/each}
	</div>
</section>

<style>
	.cards {
		display: flex;
		flex-direction: row;
		flex-wrap: wrap;
		align-items: center;
		justify-content: center;
		width: 100%;
		gap: var(--spacing-md);
	}
</style>
