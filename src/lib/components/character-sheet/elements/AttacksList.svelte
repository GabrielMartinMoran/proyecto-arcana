<script lang="ts">
	import InputField from '$lib/components/ui/InputField.svelte';
	import type { Attack, AttackDraft, Character } from '$lib/types/character';
	import AttackLibraryModal from './AttackLibraryModal.svelte';

	type Props = {
		attacks: Attack[];
		readonly: boolean;
		onChange: (attack: Attack[]) => void;
		onAttackRoll: (attack: Attack) => void;
		onDamageRoll: (attack: Attack) => void;
		character: Character;
	};

	let { attacks, readonly, onChange, onAttackRoll, onDamageRoll, character }: Props = $props();

	let libraryOpened = $state(false);

	const handleAddAttacks = (drafts: AttackDraft[]) => {
		attacks = [...attacks, ...drafts.map((draft) => ({ id: crypto.randomUUID(), ...draft }))];
		onChange(attacks);
	};

	const addAttack = () => {
		handleAddAttacks([{ name: '', atkFormula: '', dmgFormula: '', notes: '' }]);
	};

	const removeAttack = (attack: Attack) => {
		attacks = attacks.filter((i) => i.id !== attack.id);
		onChange(attacks);
	};
</script>

<div class="attack-list">
	<div class="header">
		<label>⚔️ Ataques</label>
		{#if !readonly}
			<div class="header-actions">
				<button onclick={addAttack} title="Agregar Ataque">➕</button>
				<button onclick={() => (libraryOpened = true)} title="Agregar de biblioteca"
					>📚 Agregar de biblioteca</button
				>
			</div>
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
					width="full"
					onChange={(value) => {
						attack.name = value.toString();
						onChange(attacks);
					}}
				/>
				<InputField
					value={attack.atkFormula}
					{readonly}
					placeholder="1d8e+cuerpo"
					width="full"
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
					width="full"
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
					width="full"
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

{#if libraryOpened}
	<AttackLibraryModal
		opened={true}
		{character}
		onClose={() => (libraryOpened = false)}
		onAddAttacks={handleAddAttacks}
	/>
{/if}

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

			.header-actions {
				display: flex;
				flex-direction: row;
				align-items: center;
				gap: var(--spacing-sm);
			}
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
				}

				.actions {
					width: 40px;
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

	.header-actions button {
		padding: var(--spacing-xs) var(--spacing-sm);
		background-color: var(--secondary-bg);
		border: 1px solid var(--border-color);
		border-radius: var(--radius-md);
		cursor: pointer;
		font-size: 0.8rem;
	}

	.header-actions button:hover {
		background-color: var(--primary-bg);
	}
</style>
