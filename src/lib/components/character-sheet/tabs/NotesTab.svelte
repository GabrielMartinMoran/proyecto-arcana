<script lang="ts">
	import Container from '$lib/components/ui/Container.svelte';
	import type { Character } from '$lib/types/character';
	import Notes from '../elements/Notes.svelte';

	type Props = {
		character: Character;
		readonly: boolean;
		onChange: (character: Character) => void;
	};

	let { character, readonly, onChange }: Props = $props();
</script>

<Container title="Notas">
	<Notes
		notes={character.notes}
		{readonly}
		onChange={(value) => {
			character.notes = value;
			onChange(character);
		}}
	/>
</Container>
