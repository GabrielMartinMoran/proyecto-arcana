<script lang="ts">
	import TextField from '$lib/components/ui/TextField.svelte';
	import TitleField from '$lib/components/ui/TitleField.svelte';
	import type { Note } from '$lib/types/character';

	type Props = {
		notes: Note[];
		readonly: boolean;
		onChange: (notes: Note[]) => void;
	};

	let { notes: originalNotes, readonly, onChange }: Props = $props();

	let notes = $state(originalNotes);

	let selectedNoteId: string | undefined = $state();
	let selectedNote: Note | undefined = $derived(notes.find((x) => x.id === selectedNoteId));

	const selectNote = (note: Note) => {
		selectedNoteId = note.id;
	};

	const addNote = () => {
		const newNote = {
			id: crypto.randomUUID(),
			title: 'Nota Nueva',
			content: '',
		};
		notes = [...notes, newNote];
		onChange(notes);
		selectNote(newNote);
	};

	const deleteNote = (id: string | undefined) => {
		if (!id) return;
		notes = notes.filter((note) => note.id !== id);
		selectedNoteId = undefined;
		onChange(notes);
	};

	const onNoteChange = () => {
		notes = [...notes];
		onChange(notes);
	};
</script>

<div class="notes">
	<div class="list">
		{#if !readonly}
			<div class="header">
				<button onclick={addNote} title="Agregar Nota">➕</button>
				<button
					onclick={() => deleteNote(selectedNoteId)}
					title="Eliminar Nota"
					disabled={!selectedNote}>🗑️</button
				>
			</div>
		{/if}
		{#if notes.length > 0}
			<div class="notes">
				{#each notes as note (note.id)}
					<button
						class="note-btn"
						class:selected={selectedNoteId === note.id}
						onclick={() => selectNote(note)}
					>
						<span>{note.title || 'Nota sin título'}</span>
					</button>
				{/each}
			</div>
		{:else}
			<div class="notes empty">
				<em>No hay notas</em>
			</div>
		{/if}
	</div>
	<div class="content">
		{#if selectedNote}
			<div class="note">
				<TitleField
					value={selectedNote.title}
					{readonly}
					placeholder="Título de la nota"
					onChange={(value) => {
						selectedNote!.title = value;
						onNoteChange();
					}}
				/>
				<TextField
					value={selectedNote.content}
					{readonly}
					placeholder="Contenido de la nota"
					onChange={(value) => {
						selectedNote!.content = value;
						onNoteChange();
					}}
					maxRows="unlimited"
				/>
			</div>
		{:else}
			<div class="note empty">
				<em>No hay ninguna nota seleccionada</em>
			</div>
		{/if}
	</div>
</div>

<style>
	.notes {
		display: flex;
		flex-direction: row;
		justify-content: center;
		width: 100%;
		gap: var(--spacing-md);
		flex-wrap: wrap;

		.list {
			display: flex;
			flex-direction: column;
			border: 1px solid var(--border-color);
			border-radius: var(--radius-md);
			padding: var(--spacing-md);
			width: 300px;

			.header {
				display: flex;
				flex-direction: row;
				align-items: space-between;
				justify-content: space-between;
				border-bottom: 1px solid var(--border-color);
				padding-bottom: var(--spacing-sm);
			}

			.notes {
				display: flex;
				flex-direction: column;
				align-items: center;
				justify-content: start;
				gap: var(--spacing-sm);
				margin-top: var(--spacing-sm);

				&.empty {
					width: 100%;
					height: 100%;
					justify-content: center;
					align-items: center;
					transform: translateY(calc(var(--spacing-xl) * -1));
				}

				.note-btn {
					display: flex;
					flex-direction: row;
					justify-content: start;
					width: 100%;

					span {
						text-overflow: ellipsis;
						overflow: hidden;
					}
				}
			}
		}

		.content {
			border: 1px solid var(--border-color);
			border-radius: var(--radius-md);
			padding: var(--spacing-md);
			min-width: 300px;
			flex-grow: 1;

			.note {
				display: flex;
				flex-direction: column;
				gap: var(--spacing-sm);
				height: 600px;

				&.empty {
					width: 100%;
					justify-content: center;
					align-items: center;
				}
			}
		}
	}
</style>
