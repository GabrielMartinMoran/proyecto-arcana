<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { useCharactersService } from '$lib/services/characters-service';
	import { Character } from '$lib/types/character';
	import { onMount } from 'svelte';
	import CharactersPageLayout from '../characters-page-layout.svelte';

	let { exampleCharacters, loadExampleCharacters, characters, loadCharacters } =
		useCharactersService();

	onMount(async () => {
		await Promise.all([loadExampleCharacters(), loadCharacters()]);
	});

	const onAddToMyCharacters = async (character: Character) => {
		const newCharacter = new Character({ ...character, id: crypto.randomUUID() });
		characters.update(() => [...$characters, newCharacter]);
		goto(resolve(`/characters?characterId=${newCharacter.id}`));
	};
</script>

<CharactersPageLayout readonly={true} characters={exampleCharacters} {onAddToMyCharacters} />
