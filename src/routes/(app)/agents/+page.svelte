<script lang="ts">
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

<section>
	<h1>IA como Director de Juego</h1>
	<p>
		A continuación hay un prompt que puede ser utilizado para probar Arcana utilizado a una AI como
		Director de Juego.
	</p>
	<p>
		Para utilizarla, simplemente copia el prompt, pegalo en tu AI favorita y ¡a disfrutar del juego!
	</p>

	<div class="prompt-header">
		<h2>Prompt</h2>
		<button onclick={copyPromptToClipboard}>Copiar Prompt</button>
	</div>
	<pre>{data.prompt}</pre>
</section>

<style>
	section {
		display: flex;
		flex-direction: column;
		padding: var(--spacing-md);

		.prompt-header {
			display: flex;
			flex-direction: row;
			align-items: center;
			justify-content: space-between;
			width: 100%;
			flex-wrap: wrap;
		}

		pre {
			white-space: pre-wrap;
			border: 1px solid var(--border-color);
			border-radius: var(--radius-md);
			background-color: var(--disabled-bg);
			padding: var(--spacing-sm);
		}
	}
	:global(pre) {
		background-color: lightgray;
		white-space: pre-wrap;
	}
</style>
