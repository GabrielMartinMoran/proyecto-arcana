<script lang="ts">
	import InteractibleList, { type InteractibleListProps } from './InteractibleList.svelte';
</script>

<div class="navigable-with-list">
	<InteractibleList><slot name="buttons"></slot></InteractibleList>
	<slot name="viewport"></slot>
</div>

<style>
	.navigable-with-list {
		display: flex;
		flex-direction: row;
		height: 100%;
		width: 100%;
		gap: var(--spacing-md);
	}
</style>
