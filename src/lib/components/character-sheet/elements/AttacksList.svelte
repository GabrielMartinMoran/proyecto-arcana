<script lang="ts">
	import InputField from '$lib/components/ui/InputField.svelte';
	import type { Attack } from '$lib/types/character';

	type Props = {
		attacks: Attack[];
		readonly: boolean;
		onChange: (attack: Attack[]) => void;
		onAttackRoll: (attack: Attack) => void;
		onDamageRoll: (attack: Attack) => void;
	};

	let { attacks, readonly, onChange, onAttackRoll, onDamageRoll }: Props = $props();

	const addAttack = () => {
		attacks = [
			...attacks,
			{ id: crypto.randomUUID(), name: '', atkFormula: '', dmgFormula: '', notes: '' },
		];
		onChange(attacks);
	};

	const removeAttack = (attack: Attack) => {
		attacks = attacks.filter((i) => i.id !== attack.id);
		onChange(attacks);
	};
</script>

<div class="attack-list">
	<div class="header">
		<label>Ataques</label>
		{#if !readonly}
			<button onclick={addAttack} title="Agregar Ataque">➕</button>
		{/if}
	</div>
	<div class="content">
		<div class="attacks-header">
			<label class="name">Nombre</label>
			<label class="atk-formula">Formula Ataque</label>
			<label class="dmg-formula">Formula Daño</label>
			<label class="notes">Notas</label>
			<label class="actions"></label>
		</div>
		{#each attacks as attack (attack.id)}
			<div class="item">
				<InputField
					value={attack.name}
					{readonly}
					placeholder="Nombre"
					fullWidth={true}
					onChange={(value) => {
						attack.name = value.toString();
						onChange(attacks);
					}}
				/>
				<InputField
					value={attack.atkFormula}
					{readonly}
					placeholder="1d8e+cuerpo"
					fullWidth={true}
					onChange={(value) => {
						attack.atkFormula = value.toString();
						onChange(attacks);
					}}
					button={{
						icon: '🎯',
						title: 'Tirar Ataque',
						onClick: () => onAttackRoll(attack),
						disabled: !attack.atkFormula,
					}}
				/>
				<InputField
					value={attack.dmgFormula}
					{readonly}
					placeholder="1d4"
					fullWidth={true}
					onChange={(value) => {
						attack.dmgFormula = value.toString();
						onChange(attacks);
					}}
					button={{
						icon: '💥',
						title: 'Tirar Daño',
						onClick: () => onDamageRoll(attack),
						disabled: !attack.dmgFormula,
					}}
				/>
				<InputField
					value={attack.notes}
					{readonly}
					placeholder="Contundente"
					fullWidth={true}
					onChange={(value) => {
						attack.notes = value.toString();
						onChange(attacks);
					}}
				/>
				{#if !readonly}
					<button onclick={() => removeAttack(attack)} title="Eliminar">🗑️</button>
				{/if}
			</div>
		{/each}
	</div>
</div>

<style>
	.attack-list {
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

			.attacks-header {
				display: flex;
				flex-direction: row;
				flex-wrap: wrap;
				width: 100%;
				gap: var(--spacing-xs);

				.name,
				.atk-formula,
				.dmg-formula,
				.notes {
					flex: 1;
					min-width: 8.2rem;
				}

				.actions {
					width: 50px;
				}
			}

			.item {
				display: flex;
				flex-direction: row;
				flex-wrap: wrap;
				gap: var(--spacing-xs);
				width: 100%;

				button {
					width: 40px;
				}
			}
		}
	}
</style>
