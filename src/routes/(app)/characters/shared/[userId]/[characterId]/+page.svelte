<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import CharacterSheet from '$lib/components/character-sheet/CharacterSheet.svelte';
	import { useCharactersService } from '$lib/services/characters-service';
	import { useFirebaseService } from '$lib/services/firebase-service';
	import { Character } from '$lib/types/character';
	import { onDestroy, onMount } from 'svelte';

	// Route params
	let userId: string = $derived(page.params.userId);
	let characterId: string = $derived(page.params.characterId);

	// Tab handling (default to 'general' to avoid deep imports)
	let currentTab: string = $derived(page.url.searchParams.get('tab') ?? 'general');
	const onTabChange = (tab: string) => {
		page.url.searchParams.set('tab', tab);
		goto(`?${page.url.searchParams.toString()}`);
	};

	// Services
	const firebase = useFirebaseService();
	const { user } = firebase;

	const { characters, loadCharacters } = useCharactersService();

	// Remote character state
	let loading = $state(true);
	let error: string | null = $state(null);
	let sharedCharacter: Character | undefined = $state(undefined);

	// Listener cleanup
	let unsubscribeShared: (() => void) | null = null;

	onMount(async () => {
		try {
			await firebase.initFirebase();
			await loadCharacters();

			// Listen to the public character (users/{userId}/characters/{characterId})
			unsubscribeShared = firebase.listenCharactersByIds(
				[{ userId, characterId }],
				(chars: Character[]) => {
					try {
						const found = (chars || []).find((c) => c.id === characterId);
						sharedCharacter = found ? new Character(found) : undefined;
						loading = false;
						error = sharedCharacter ? null : 'No se encontró el personaje compartido.';
					} catch (e) {
						loading = false;
						error = 'Ocurrió un error al cargar el personaje.';
					}
				},
			);
		} catch (e) {
			loading = false;
			error = 'No se pudo inicializar los servicios.';
		}
	});

	onDestroy(() => {
		if (unsubscribeShared) {
			try {
				unsubscribeShared();
			} catch {
				/* ignore */
			}
			unsubscribeShared = null;
		}
	});

	const importToMyCharacters = async () => {
		if (!sharedCharacter) return;

		// Crear copia limpia sin vínculo de party
		const rawCopy = JSON.parse(JSON.stringify(sharedCharacter));
		const clone = new Character({
			...rawCopy,
			id: crypto.randomUUID(),
			party: {
				partyId: null,
				ownerId: null,
			},
		});

		// Agregar al store local (persistencia la maneja characters-service)
		characters.update((arr) => [...arr, clone]);

		// Navegar a la página de personajes con el importado seleccionado
		goto(resolve(`/characters?characterId=${clone.id}`));
	};
</script>

<section class="shared-character-page">
	<div class="header">
		<h1>Personaje Compartido</h1>
		<div class="spacer" />
		<button onclick={importToMyCharacters} disabled={!$user || !sharedCharacter}>
			Importar a mis personajes
		</button>
	</div>

	{#if loading}
		<div class="status">Cargando personaje...</div>
	{:else if error}
		<div class="status error">{error}</div>
	{:else if sharedCharacter}
		<div class="sheet">
			<CharacterSheet
				character={sharedCharacter}
				readonly={true}
				onChange={() => {
					/* read-only; no-op */
				}}
				{currentTab}
				{onTabChange}
				allowPartyChange={false}
			/>
		</div>
	{/if}
</section>

<style>
	.shared-character-page {
		display: flex;
		flex-direction: column;
		gap: var(--spacing-md);
		width: 100%;

		.header {
			display: flex;
			flex-direction: row;
			align-items: center;
			gap: var(--spacing-md);

			.spacer {
				flex: 1;
			}
		}

		.status {
			padding: var(--spacing-md);
			border: 1px solid var(--border-color);
			border-radius: var(--radius-sm);
			background: var(--secondary-bg);

			&.error {
				color: var(--danger);
				border-color: var(--danger);
				background: color-mix(in srgb, var(--danger) 10%, transparent);
			}
		}

		.sheet {
			display: flex;
			flex-direction: column;
			gap: var(--spacing-md);
		}
	}
</style>
