<script lang="ts">
	import type { SvelteComponent } from 'svelte';

	export type InteractibleListProps = {
		elements: {
			component: SvelteComponent;
			onClick: () => void;
		}[];
	};

	let { elements }: InteractibleListProps = $props();
</script>

<div class="interactible-list">
	<div class="header">
		{@render buttons}
	</div>
	<div class="content">
		{#each elements as { component, onClick } (component.toString())}
			<component on:click={onClick} />
		{/each}
	</div>
</div>

<style>
	.interactible-list {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 1rem;

		.header {
		}

		.content {
		}
	}
</style>
