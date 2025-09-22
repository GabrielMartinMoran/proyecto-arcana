<script lang="ts">
	import favicon from '$lib/assets/favicon.svg';
	import NavBar from '$lib/components/NavBar.svelte';
	import '../app.css';

	let { children } = $props();
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

<main>
	<NavBar />
	<section class="content">
		{@render children?.()}
	</section>
</main>

<style>
	main {
		display: flex;
		flex-direction: row;
		align-items: center;
		justify-content: center;
		min-height: 100vh;
		padding: 2rem;
		height: 100%;
		width: 100%;
		padding: 0px;
		margin: 0px;

		.content {
			flex: 1;
			display: flex;
			flex-direction: column;
			align-items: left;
			justify-content: start;
			top: 0;
			height: 100%;
			width: 100%;
			padding: var(--spacing-lg);
			overflow-y: scroll;
		}
	}
</style>
