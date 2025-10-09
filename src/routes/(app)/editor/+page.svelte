<script lang="ts">
	import { loadBestiaryAsMD } from '$lib/utils/agent-content-loaders/bestiary-loader.js';
	import {
		loadAbilityCardsAsMD,
		loadMagicalItemsCardsAsMD,
	} from '$lib/utils/agent-content-loaders/cards-loader.js';
	import { loadEditorBasePrompt } from '$lib/utils/agent-content-loaders/editor-prompt-loader';
	import { loadGMManual } from '$lib/utils/agent-content-loaders/gm-manual-loader.js';
	import { loadPlayerManual } from '$lib/utils/agent-content-loaders/player-manual-loader.js';
	import { onMount } from 'svelte';

	let prompt = $state('');

	const copyPromptToClipboard = async () => {
		try {
			await navigator.clipboard.writeText(prompt);
			alert('Prompt copiado al portapapeles');
		} catch (err) {
			console.error('Failed to copy text: ', err);
			alert('Error al copiar el prompt al portapapeles');
		}
	};

	const loadPrompt = async () => {
		const [basePrompt, playerManual, gmManual, bestiary, cardsList, magicalItems] =
			await Promise.all([
				loadEditorBasePrompt(),
				loadPlayerManual(),
				loadGMManual(),
				loadBestiaryAsMD(),
				loadAbilityCardsAsMD(),
				loadMagicalItemsCardsAsMD(),
			]);

		let doc = basePrompt;

		const replacement_variables = [
			{
				variable: 'player_manual',
				value: playerManual,
			},
			{
				variable: 'game_master_manual',
				value: gmManual,
			},
			{
				variable: 'bestiary',
				value: bestiary,
			},
			{
				variable: 'cards_list',
				value: cardsList,
			},
			{
				variable: 'magical_items',
				value: magicalItems,
			},
		];

		for (const x of replacement_variables) {
			doc = doc.replace(`{{${x.variable}}}`, x.value);
		}
		prompt = doc;
	};

	onMount(async () => await loadPrompt());
</script>

<section>
	<h1>IA como Editor del Sistema</h1>
	<p>
		A continuación hay un prompt que puede ser utilizado para mejorar el sistema a partir de
		interactuar con un agente de IA.
	</p>
	<p>
		Para utilizarlo, simplemente copia el prompt, pegalo en tu AI favorita, ¡y a mejorar Arcana!
	</p>

	<div class="prompt-header">
		<h2>Prompt</h2>
		<button onclick={copyPromptToClipboard}>Copiar Prompt</button>
	</div>
	<pre>{prompt}</pre>
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
