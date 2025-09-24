<script lang="ts">
	import { useCharactersService } from '$lib/services/characters-service';
	import { onMount } from 'svelte';
	import CharactersPageLayout from '../characters-page-layout.svelte';

	let { exampleCharacters, loadExampleCharacters } = useCharactersService();

	onMount(async () => {
		await loadExampleCharacters();
	});
</script>

<CharactersPageLayout readonly={true} characters={exampleCharacters} />
