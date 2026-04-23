<script lang="ts">
	import InputField from '$lib/components/ui/InputField.svelte';
	import SelectField from '$lib/components/ui/SelectField.svelte';
	import type { Modifier } from '$lib/types/character';
	import type { LibraryModifier } from '$lib/types/modifier';
	import ModifierLibraryModal from './ModifierLibraryModal.svelte';

	type Props = {
		modifiers: Modifier[];
		onChange: (modifier: Modifier[]) => void;
	};

	let { modifiers, onChange }: Props = $props();

	let libraryModalOpened = $state(false);

	const addModifier = () => {
		modifiers = [
			...modifiers,
			{
				id: crypto.randomUUID(),
				attribute: 'maxHP',
				type: 'add',
				formula: '',
				reason: '',
				enabled: true,
			},
		];
		onChange(modifiers);
	};

	const removeModifier = (modifier: Modifier) => {
		modifiers = modifiers.filter((i) => i.id !== modifier.id);
		onChange(modifiers);
	};

	const openLibraryModal = () => {
		libraryModalOpened = true;
	};

	const closeLibraryModal = () => {
		libraryModalOpened = false;
	};

	const handleAddFromLibrary = (libraryModifier: LibraryModifier) => {
		// Add all subModifiers with enabled=true
		const newModifiers = libraryModifier.subModifiers.map((sm) => ({
			id: crypto.randomUUID(),
			attribute: sm.attribute,
			type: sm.type,
			formula: sm.formula,
			reason: sm.reason,
			enabled: true,
		}));
		modifiers = [...modifiers, ...newModifiers];
		onChange(modifiers);
	};

	const toggleEnabled = (modifierId: string) => {
		const updated = modifiers.map((m) =>
			m.id === modifierId ? { ...m, enabled: !(m.enabled === true) } : m,
		);
		onChange(updated);
	};
</script>

<div class="modifier-list">
	<div class="header">
		<label>Modificadores</label>
		<div class="header-buttons">
			<button onclick={openLibraryModal} title="Agregar desde Biblioteca"
				>📚 Agregar desde Biblioteca</button
			>
			<button onclick={addModifier} title="Agregar Modificador">➕</button>
		</div>
	</div>
	<div class="content">
		<div class="modifiers-header">
			<label class="checkbox-col"></label>
			<label class="type">Tipo</label>
			<label class="field">Atributo</label>
			<label class="formula">Formula</label>
			<label class="label">Razón</label>
			<label class="btn"></label>
		</div>
		{#each modifiers as modifier (modifier.id)}
			{@const isDisabled = modifier.enabled === false || modifier.enabled === undefined}
			<div class="modifier" class:disabled={isDisabled}>
				<input
					type="checkbox"
					checked={!isDisabled}
					onchange={() => toggleEnabled(modifier.id)}
					title={isDisabled ? 'Habilitar' : 'Deshabilitar'}
				/>
				<div class="modifier-fields">
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
							{ label: 'Mitigación Física', value: 'physicalMitigation' },
							{ label: 'Mitigación Mágica', value: 'magicalMitigation' },
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
						value={modifier.reason}
						placeholder="Razón"
						fullWidth={true}
						onChange={(value) => {
							modifier.reason = value.toString();
							onChange(modifiers);
						}}
					/>
				</div>
				<button onclick={() => removeModifier(modifier)} title="Eliminar">🗑️</button>
			</div>
		{:else}
			<div class="empty">
				<em>No hay modificadores disponibles</em>
			</div>
		{/each}
	</div>
</div>

{#if libraryModalOpened}
	<ModifierLibraryModal
		opened={true}
		onClose={closeLibraryModal}
		onAddModifier={handleAddFromLibrary}
	/>
{/if}

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

		.header-buttons {
			display: flex;
			gap: var(--spacing-sm);
		}

		.content {
			display: flex;
			flex-direction: column;
			gap: var(--spacing-md);
			width: 100%;

			.modifiers-header {
				display: flex;
				flex-direction: row;
				width: 100%;
				flex-wrap: wrap;
				gap: var(--spacing-md);

				.checkbox-col {
					width: 24px;
				}
				.type {
					width: 8rem;
				}
				.field {
					width: 9rem;
				}

				.formula,
				.label {
					flex: 1;
				}

				.btn {
					width: 40px;
				}
			}

			.modifier {
				display: flex;
				flex-direction: row;
				flex-wrap: wrap;
				gap: var(--spacing-md);
				width: 100%;
				align-items: center;

				input[type='checkbox'] {
					width: 18px;
					height: 18px;
					accent-color: var(--color-primary);
				}

				.modifier-fields {
					display: flex;
					flex-direction: row;
					flex-wrap: wrap;
					gap: var(--spacing-md);
					flex: 1;
					align-items: center;
				}

				button {
					width: 40px;
				}
			}

			.modifier.disabled {
				opacity: 0.5;

				input[type='text'] {
					text-decoration: line-through;
				}

				input[type='checkbox'] {
					opacity: 1;
				}
			}

			.empty {
				display: flex;
				flex-direction: column;
				align-items: center;
				justify-content: center;
				flex: 1;
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
