<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import CharacterSheet from '$lib/components/character-sheet/CharacterSheet.svelte';
	import { createCharacter } from '$lib/factories/character-factory';
	import type { Character } from '$lib/types/character';
	import type { Writable } from 'svelte/store';

	type Props = {
		characters: Writable<Character[]>;
		readonly: boolean;
	};

	let { characters, readonly }: Props = $props();

	let selectedCharacterId: string | null = $derived(page.url.searchParams.get('characterId'));

	const selectCharacter = (character: Character | null) => {
		if (character !== null) {
			page.url.searchParams.set('characterId', character.id);
		} else {
			page.url.searchParams.delete('characterId');
		}
		goto(`?${page.url.searchParams.toString()}`);
	};

	let selectedCharacter: Character | undefined = $derived(
		$characters.find((c) => c.id === selectedCharacterId),
	);

	const addCharacter = () => {
		const character = createCharacter();
		characters.update(() => [...$characters, character]);
		selectCharacter(character);
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

	const deleteCurrentCharacter = () => {
		if (!selectedCharacter) return;
		const proceed = confirm(`¿Quieres eliminar a ${selectedCharacter.name}?`);
		if (!proceed) return;
		characters.update((characters) => characters.filter((c) => c.id !== selectedCharacterId));
		selectedCharacter = undefined;
		selectCharacter(null);
	};

	const exportCurrentCharacter = () => {
		if (!selectedCharacter) return;
		const blob = new Blob([JSON.stringify(selectedCharacter)], { type: 'application/json' });
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = `${selectedCharacter.name}.json`;
		document.body.appendChild(a);
		a.click();
		document.body.removeChild(a);
		URL.revokeObjectURL(url);
	};

	const importCharacter = async () => {
		const input = document.createElement('input');
		input.type = 'file';
		input.accept = '.json';
		input.onchange = async () => {
			if (!input.files || input.files.length === 0) return;
			const file = input.files[0];
			const reader = new FileReader();
			reader.onload = async (event) => {
				const data = JSON.parse(event.target?.result as any);
				const character = { ...data, id: crypto.randomUUID() };
				characters.update((characters) => [...characters, character]);
				selectCharacter(character);
			};
			reader.readAsText(file);
		};
		document.body.appendChild(input);
		input.click();
		document.body.removeChild(input);
	};
</script>

<section class="characters-page">
	<div class="list">
		<div class="header">
			<button onclick={addCharacter} title="Crear">➕</button>
			<button onclick={importCharacter} title="Importar">📥</button>
			<button onclick={exportCurrentCharacter} disabled={!selectedCharacter} title="Exportar"
				>📤</button
			>
			<button onclick={deleteCurrentCharacter} disabled={!selectedCharacter} title="Eliminar"
				>🗑️</button
			>
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
					<span class="name" title={character.name}>{character.name}</span>
				</button>
			{/each}
		</div>
	</div>
	<div class="viewport">
		{#if selectedCharacter}
			<CharacterSheet character={selectedCharacter} {readonly} onChange={onCharacterUpdate} />
		{/if}
	</div>
</section>

<style>
	.characters-page {
		display: flex;
		flex-direction: row;
		gap: var(--spacing-md);
		flex-grow: 1;
		justify-content: center;
		width: 100%;

		.list {
			display: flex;
			flex-direction: column;
			align-items: center;
			justify-content: start;
			border: 1px solid var(--border-color);
			padding: var(--spacing-md);
			border-radius: var(--radius-md);
			background-color: var(--secondary-bg);
			width: 300px;

			.header {
				display: flex;
				flex-direction: row;
				align-items: center;
				justify-content: space-between;
				width: 100%;
				border-bottom: 1px solid var(--border-color);
				padding-bottom: var(--spacing-sm);
				gap: var(--spacing-sm);
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

					.name {
						padding: 0px;
						overflow: hidden;
						white-space: nowrap;
						text-overflow: ellipsis;
						width: 8rem;
					}

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

	@media screen and (max-width: 768px) {
		.characters-page {
			flex-wrap: wrap;
		}

		.list {
			width: 100% !important;
			height: fit-content;

			.content {
				max-height: 150px;
				overflow-y: scroll;
			}
		}
	}
</style>
