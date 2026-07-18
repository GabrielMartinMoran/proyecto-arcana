<script lang="ts">
	import { tick } from 'svelte';
	import ManualIndexFab from '$lib/components/ManualIndexFab.svelte';
	import { loadMarkdownDocument, type MarkdownHeading } from '$lib/services/doc-service';

	type Props = {
		src: string;
		manualNavTitle?: string;
	};

	let { src, manualNavTitle = undefined }: Props = $props();

	let htmlContent = $state('');
	let headings: MarkdownHeading[] = $state([]);

	const restoreHashAnchor = async () => {
		const hash = window.location.hash.slice(1);
		if (!hash) return;
		await tick();
		const target = document.getElementById(hash);
		if (target) {
			target.scrollIntoView({ behavior: 'auto', block: 'start' });
		}
	};

	$effect(() => {
		let cancelled = false;
		(async () => {
			const doc = await loadMarkdownDocument(src);
			if (cancelled) return;
			htmlContent = doc.html;
			headings = doc.headings;
			await restoreHashAnchor();
		})();
		return () => {
			cancelled = true;
		};
	});
</script>

<div class="markdown-doc">
	{@html htmlContent}
</div>

{#if manualNavTitle}
	<ManualIndexFab {headings} title="Índice" />
{/if}

<style>
	.markdown-doc {
		display: flex;
		flex-direction: column;
		flex: 1;
	}

	:global(.markdown-doc h1),
	:global(.markdown-doc h2),
	:global(.markdown-doc h3),
	:global(.markdown-doc h4),
	:global(.markdown-doc h5),
	:global(.markdown-doc h6) {
		scroll-margin-top: calc(var(--top-bar-height) + var(--spacing-md));
	}
</style>
