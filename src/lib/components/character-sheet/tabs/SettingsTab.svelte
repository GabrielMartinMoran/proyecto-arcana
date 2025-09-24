<script lang="ts">
	import Container from '$lib/components/ui/Container.svelte';
	import InputField from '$lib/components/ui/InputField.svelte';
	import type { Character } from '$lib/types/character';
	import ModifiersList from '../elements/ModifiersList.svelte';

	type Props = {
		character: Character;
		onChange: (character: Character) => void;
	};

	let { character, onChange }: Props = $props();
</script>

<Container title="General">
	<div class="general">
		<InputField
			label="URL del Retrato"
			value={character.img ?? ''}
			fullWidth={true}
			placeholder="https://..."
			textAlign="left"
			onChange={(value) => {
				const strValue = value.toString();
				if (strValue.length > 0) {
					character.img = strValue;
				} else {
					character.img = null;
				}
				onChange(character);
			}}
		/>
	</div>
</Container>
<Container title="Modificadores">
	<div class="modifiers">
		<ModifiersList
			modifiers={character.modifiers}
			onChange={(modifiers) => {
				character.modifiers = modifiers;
				onChange(character);
			}}
		/>
		<small class="available-variables">
			<em>Varaibles disponibles: cuerpo, reflejos, mente, instinto, presencia.</em>
		</small>
	</div>
</Container>

<style>
	.general {
		display: flex;
		flex-direction: column;
	}

	.modifiers {
		display: flex;
		flex-direction: column;

		.available-variables {
			margin-top: var(--spacing-md);
		}
	}
</style>
