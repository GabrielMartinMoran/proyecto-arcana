<script lang="ts">
	let { character, onChange }: { character: any; onChange: (character: any) => void } = $props();

	function editCurrentHP(): void {
		character.currentHP = 4;
		onChange(character);
	}

	function updateAttackName(name: string): void {
		const attacks = [...(character.attacks ?? [])];
		attacks[0] = { ...(attacks[0] ?? {}), name };
		onChange({ ...character, attacks });
	}
</script>

<div data-testid="character-health">{character.currentHP}/{character.maxHP}</div>
<input
	data-testid="attack-name-input"
	aria-label="Attack name"
	value={character.attacks?.[0]?.name ?? ''}
	oninput={(event) => updateAttackName(event.currentTarget.value)}
/>
<button type="button" data-testid="edit-current-hp" onclick={editCurrentHP}>Edit HP</button>
