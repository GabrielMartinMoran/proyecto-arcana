<script lang="ts">
	import InputField from '$lib/components/ui/InputField.svelte';
	import type { Character, Equipment, Modifier } from '$lib/types/character';
	import type { LibraryItem } from '$lib/types/item';
	import { dialogService } from '$lib/services/dialog-service.svelte';
	import { modifiersService } from '$lib/services/modifiers-service';
	import ItemLibraryModal from './ItemLibraryModal.svelte';

	type Props = {
		equipment: Equipment[];
		readonly: boolean;
		character: Character;
		onChange: (equipment: Equipment[]) => void;
		onCharacterChange: (character: Character) => void;
	};

	let { equipment, readonly, character, onChange, onCharacterChange }: Props = $props();

	let libraryModalOpened = $state(false);

	const addBlankItem = (e: MouseEvent) => {
		e.stopPropagation();
		equipment = [...equipment, { id: crypto.randomUUID(), quantity: 1, name: '', notes: '' }];
		onChange(equipment);
	};

	const openLibraryModal = (e: MouseEvent) => {
		e.stopPropagation();
		libraryModalOpened = true;
	};

	const closeLibraryModal = () => {
		libraryModalOpened = false;
	};

	const handleRemoveItem = async (item: Equipment) => {
		// Check if there's an associated modifier (with or without "Objeto: " prefix)
		const itemNameLower = item.name.toLowerCase();
		const associatedModifier = character.modifiers.find(
			(m) =>
				m.reason.toLowerCase() === itemNameLower ||
				m.reason.toLowerCase() === `objeto: ${itemNameLower}`,
		);

		if (associatedModifier) {
			const confirmed = await dialogService.confirm(
				`¿Remover modificador '${associatedModifier.reason}'?`,
				{ title: 'Modificador Asociado', confirmLabel: 'Sí, remover', cancelLabel: 'No' },
			);

			if (confirmed) {
				// Remove the item
				equipment = equipment.filter((i) => i.id !== item.id);
				onChange(equipment);
				// Also remove associated modifier
				character.modifiers = character.modifiers.filter(
					(m) =>
						m.reason.toLowerCase() !== itemNameLower &&
						m.reason.toLowerCase() !== `objeto: ${itemNameLower}`,
				);
				onCharacterChange(character);
				return;
			}
			// If cancelled, do nothing (keep item and modifier)
			return;
		}

		// No associated modifier - just remove the item
		equipment = equipment.filter((i) => i.id !== item.id);
		onChange(equipment);
	};

	const autoAddModifier = (itemName: string) => {
		// Load modifiers if not loaded, then find matching modifier
		const modifier = modifiersService.findByName(itemName);
		if (modifier && modifier.subModifiers.length > 0) {
			// Check if this modifier is not already present (with or without prefix)
			const alreadyHas = character.modifiers.some(
				(m) =>
					m.reason.toLowerCase() === modifier.name.toLowerCase() ||
					m.reason.toLowerCase() === `objeto: ${modifier.name.toLowerCase()}`,
			);
			if (!alreadyHas) {
				const newModifiers: Modifier[] = modifier.subModifiers.map((sm) => ({
					id: crypto.randomUUID(),
					attribute: sm.attribute,
					type: sm.type,
					formula: sm.formula,
					reason: `Objeto: ${sm.reason}`,
					enabled: true,
				}));
				character.modifiers = [...character.modifiers, ...newModifiers];
				onCharacterChange(character);
			}
		}
	};

	const handleAddItem = async (item: LibraryItem, isPurchase: boolean) => {
		// If purchase, check gold and deduct
		if (isPurchase) {
			if (character.currentGold < item.price) {
				await dialogService.alert(
					`No tienes suficiente oro. Tienes ${character.currentGold} o y el item cuesta ${item.price} o.`,
				);
				return;
			}

			// Deduct gold and add to goldHistory
			const purchaseEntry = {
				id: crypto.randomUUID(),
				type: 'subtract' as const,
				value: item.price,
				reason: `Compra: ${item.name}`,
			};
			character.goldHistory = [purchaseEntry, ...character.goldHistory];
			onCharacterChange(character);
		}

		// Check for duplicate: same name + same notes
		const existingItem = equipment.find(
			(e) => e.name.toLowerCase() === item.name.toLowerCase() && e.notes === item.notes,
		);

		if (existingItem) {
			// Same name + same notes → increment quantity
			existingItem.quantity += 1;
			onChange(equipment);
			return;
		}

		// Check for conflict: same name + different notes
		const conflictItem = equipment.find(
			(e) => e.name.toLowerCase() === item.name.toLowerCase() && e.notes !== item.notes,
		);

		if (conflictItem) {
			// Same name + different notes → confirm dialog
			const confirmed = await dialogService.confirm(
				`Ya existe un item con el nombre "${item.name}" pero con notas diferentes. ¿Querés agregarlo como un nuevo item?`,
				{ title: 'Item Duplicado', confirmLabel: 'Sí, agregar', cancelLabel: 'No' },
			);

			if (!confirmed) return;
		}

		// No match or confirmed conflict → add new item
		const newItem: Equipment = {
			id: crypto.randomUUID(),
			quantity: 1,
			name: item.name,
			notes: item.notes,
		};
		equipment = [...equipment, newItem];
		onChange(equipment);

		// Auto-add modifier if exists
		await modifiersService.loadModifiers();
		autoAddModifier(item.name);
	};
</script>

<div class="equipment-list">
	<div class="header">
		<label>Equipo</label>
		{#if !readonly}
			<div class="header-buttons">
				<button onclick={addBlankItem} title="Agregar item en blanco"
					>➕ Agregar item en blanco</button
				>
				<button onclick={openLibraryModal} title="Agregar de librería"
					>📚 Agregar de librería</button
				>
			</div>
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
					<button onclick={() => handleRemoveItem(item)} title="Eliminar">🗑️</button>
				{/if}
			</div>
		{/each}
	</div>
</div>

{#if libraryModalOpened}
	<ItemLibraryModal
		opened={true}
		currentGold={character.currentGold}
		onClose={closeLibraryModal}
		onAddItem={handleAddItem}
	/>
{/if}

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

		.header-buttons {
			display: flex;
			gap: var(--spacing-sm);
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

	.header-buttons button {
		padding: var(--spacing-xs) var(--spacing-sm);
		background-color: var(--secondary-bg);
		border: 1px solid var(--border-color);
		border-radius: var(--radius-md);
		cursor: pointer;
		font-size: 0.8rem;
	}

	.header-buttons button:hover {
		background-color: var(--primary-bg);
	}
</style>
