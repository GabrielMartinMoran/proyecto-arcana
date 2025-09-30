<script>
	import { resolve } from '$app/paths';

	let { data } = $props();
</script>

{@html data.prompt}

<h2>Enlaces a la Documentación</h2>

<ul>
	<li>
		<a href={resolve('/agents/player')}>Manual del Jugador</a>
	</li>
	<li>
		<a href={resolve('/agents/gm')}>Manual del Director de Juego</a>
	</li>
	<li>
		<a href={resolve('/agents/bestiary')}>Bestiario</a>
	</li>
	<li>
		<a href={resolve('/agents/cards')}>Listado de Cartas</a>
	</li>
</ul>
