<script lang="ts">
	import { loadMarkdownDocument } from '$lib/services/doc-service';
	import { onMount } from 'svelte';

	type Props = { src: string };
	let { src }: Props = $props();

	let htmlContent = $state('');

	onMount(async () => {
		htmlContent = await loadMarkdownDocument(src);
	});
</script>

{@html htmlContent}
