<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { dicePanelExpandedStore } from '$lib/stores/dice-panel-expanded-store';
	import { sideMenuExpandedStore } from '$lib/stores/side-menu-expanded-store';

	type Props = {
		isMobile: boolean;
	};

	let { isMobile }: Props = $props();

	let path = $derived(page.url.pathname);

	const routes = [
		{
			path: '/',
			label: '🚩 Inicio',
		},
		{
			path: '/player',
			label: '📙 Manual del Jugador',
		},
		{
			path: '/gm',
			label: '📓 Manual del DJ',
		},
		{
			path: '/cards',
			label: '🃏 Galería de Cartas',
		},
		{
			path: '/bestiary',
			label: '🐦‍🔥 Bestiario',
		},
		{
			path: '/characters',
			label: '🎭  Personajes',
		},
		{
			path: '/characters/examples',
			label: '💡 PJs de Ejemplo',
		},
	];

	const navigateRoute = (event: MouseEvent, path: string) => {
		event.preventDefault();
		goto(path);
		sideMenuExpandedStore.set(false);
	};

	const onBodyClick = (event: MouseEvent) => {
		event.stopPropagation();
		dicePanelExpandedStore.set(false);
	};
</script>

<nav
	class:mobile={isMobile}
	class:collapsed={isMobile && !$sideMenuExpandedStore}
	onclick={onBodyClick}
>
	{#if !isMobile}
		<h1>Arcana</h1>
	{/if}
	{#each routes as route (route.path)}
		<a
			href={route.path}
			class:active={path === route.path}
			onclick={(event) => navigateRoute(event, route.path)}>{route.label}</a
		>
	{/each}
</nav>

<style>
	nav {
		position: fixed;
		left: 0;
		display: flex;
		flex-direction: column;
		height: 100%;
		width: var(--side-bar-width);
		z-index: 1000;
		border-right: 1px solid var(--border-color);
		background-color: var(--secondary-bg);
		box-shadow: var(--shadow-sm);

		&.mobile {
			position: fixed;
			top: var(--top-bar-height);
			left: 0;
			bottom: 0;
			width: var(--side-bar-width);
			overflow-y: auto;
			transition: transform 0.3s ease-in-out;
		}

		&.collapsed {
			display: none;
		}

		h1 {
			margin-left: var(--spacing-md);
		}

		a {
			display: flex;
			align-items: center;
			padding: var(--spacing-md);
			height: 60px;
			border-left: 4px solid transparent;
			color: var(--text-primary);

			&.active {
				background: var(--selected-bg);
				border-left: 4px solid var(--selected-border);
			}

			&:visited {
				color: var(--text-primary);
			}
		}
	}
</style>
