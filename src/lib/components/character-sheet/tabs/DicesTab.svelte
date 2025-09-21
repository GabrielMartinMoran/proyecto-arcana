<script lang="ts">
	import type { Character } from '$lib/types/character';

	type Props = {
		character: Character;
		readonly: boolean;
	};

	let { character, readonly }: Props = $props();
</script>

<h1>Dados</h1>
