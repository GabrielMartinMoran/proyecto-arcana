<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import CharacterSheet from '$lib/components/character-sheet/CharacterSheet.svelte';
	import type { Character } from '$lib/types/character';
	import type { Writable } from 'svelte/store';
	import { CONFIG } from '../../../config';

	type Props = {
		characters: Writable<Character[]>;
		readonly: boolean;
		allActionsDisabled: boolean;
		onAddToMyCharacters?: (character: Character) => Promise<void>;
		onCreateCharacter?: () => Promise<Character>;
		onImportCharacter?: () => Promise<Character>;
		onExportCharacter?: (character: Character) => Promise<void>;
		onDeleteCharacter?: (character: Character) => Promise<void>;
	};

	let {
		characters,
		readonly,
		allActionsDisabled,
		onAddToMyCharacters = () => {
			throw new Error('onAddToMyCharacters not implemented');
		},
		onCreateCharacter = async () => {
			throw new Error('onCreateCharacter not implemented');
		},
		onImportCharacter = async () => {
			throw new Error('onCreateCharacter not implemented');
		},
		onExportCharacter = async () => {
			throw new Error('onCreateCharacter not implemented');
		},
		onDeleteCharacter = async () => {
			throw new Error('onCreateCharacter not implemented');
		},
	}: Props = $props();

	let selectedCharacterId: string | null = $derived(page.url.searchParams.get('characterId'));
	let currentTab: string = $derived(
		page.url.searchParams.get('tab') ?? CONFIG.DEFAULT_CHARACTER_SHEET_TAB,
	);

	const selectCharacter = (character: Character | null) => {
		if (character !== null) {
			page.url.searchParams.set('characterId', character.id);
			page.url.searchParams.set('tab', CONFIG.DEFAULT_CHARACTER_SHEET_TAB);
		} else {
			page.url.searchParams.delete('characterId');
			page.url.searchParams.delete('tab');
		}
		goto(`?${page.url.searchParams.toString()}`);
	};

	const onTabChange = (tab: string) => {
		page.url.searchParams.set('tab', tab);
		goto(`?${page.url.searchParams.toString()}`);
	};

	let selectedCharacter: Character | undefined = $derived(
		$characters.find((c) => c.id === selectedCharacterId),
	);

	const createCharacter = async () => {
		const character = await onCreateCharacter();
		selectCharacter(character);
	};

	const importCharacter = async () => {
		const character = await onImportCharacter();
		selectCharacter(character);
	};

	const exportCharacter = async () => {
		if (!selectedCharacter) return;
		await onExportCharacter(selectedCharacter);
	};

	import { dialogService } from '$lib/services/dialog-service.svelte';

	const deleteCharacter = async () => {
		if (!selectedCharacter) return;
		const proceed = await dialogService.confirm(`¿Quieres eliminar a ${selectedCharacter.name}?`, {
			title: 'Confirmar eliminación',
			confirmLabel: 'Eliminar',
			cancelLabel: 'Cancelar',
		});
		if (!proceed) return;
		await onDeleteCharacter(selectedCharacter);
		selectedCharacter = undefined;
		selectCharacter(null);
	};

	const addToMyCharacters = async () => {
		if (!selectedCharacter) return;
		await onAddToMyCharacters(selectedCharacter);
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
	<div class="list">
		<div class="header">
			{#if readonly}
				<button
					onclick={addToMyCharacters}
					disabled={allActionsDisabled || !selectedCharacter}
					title="Importar y Editar">📝</button
				>
			{:else}
				<button onclick={createCharacter} disabled={allActionsDisabled} title="Crear">➕</button>
				<button onclick={importCharacter} disabled={allActionsDisabled} title="Importar">📥</button>
				<button
					onclick={exportCharacter}
					disabled={allActionsDisabled || !selectedCharacter}
					title="Exportar">📤</button
				>
				<button
					onclick={deleteCharacter}
					disabled={allActionsDisabled || !selectedCharacter}
					title="Eliminar">🗑️</button
				>
			{/if}
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
			<CharacterSheet
				character={selectedCharacter}
				{readonly}
				onChange={onCharacterUpdate}
				{currentTab}
				{onTabChange}
			/>
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
