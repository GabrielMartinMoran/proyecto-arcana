<script lang="ts">
	import InputField from '$lib/components/ui/InputField.svelte';
	import type { Equipment } from '$lib/types/character';

	type Props = {
		equipment: Equipment[];
		readonly: boolean;
		onChange: (equipment: Equipment[]) => void;
	};

	let { equipment, readonly, onChange }: Props = $props();

	const addItem = () => {
		equipment = [...equipment, { id: crypto.randomUUID(), quantity: 1, name: '', notes: '' }];
		onChange(equipment);
	};

	const removeItem = (item: Equipment) => {
		equipment = equipment.filter((i) => i.id !== item.id);
		onChange(equipment);
	};
</script>

<div class="equipment-list">
	<div class="header">
		<label>Equipo</label>
		{#if !readonly}
			<button onclick={addItem} title="Agregar Item">➕</button>
		{/if}
	</div>
	<div class="content">
		<div class="items-header">
			<label class="quantity">Cantidad</label>
			<label class="name">Nombre</label>
			<label class="notes">Notas</label>
		</div>
		{#each equipment as item (item.id)}
			<div class="item">
				<InputField
					value={item.quantity}
					{readonly}
					onChange={(value) => {
						item.quantity = Number(value);
						onChange(equipment);
					}}
				/>
				<InputField
					value={item.name}
					{readonly}
					placeholder="Nombre"
					onChange={(value) => {
						item.name = value.toString();
						onChange(equipment);
					}}
				/>
				<InputField
					value={item.notes}
					{readonly}
					placeholder="Notas"
					fullWidth={true}
					onChange={(value) => {
						item.notes = value.toString();
						onChange(equipment);
					}}
				/>
				{#if !readonly}
					<button onclick={() => removeItem(item)} title="Eliminar">🗑️</button>
				{/if}
			</div>
		{/each}
	</div>
</div>

<style>
	.equipment-list {
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

			.items-header {
				display: flex;
				flex-direction: row;
				width: 100%;
				gap: var(--spacing-md);

				.name,
				.quantity {
					width: 8.2rem;
				}
				.notes {
					flex: 1;
				}
			}

			.item {
				display: flex;
				flex-direction: row;
				gap: var(--spacing-md);
				width: 100%;
			}
		}
	}
</style>
