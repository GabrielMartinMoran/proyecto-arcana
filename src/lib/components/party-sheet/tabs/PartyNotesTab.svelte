<script lang="ts">
	import { Party } from '$lib/types/party';
	import Notes from '../../character-sheet/elements/Notes.svelte';
	import Container from '../../ui/Container.svelte';

	type Props = {
		party: Party;
		readonly: boolean;
		onChange: (party: Party) => void;
	};

	let { party, readonly, onChange }: Props = $props();

	const onNotesChange = (notes: { id: string; title: string; content: string }[]) => {
		party.notes = notes;
		// Emit a fresh copy so consumers can detect changes reactively
		onChange(party.copy());
	};
</script>

<div class="notes-tab">
	<Container title="Notas">
		<Notes notes={party.notes} {readonly} onChange={onNotesChange} />
	</Container>
</div>

<style>
	.notes-tab {
		display: flex;
		flex-direction: column;
		gap: var(--spacing-md);
		width: 100%;
	}
</style>
