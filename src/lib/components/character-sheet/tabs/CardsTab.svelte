<script lang="ts">
	import Container from '$lib/components/ui/Container.svelte';
	import type { Character } from '$lib/types/character';

	type Props = {
		character: Character;
		readonly: boolean;
	};

	let { character, readonly }: Props = $props();
</script>

<Container>
	<h1>Cartas</h1>
</Container>
