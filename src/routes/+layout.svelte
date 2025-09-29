<script lang="ts">
	import { resolve } from '$app/paths';
	import DiceBox from '$lib/components/DiceBox.svelte';
	import DicePanel from '$lib/components/DicePanel.svelte';
	import RollModal from '$lib/components/RollModal.svelte';
	import SideMenu from '$lib/components/SideMenu.svelte';
	import TopBar from '$lib/components/TopBar.svelte';
	import { useFirebaseService } from '$lib/services/firebase-service';
	import { dicePanelExpandedStore } from '$lib/stores/dice-panel-expanded-store';
	import { sideMenuExpandedStore } from '$lib/stores/side-menu-expanded-store';
	import { isMobileScreen } from '$lib/utils/screen-size-detector';
	import { onMount } from 'svelte';
	import '../app.css';

	let { children } = $props();

	let firebase = useFirebaseService();

	let isMobile = $state(isMobileScreen());
	let prevIsMobile = $state(isMobile);

	const onBodyClick = () => {
		sideMenuExpandedStore.set(false);
		dicePanelExpandedStore.set(false);
	};

	const onScreenReize = () => {
		const current = isMobileScreen();
		// Solo cerrar cuando realmente cambió el tipo de pantalla (desktop <-> mobile)
		if (current !== prevIsMobile) {
			isMobile = current;
			onBodyClick();
		} else {
			isMobile = current;
		}
		prevIsMobile = current;
	};

	onMount(async () => {
		// Initialize firebase (idempotent and safe if not configured)
		try {
			await firebase.initFirebase();
		} catch (err) {
			// Init is defensive; continue using local persistence if it fails
			console.warn('Firebase init error (continuing with local persistence):', err);
		}

		// Subscribe to auth state changes so the UI can react to sign-in/sign-out.
		try {
			// attach auth-state listener; the service updates its `user` store internally
			await firebase.onAuthState(() => {});
		} catch (err) {
			console.warn('Auth listener setup error (continuing without remote auth):', err);
		}
	});
</script>

<svelte:head>
	<link rel="icon" href={resolve('/logo.png')} />
</svelte:head>

<svelte:window on:resize={onScreenReize} />

<main>
	{#if isMobile}
		<TopBar />
	{/if}
	<div class="body" onclick={onBodyClick}>
		<DiceBox {isMobile} />
		<SideMenu {isMobile} />
		<section
			class="content"
			class:isMobile
			class:dicePanelExpanded={$dicePanelExpandedStore || !isMobile}
		>
			{@render children?.()}
		</section>
		<DicePanel {isMobile} />
		<RollModal />
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
		padding-left: calc(var(--side-bar-width) + var(--spacing-md));
		overflow-y: auto; /* scroll interno aquí, no en el documento */
		scrollbar-width: thin;

		&.dicePanelExpanded {
			padding-right: calc(var(--dice-panel-width) + var(--spacing-md));
		}

		&.isMobile {
			margin-top: var(--top-bar-height);
			padding-left: var(--spacing-lg);
			padding-right: var(--spacing-lg);
		}
	}
</style>
