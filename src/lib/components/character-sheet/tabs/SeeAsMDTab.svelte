<script lang="ts">
	import Container from '$lib/components/ui/Container.svelte';
	import { useCardsService } from '$lib/services/cards-service';
	import type { Card } from '$lib/types/cards/card';
	import { Character } from '$lib/types/character';
	import { serializeCharacterAsMD } from '$lib/utils/serializers/character-serializer';
	import { onMount } from 'svelte';
	import { get } from 'svelte/store';

	type Props = {
		character: Character;
	};

	let { character }: Props = $props();

	let allCards: Card[] = $state([]);

	let {
		loadAbilityCards,
		abilityCards: abilityCardsStore,
		loadItemCards,
		itemCards: itemCardsStore,
	} = useCardsService();

	let characterMD = $derived(serializeCharacterAsMD(character, allCards));

	onMount(async () => {
		await Promise.all([loadItemCards(), loadAbilityCards()]);
		allCards = [...get(itemCardsStore), ...get(abilityCardsStore)];
	});

	const copyMarkdown = async () => {
		try {
			await navigator.clipboard.writeText(characterMD);
			alert('Personaje en formato Markdown copiado al portapapeles!');
		} catch (err) {
			console.error('Failed to copy text: ', err);
			alert('Error al copiar el markdown al portapapeles');
		}
	};
</script>

<Container>
	<div class="header">
		<label>Personaje</label>
		<button onclick={copyMarkdown}>Copiar Markdown</button>
	</div>
	<pre>{characterMD}</pre>
</Container>

<style>
	.header {
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
	}
</style>
