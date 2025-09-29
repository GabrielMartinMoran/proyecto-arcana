<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { createCharacter } from '$lib/factories/character-factory';
	import { useCharactersService } from '$lib/services/characters-service';
	import { useFirebaseService } from '$lib/services/firebase-service';
	import { Character } from '$lib/types/character';
	import { onDestroy } from 'svelte';
	import { get } from 'svelte/store';
	import CharactersPageLayout from './CharactersPageLayout.svelte';

	// Characters service (now cloud-aware)
	let { characters, loadCharacters, deleteCharacter } = useCharactersService();
	const firebase = useFirebaseService();
	// Destructure only the stores we need for UI subscription
	const { user, firebaseReady } = firebase;

	const onUserChange = async () => {
		if (!get(firebaseReady)) return;
		if (!get(user)) {
			goto(resolve('/'));
			return;
		}
		await loadCharacters();
	};

	const unsubscribeFromUser = user.subscribe(async () => await onUserChange());
	const unsubscribeFromFirebaseReady = firebaseReady.subscribe(async (firebaseReady) => {
		if (!firebaseReady) return;
		setTimeout(() => {
			onUserChange();
		}, 500);
	});

	onDestroy(() => {
		unsubscribeFromUser();
		unsubscribeFromFirebaseReady();
	});

	const onCreateCharacter = async () => {
		const character = createCharacter();
		// Use the store's value to append the new character
		characters.update(() => [...$characters, character]);
		return character;
	};

	const onImportCharacter = (): Promise<Character> =>
		new Promise((resolve) => {
			const input = document.createElement('input');
			input.type = 'file';
			input.accept = '.json';
			input.onchange = async () => {
				if (!input.files || input.files.length === 0) return;
				const file = input.files[0];
				const reader = new FileReader();
				reader.onload = async (event) => {
					const data = JSON.parse(event.target?.result as any);
					const character = new Character({ ...data, id: crypto.randomUUID() });
					characters.update((characters) => [...characters, character]);
					resolve(character);
				};
				reader.readAsText(file);
			};
			document.body.appendChild(input);
			input.click();
			document.body.removeChild(input);
		});

	const onExportCharacter = async (character: Character) => {
		const blob = new Blob([JSON.stringify(character)], { type: 'application/json' });
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = `${character.name}.json`;
		document.body.appendChild(a);
		a.click();
		document.body.removeChild(a);
		URL.revokeObjectURL(url);
	};

	const onDeleteCharacter = async (character: Character) => {
		try {
			// Delegate deletion to the characters service (it updates local store and syncs with Firestore)
			await deleteCharacter(character.id);
		} catch (err) {
			console.error('Error deleting character:', err);
			// Fallback: remove locally so UI reflects deletion even if cloud sync failed
			characters.update((characters) => characters.filter((c) => c.id !== character.id));
		}
	};
</script>

<CharactersPageLayout
	readonly={false}
	allActionsDisabled={!$user}
	{characters}
	{onCreateCharacter}
	{onImportCharacter}
	{onExportCharacter}
	{onDeleteCharacter}
/>
