<script lang="ts">
	let { character, onChange }: { character: any; onChange: (character: any) => void } = $props();

	function editCurrentHP(): void {
		character.currentHP = 4;
		onChange(character);
	}
</script>

<div data-testid="character-health">{character.currentHP}/{character.maxHP}</div>
<button type="button" data-testid="edit-current-hp" onclick={editCurrentHP}>Edit HP</button>
