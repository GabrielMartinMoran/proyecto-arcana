<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
</script>

<main>
	<div class="hero">
		<h1 class="hero-title">ARCANA: historias épicas, reglas sencillas</h1>
		<p class="hero-subtitle">
			Aprende en minutos, personaliza con cartas y juega en cualquier mundo.
		</p>
	</div>

	<h2>Un vistazo rápido</h2>
	<div class="video-container">
		<iframe
			src="https://www.youtube.com/embed/EhnoY3QU7vM?modestbranding=1"
			width="560"
			height="315"
			title="Arcana - Guía Rápida"
			frameborder="0"
			allowfullscreen
		></iframe>
	</div>

	<h2>¿Qué es Arcana?</h2>
	<p class="lead">
		Arcana es un sistema de rol de mesa diseñado para ser simple, adaptable y centrado en la
		narrativa. Es una caja de herramientas creada para directores de juego y jugadores que buscan la
		libertad de contar sus propias historias, en cualquier universo imaginable, sin verse frenados
		por reglas complejas. Si valoras la narrativa, la personalización profunda y un sistema que se
		aparta para dejar brillar tus ideas, Arcana es para ti.
	</p>

	<p class="lead">
		En el corazón de Arcana se encuentra un innovador sistema de cartas coleccionables. Aquí, tus
		habilidades, conjuros, talentos y rasgos de linaje no están encerrados en una clase, sino que
		son cartas que coleccionas y combinas para crear un héroe verdaderamente único.
	</p>

	<p class="lead">
		Arcana no es solo un conjunto de reglas, es un lienzo en blanco para tus crónicas. Reúne a tus
		amigos, baraja tus habilidades y prepárate para forjar tu propia leyenda.
	</p>

	<h2>¡Ahora si, comencemos!</h2>

	<div class="ctas">
		<button class="player" onclick={() => goto(resolve('/player'))}>Iniciando como jugador</button>
		<button class="character" onclick={() => goto(resolve('/characters'))}
			>¡A crear un personaje!</button
		>
		<button class="gm" onclick={() => goto(resolve('/gm'))}>¡Es hora de dirigir!</button>
	</div>
</main>

<style>
	main {
		display: flex;
		flex-direction: column;

		.hero {
			display: flex;
			flex-direction: column;
			align-items: center;
			justify-content: center;
			color: white;
			background-image: url('https://i.imgur.com/KTbGjxQ.png');
			background-size: cover;
			background-position: 0% 51%;
			border: 1px solid var(--border-color);
			border-radius: var(--radius-md);
			padding: clamp(1rem, 3vw, 2rem);
			box-shadow: var(--shadow-md);
			text-align: center;
			height: 250px;
		}
		.video-container {
			display: flex;
			flex-direction: column;
			align-items: center;
			gap: var(--spacing-md);
		}

		.ctas {
			display: flex;
			flex-direction: row;
			align-items: center;
			justify-content: space-evenly;
			gap: var(--spacing-md);
			flex: 1;
			padding-top: var(--spacing-md);

			button {
				color: white;
			}

			.player {
				background-color: steelblue;
			}
			.character {
				background-color: mediumseagreen;
			}
			.gm {
				background-color: mediumpurple;
			}
		}
	}
</style>
