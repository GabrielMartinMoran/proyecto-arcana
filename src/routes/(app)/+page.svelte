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
			src="https://www.youtube.com/embed/0Tmonze4ALQ?modestbranding=1"
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
		<button class="character" onclick={() => goto(resolve('/characters/examples'))}
			>Ejemplos de personajes</button
		>
		<button class="cards" onclick={() => goto(resolve('/cards'))}>¡Veamos las cartas!</button>
		<button class="gm" onclick={() => goto(resolve('/gm'))}>¡Es hora de dirigir!</button>
	</div>
</main>

<style>
	main {
		display: flex;
		flex-direction: column;
		flex-grow: 1;
		justify-content: center;
		width: 100%;

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

			@media screen and (max-width: 860px) {
				background-size: 150%;
				background-position: 50% 51%;
			}

			@media screen and (max-width: 600px) {
				background-size: 260%;
				background-position: 50% 51%;

				p {
					margin-top: var(--spacing-xs);
				}
			}
		}
		.video-container {
			display: flex;
			flex-direction: column;
			align-items: center;
			gap: var(--spacing-md);

			iframe {
				aspect-ratio: 16/9;
				width: calc(max(60%, 400px));
			}
		}

		.ctas {
			display: flex;
			flex-direction: row;
			align-items: center;
			justify-content: space-evenly;
			gap: var(--spacing-md);
			flex: 1;
			padding-top: var(--spacing-md);
			flex-wrap: wrap;

			button {
				color: white;
				width: 200px;
				height: 75px;
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
			.cards {
				background-color: indianred;
			}
		}
	}
</style>
