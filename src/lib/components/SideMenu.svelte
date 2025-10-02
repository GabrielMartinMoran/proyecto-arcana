<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import { useFirebaseService } from '$lib/services/firebase-service';
	import { dicePanelExpandedStore } from '$lib/stores/dice-panel-expanded-store';
	import { sideMenuExpandedStore } from '$lib/stores/side-menu-expanded-store';

	type Props = {
		isMobile: boolean;
	};

	let { isMobile }: Props = $props();

	const firebase = useFirebaseService();
	const { firebaseReady, user } = firebase;

	let path = $derived(page.url.pathname);

	const PUBLIC_ROUTES = [
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
			path: '/magical-items',
			label: '🔮 Objetos Mágicos',
		},
		{
			path: '/characters/examples',
			label: '💡 PJs de Ejemplo',
		},
		{
			path: '/agents',
			label: '🤖 IA como DJ',
		},
	];

	const PRIVATE_ROUTES = [
		{
			path: '/characters',
			label: '🎭 Mis Personajes',
		},
	];

	const navigateRoute = (event: MouseEvent, path: string) => {
		event.preventDefault();
		goto(resolve(path));
		sideMenuExpandedStore.set(false);
	};

	const onBodyClick = (event: MouseEvent) => {
		event.stopPropagation();
		dicePanelExpandedStore.set(false);
	};

	const onSignIn = async () => {
		try {
			await firebase.signInWithGoogle();
		} catch (err) {
			console.error('Sign in failed', err);
			alert('Error al iniciar sesión con Google');
		}
	};

	const onSignOut = async () => {
		try {
			await firebase.signOutUser();
		} catch (err) {
			console.error('Sign out failed', err);
		}
	};
</script>

<nav
	class:mobile={isMobile}
	class:collapsed={isMobile && !$sideMenuExpandedStore}
	onclick={onBodyClick}
>
	{#if !isMobile}
		<div class="header">
			<h1>Arcana</h1>
		</div>
	{/if}

	<div class="public-routes">
		{#each PUBLIC_ROUTES as route (route.path)}
			<a
				href={route.path}
				class:active={path === route.path}
				onclick={(event) => navigateRoute(event, route.path)}>{route.label}</a
			>
		{/each}
	</div>

	{#if $user}
		<div class="private-routes">
			{#each PRIVATE_ROUTES as route (route.path)}
				<a
					href={route.path}
					class:active={path === route.path}
					onclick={(event) => navigateRoute(event, route.path)}>{route.label}</a
				>
			{/each}
		</div>
	{/if}

	<span class="spacer"></span>

	{#if $firebaseReady}
		<div class="user-container">
			{#if $user}
				{#if $user.photoURL}
					<img
						referrerPolicy="no-referrer"
						src={$user.photoURL}
						alt="user"
						style="width:2rem;height:2rem;border-radius:50%;"
					/>
				{/if}
				<span style="font-weight:600;">{$user.displayName ?? 'Cuenta'}</span>
				<button onclick={onSignOut} title="Cerrar sesión">➜]</button>
			{:else}
				<button class="google-login-btn" onclick={onSignIn} title="Iniciar sesión con Google">
					<img
						src="https://upload.wikimedia.org/wikipedia/commons/c/c1/Google_%22G%22_logo.svg"
						alt="Google Logo"
					/>Iniciar sesión con Google
				</button>
			{/if}
		</div>
	{/if}
</nav>

<style>
	.header {
		display: flex;
		flex-direction: row;
		justify-content: center;
		align-items: center;
		width: 100%;
		border-bottom: 1px solid var(--border-color);
		padding-bottom: var(--spacing-md);
		margin-bottom: var(--spacing-sm);

		h1 {
			margin: 0;
			margin-top: var(--spacing-md);
			font-size: 2.4rem;
		}
	}

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
			height: calc(100% - var(--top-bar-height));
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

		.public-routes {
			display: flex;
			flex-direction: column;
		}

		.private-routes {
			display: flex;
			flex-direction: column;
			border-top: 1px solid var(--border-color);
			margin-top: var(--spacing-sm);
			padding-top: var(--spacing-sm);
		}

		.spacer {
			flex-grow: 1;
		}

		.user-container {
			display: flex;
			flex-direction: row;
			align-items: center;
			justify-content: space-between;
			gap: var(--spacing-sm);
			padding: var(--spacing-md);
			border-top: 1px solid var(--border-color);

			.google-login-btn {
				display: flex;
				flex-direction: row;
				justify-content: center;
				align-items: center;
				img {
					width: 24px;
					height: 24px;
					margin-right: var(--spacing-sm);
				}
			}
		}

		a {
			display: flex;
			align-items: center;
			padding: var(--spacing-sm);
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

			&.disabled {
				background-color: var(--disabled-color);
				cursor: not-allowed;
			}
		}
	}
</style>
