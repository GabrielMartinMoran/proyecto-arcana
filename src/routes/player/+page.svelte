<script>
	import MarkdownDoc from '$lib/components/MarkdownDoc.svelte';
</script>

<section>
	<h1>Manual del Jugador</h1>

	<MarkdownDoc src="/docs/player.md" />
</section>

<style>
	section {
		display: flex;
		flex-direction: column;
		gap: var(--spacing-md);
		flex-grow: 1;
		justify-content: center;
		width: 100%;
	}
</style>
