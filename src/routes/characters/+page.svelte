<script lang="ts">
	import { useCharactersService } from '$lib/services/characters-service';
	import { onMount } from 'svelte';
	import CharactersPageLayout from './characters-page-layout.svelte';

	let { characters, loadCharacters } = useCharactersService();

	onMount(async () => {
		await loadCharacters();
	});
</script>

<CharactersPageLayout readonly={false} {characters} />
