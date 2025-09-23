<script lang="ts">
	import favicon from '$lib/assets/favicon.svg';
	import DiceBox from '$lib/components/DiceBox.svelte';
	import SideMenu from '$lib/components/SideMenu.svelte';
	import TopBar from '$lib/components/TopBar.svelte';
	import { sideMenuExpandedStore } from '$lib/stores/side-menu-expanded-store';
	import '../app.css';
	import { CONFIG } from '../config';

	let { children } = $props();

	let isMobile = $derived(window.innerWidth < CONFIG.MOBILE_MAX_WIDTH);

	const onBodyClick = () => {
		sideMenuExpandedStore.set(false);
	};
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

<svelte:window on:resize={() => (isMobile = window.innerWidth <= CONFIG.MOBILE_MAX_WIDTH)} />

<main>
	{#if isMobile}
		<TopBar />
	{/if}
	<div class="body" onclick={onBodyClick}>
		<DiceBox />
		<SideMenu {isMobile} />
		<section class="content" class:isMobile>
			{@render children?.()}
		</section>
	</div>
</main>

<style>
	main {
		display: flex;
		flex-direction: column;
		width: 100%;
		min-height: 100vh; /* asegurar mínimo igual a viewport */
		height: 100vh; /* que main ocupe exactamente la ventana */
	}

	.body {
		display: flex;
		flex-direction: row;
		align-items: stretch; /* que los hijos llenen verticalmente */
		justify-content: center;
		flex: 1; /* ocupar el espacio restante bajo el TopBar */
		width: 100%;
		padding: 0;
		margin: 0;
	}

	.content {
		flex: 1;
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		justify-content: flex-start;
		min-height: 0; /* IMPORTANTE: permite que el contenido pueda hacer scroll dentro del flex */
		width: 100%;
		padding: var(--spacing-lg);
		padding-left: calc(var(--side-bar-width) + var(--spacing-lg));
		overflow-y: auto; /* scroll interno aquí, no en el documento */

		&.isMobile {
			margin-top: var(--top-bar-height);
			padding-left: var(--spacing-lg);
		}
	}
</style>
