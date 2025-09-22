<script lang="ts">
	import type { Snippet } from 'svelte';

	type Props = {
		title?: string;
		children?: Snippet;
		width?: string;
	};

	let { title = undefined, children, width = undefined }: Props = $props();
</script>

<div class="container" style:width>
	{#if title}
		<h2>{title}</h2>
	{/if}
	{@render children?.()}
</div>

<style>
	.container {
		border: 1px solid var(--border-color);
		padding: var(--spacing-md);
		border-radius: var(--radius-md);
		background-color: var(--secondary-bg);

		h2 {
			padding: 0;
			margin: 0;
			font-size: 1rem;
			color: var(--text-secondary);
			font-weight: 600;
		}
	}
</style>
