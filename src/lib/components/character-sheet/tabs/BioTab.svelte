<script lang="ts">
	import Container from '$lib/components/ui/Container.svelte';
	import TextField from '$lib/components/ui/TextField.svelte';
	import { Character } from '$lib/types/character';

	type Props = {
		character: Character;
		readonly: boolean;
		onChange: (character: Character) => void;
	};

	let { character, readonly, onChange }: Props = $props();
</script>

{#if character.img}
	<Container>
		<div class="portrait">
			<img src={character.img} alt={character.name} />
		</div>
	</Container>
{/if}

<Container>
	<TextField
		label="Apariencia y Manierismos"
		value={character.narrativeContext.appearance}
		{readonly}
		maxRows="unlimited"
		autoResize
		onChange={(value) => {
			character.narrativeContext.appearance = value;
			onChange(character);
		}}
	/>
</Container>

<Container>
	<TextField
		label="Trasfondo y Origen"
		value={character.narrativeContext.background}
		{readonly}
		maxRows="unlimited"
		autoResize
		onChange={(value) => {
			character.narrativeContext.background = value;
			onChange(character);
		}}
	/>
</Container>

<Container>
	<TextField
		label="Creencias y Objetivos"
		value={character.narrativeContext.beliefs}
		{readonly}
		maxRows="unlimited"
		autoResize
		onChange={(value) => {
			character.narrativeContext.beliefs = value;
			onChange(character);
		}}
	/>
</Container>

<style>
	.portrait {
		display: flex;
		justify-content: center;
		align-items: center;
		width: 100%;
		height: 400px;
		img {
			max-width: 100%;
			max-height: 100%;
		}
	}
</style>
