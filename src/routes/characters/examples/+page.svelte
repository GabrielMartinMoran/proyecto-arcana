<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { useCharactersService } from '$lib/services/characters-service';
	import { useFirebaseService } from '$lib/services/firebase-service';
	import { Character } from '$lib/types/character';
	import { onMount } from 'svelte';
	import CharactersPageLayout from '../CharactersPageLayout.svelte';

	let { exampleCharacters, loadExampleCharacters, characters, loadCharacters } =
		useCharactersService();

	const firebase = useFirebaseService();
	// Destructure only the stores we need for UI subscription
	const { user } = firebase;

	onMount(async () => {
		await Promise.all([loadExampleCharacters(), loadCharacters()]);
	});

	const onAddToMyCharacters = async (character: Character) => {
		const newCharacter = new Character({ ...character, id: crypto.randomUUID() });
		characters.update(() => [...$characters, newCharacter]);
		goto(resolve(`/characters?characterId=${newCharacter.id}`));
	};
</script>

<CharactersPageLayout
	readonly={true}
	allActionsDisabled={!$user}
	characters={exampleCharacters}
	{onAddToMyCharacters}
/>
