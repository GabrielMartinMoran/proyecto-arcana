<script lang="ts">
	import InputField from '$lib/components/ui/InputField.svelte';
	import SelectField from '$lib/components/ui/SelectField.svelte';
	import { dialogService } from '$lib/services/dialog-service.svelte';
	import { generateDefaultSkills } from '$lib/constants/skills';
	import type { Skill } from '$lib/types/character';

	type Props = {
		skills: Skill[];
		onChange: (skills: Skill[]) => void;
	};

	let { skills, onChange }: Props = $props();

	const addSkill = () => {
		skills = [
			...skills,
			{
				id: crypto.randomUUID(),
				name: '',
				attribute: 'body',
				description: '',
				hasAdvantage: false,
			},
		];
		onChange(skills);
	};

	const removeSkill = (skill: Skill) => {
		skills = skills.filter((i) => i.id !== skill.id);
		onChange(skills);
	};

	const loadDefaults = async () => {
		if (skills.length > 0) {
			const confirmed = await dialogService.confirm(
				'¿Estás seguro de que quieres cargar las habilidades por defecto? Esto borrará las habilidades actuales.',
				{ title: 'Confirmar reinicio', confirmLabel: 'Reiniciar', cancelLabel: 'Cancelar' },
			);
			if (!confirmed) return;
		}
		skills = generateDefaultSkills();
		onChange(skills);
	};
</script>

<div class="skills-list">
	<div class="header">
		<label>Habilidades</label>
		<div class="actions">
			<button onclick={loadDefaults} title="Cargar por defecto">🔄</button>
			<button onclick={addSkill} title="Agregar Habilidad">➕</button>
		</div>
	</div>
	<div class="content">
		{#if skills.length > 0}
			<div class="skills-header">
				<label class="name">Nombre</label>
				<label class="attribute">Atributo</label>
				<label class="description">Descripción</label>
				<label class="advantage">Ventaja</label>
				<label class="btn"></label>
			</div>
		{/if}
		{#each skills as skill (skill.id)}
			<div class="skill">
				<InputField
					value={skill.name}
					placeholder="Nombre"
					onChange={(value) => {
						skill.name = value.toString();
						onChange(skills);
					}}
				/>
				<SelectField
					options={[
						{ label: 'Cuerpo', value: 'body' },
						{ label: 'Reflejos', value: 'reflexes' },
						{ label: 'Mente', value: 'mind' },
						{ label: 'Instinto', value: 'instinct' },
						{ label: 'Presencia', value: 'presence' },
					]}
					value={skill.attribute}
					onChange={(value) => {
						skill.attribute = value.toString();
						onChange(skills);
					}}
				/>
				<InputField
					value={skill.description}
					placeholder="Descripción"
					fullWidth={true}
					onChange={(value) => {
						skill.description = value.toString();
						onChange(skills);
					}}
				/>
				<div class="advantage-check">
					<input
						type="checkbox"
						checked={skill.hasAdvantage}
						onchange={(e) => {
							skill.hasAdvantage = e.currentTarget.checked;
							onChange(skills);
						}}
					/>
				</div>
				<button onclick={() => removeSkill(skill)} title="Eliminar">🗑️</button>
			</div>
		{:else}
			<div class="empty">
				<em>No hay habilidades configuradas.</em>
			</div>
		{/each}
	</div>
</div>

<style>
	.skills-list {
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

			.actions {
				display: flex;
				gap: var(--spacing-sm);
			}
		}

		.content {
			display: flex;
			flex-direction: column;
			gap: var(--spacing-md);
			width: 100%;

			.skills-header {
				display: flex;
				flex-direction: row;
				flex-wrap: wrap;
				width: 100%;
				gap: var(--spacing-xs);
				font-weight: bold;
				border-bottom: 1px solid var(--color-border);
				padding-bottom: var(--spacing-xs);

				.name {
					flex: 1;
					min-width: 8.2rem;
				}
				.attribute {
					flex: 1;
					min-width: 8.2rem;
				}
				.description {
					flex: 2;
					min-width: 8.2rem;
				}
				.advantage {
					flex: 0 0 4rem;
					text-align: center;
				}
				.btn {
					flex: 0 0 2.5rem;
				}
			}

			.skill {
				display: flex;
				flex-direction: row;
				flex-wrap: wrap;
				gap: var(--spacing-xs);
				width: 100%;

				.advantage-check {
					flex: 0 0 4rem;
					display: flex;
					justify-content: center;

					input[type='checkbox'] {
						width: 20px;
						height: 20px;
						cursor: pointer;
					}
				}

				button {
					flex: 0 0 2.5rem;
				}
			}

			.empty {
				display: flex;
				flex-direction: column;
				align-items: center;
				justify-content: center;
				padding: var(--spacing-lg);
				color: var(--color-text-muted);
			}
		}
	}
</style>
