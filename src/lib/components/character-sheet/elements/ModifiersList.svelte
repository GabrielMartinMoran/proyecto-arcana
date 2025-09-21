<script lang="ts">
	import InputField from '$lib/components/ui/InputField.svelte';
	import SelectField from '$lib/components/ui/SelectField.svelte';
	import type { Modifier } from '$lib/types/character';

	type Props = {
		modifiers: Modifier[];
		onChange: (modifier: Modifier[]) => void;
	};

	let { modifiers, onChange }: Props = $props();

	const addModifier = () => {
		modifiers = [
			...modifiers,
			{ id: crypto.randomUUID(), attribute: 'maxHP', type: 'add', formula: '', reason: '' },
		];
		onChange(modifiers);
	};

	const removeModifier = (modifier: Modifier) => {
		modifiers = modifiers.filter((i) => i.id !== modifier.id);
		onChange(modifiers);
	};
</script>

<div class="modifier-list">
	<div class="header">
		<label>Modificadores</label>
		<button onclick={addModifier} title="Agregar Modificador">➕</button>
	</div>
	<div class="content">
		<div class="modifiers-header">
			<label class="type">Tipo</label>
			<label class="field">Atributo</label>
			<label class="formula">Formula</label>
			<label class="label">Razón</label>
		</div>
		{#each modifiers as modifier (modifier.id)}
			<div class="modifier">
				<SelectField
					options={[
						{ label: 'Sumar', value: 'add' },
						{ label: 'Establecer', value: 'set' },
					]}
					value={modifier.type}
					onChange={(value) => {
						modifier.type = value.toString();
						onChange(modifiers);
					}}
				/>
				<SelectField
					options={[
						{ label: 'Salud Máxima', value: 'maxHP' },
						{ label: 'Suerte Máxima', value: 'maxLuck' },
						{ label: 'Esquiva', value: 'evasion' },
						{ label: 'Mitigación', value: 'mitigation' },
						{ label: 'Velocidad', value: 'speed' },
					]}
					value={modifier.attribute}
					onChange={(value) => {
						modifier.attribute = value.toString();
						onChange(modifiers);
					}}
				/>
				<InputField
					value={modifier.formula}
					placeholder="1+cuerpo"
					fullWidth={true}
					onChange={(value) => {
						modifier.formula = value.toString();
						onChange(modifiers);
					}}
				/>
				<InputField
					value={modifier.formula}
					placeholder="Razón"
					fullWidth={true}
					onChange={(value) => {
						modifier.reason = value.toString();
						onChange(modifiers);
					}}
				/>
				<button onclick={() => removeModifier(modifier)} title="Eliminar">🗑️</button>
			</div>
		{/each}
	</div>
</div>

<style>
	.modifier-list {
		display: flex;
		flex-direction: column;
		gap: var(--spacing-md);
		width: 100%;
		.header {
			width: 100%;
			display: flex;
			flex-direction: row;
			justify-content: space-between;
			align-items: center;
		}

		.content {
			display: flex;
			flex-direction: column;
			gap: var(--spacing-md);
			width: 100%;

			.modifiers-header {
				display: grid;
				grid-template-columns: 1fr 1fr 1fr 1fr 50px;
				flex-direction: row;
				width: 100%;
			}

			.modifier {
				display: grid;
				grid-template-columns: 1fr 1fr 1fr 1fr 50px;
				gap: var(--spacing-md);
				width: 100%;
			}
		}
	}
</style>
