<script lang="ts">
	import Statblock from '$lib/components/statblock/Statblock.svelte';
	import { useCreaturesService } from '$lib/services/creatures-service';
	import { onMount } from 'svelte';

	const { loadCreatures, creatures } = useCreaturesService();

	onMount(async () => {
		await loadCreatures();
	});
</script>

<section>
	<h1>Bestiario</h1>
	<div class="statblock-list">
		{#each $creatures as creature (creature.id)}
			<Statblock {creature} />
		{/each}
	</div>
</section>

<style>
	section {
		display: flex;
		flex-direction: column;
		gap: var(--spacing-md);
		flex-grow: 1;
		justify-content: center;
		width: 100%;

		.statblock-list {
			display: flex;
			flex-direction: column;
			gap: var(--spacing-lg);
		}
	}
</style>
