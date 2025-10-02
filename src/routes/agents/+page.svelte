<script lang="ts">
	import '../../app.css';

	let { data } = $props();

	const copyPromptToClipboard = async () => {
		try {
			await navigator.clipboard.writeText(data.prompt);
			alert('Prompt copiado al portapapeles');
		} catch (err) {
			console.error('Failed to copy text: ', err);
			alert('Error al copiar el prompt al portapapeles');
		}
	};
</script>

<main>
	<div class="header">
		<h1>Prompt de Dirección de Juego para ARCANA</h1>
		<button onclick={copyPromptToClipboard}>Copiar Prompt</button>
	</div>
	{@html data.prompt}
</main>

<style>
	main {
		display: flex;
		flex-direction: column;
		padding: var(--spacing-md);

		.header {
			display: flex;
			flex-direction: row;
			align-items: center;
			justify-content: space-between;
			width: 100%;
			flex-wrap: wrap;
		}
	}
	:global(pre) {
		background-color: lightgray;
		white-space: pre-wrap;
	}
</style>
