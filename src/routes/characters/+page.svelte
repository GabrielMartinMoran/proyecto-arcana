<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import CharacterSheet from '$lib/components/character-sheet/CharacterSheet.svelte';
	import Container from '$lib/components/ui/Container.svelte';
	import { createCharacter } from '$lib/factories/character-factory';
	import { useCharactersService } from '$lib/services/characters-service';
	import type { Character } from '$lib/types/character';
	import { onMount } from 'svelte';

	let { characters, loadCharacters } = useCharactersService();

	let selectedCharacterId: string | null = $derived(page.url.searchParams.get('characterId'));

	const selectCharacter = (character: Character) => {
		page.url.searchParams.set('characterId', character.id);
		goto(`?${page.url.searchParams.toString()}`);
	};

	let selectedCharacter: Character | undefined = $derived(
		$characters.find((c) => c.id === selectedCharacterId),
	);

	onMount(async () => {
		await loadCharacters();
	});

	const addCharacter = () => {
		characters.update(() => [...$characters, createCharacter()]);
	};

	const onCharacterUpdate = (character: Character) => {
		characters.update((characters) => {
			const index = characters.findIndex((c) => c.id === character.id);
			if (index !== -1) {
				const updatedCharacters = [...characters];
				updatedCharacters[index] = character;
				return updatedCharacters;
			}
			return characters;
		});
	};
</script>

<section class="characters-page">
	<Container>
		<div class="list">
			<div class="header">
				<button onclick={addCharacter}>➕</button>
				<button>📥</button>
				<button>📤</button>
				<button>🗑️</button>
			</div>
			<div class="content">
				{#each $characters as character (character.id)}
					<button
						class="character-item"
						class:selected={selectedCharacterId === character.id}
						onclick={() => selectCharacter(character)}
					>
						{#if character.img}
							<img class="character-image" src={character.img} alt={character.name} />
						{:else}
							<span class="image-placeholder">{character.name.charAt(0).toUpperCase()}</span>
						{/if}
						<span>{character.name}</span>
					</button>
				{/each}
			</div>
		</div>
	</Container>
	<div class="viewport">
		{#if selectedCharacter}
			<CharacterSheet character={selectedCharacter} readonly={false} onChange={onCharacterUpdate} />
		{/if}
	</div>
</section>

<style>
	.characters-page {
		display: flex;
		flex-direction: row;
		gap: var(--spacing-md);
		flex-grow: 1;

		.list {
			display: flex;
			flex-direction: column;
			align-items: center;
			justify-content: start;
			width: 250px;

			.header {
				display: flex;
				flex-direction: row;
				align-items: center;
				justify-content: space-between;
				width: 100%;
				border-bottom: 1px solid var(--border-color);
				padding: var(--spacing-sm);
			}

			.content {
				display: flex;
				flex-direction: column;
				align-items: center;
				justify-content: start;
				width: 100%;
				gap: var(--spacing-sm);
				padding-top: var(--spacing-md);

				.character-item {
					cursor: pointer;
					width: 100%;
					height: 3rem;
					display: flex;
					flex-direction: row;
					align-items: center;
					justify-content: left;
					gap: var(--spacing-sm);

					.character-image {
						width: 2rem;
						height: 2rem;
						border-radius: 50%;
						object-fit: cover;
					}

					.image-placeholder {
						width: 2rem;
						height: 2rem;
						border-radius: 50%;
						background: var(--background-color);
						background-color: #d9d9d9;
						display: flex;
						align-items: center;
						justify-content: center;
					}
				}
			}
		}

		.viewport {
			width: 100%;
		}
	}
</style>
