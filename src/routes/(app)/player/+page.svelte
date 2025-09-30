<script>
	import MarkdownDoc from '$lib/components/MarkdownDoc.svelte';
	import { CONFIG } from '../../../config';
</script>

<section>
	<h1>Manual del Jugador</h1>

	<MarkdownDoc src={CONFIG.PLAYER_MANUAL_PATH} />
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
