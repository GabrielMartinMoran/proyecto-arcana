<script>
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';

	let path = $derived($page.url.pathname);

	const routes = [
		{
			path: '/',
			label: '✨ Inicio',
		},
		{
			path: '/player',
			label: '🕹️ Manual del Jugador',
		},
		{
			path: '/cards',
			label: '🃏 Galería de Cartas',
		},
		{
			path: '/gm',
			label: '👨‍⚖️ Manual del Director de Juego',
		},
		{
			path: '/bestiary',
			label: '🐉 Bestiario',
		},
		{
			path: '/characters',
			label: '🧙‍♂️ Personajes',
		},
	];
</script>

<nav>
	<h1>Arcana</h1>
	{#each routes as route (route.path)}
		<a
			href={route.path}
			class:active={path === route.path}
			on:click|preventDefault={() => goto(route.path)}>{route.label}</a
		>
	{/each}
</nav>

<style>
	nav {
		display: flex;
		flex-direction: column;
		height: 100%;
		width: 300px;
		z-index: 1000;
		gap: var(--spacing-md);
		border-right: 1px solid var(--border-color);

		a {
			display: flex;
			align-items: center;
			padding: var(--spacing-md);
			height: 60px;
			border-left: 4px solid transparent;

			&.active {
				background: var(--selected-bg);
				border-left: 4px solid var(--selected-border);
			}
		}
	}
</style>
