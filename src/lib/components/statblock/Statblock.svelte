<script lang="ts">
	import { useDiceRollerService } from '$lib/services/dice-roller-service';
	import type { Creature } from '$lib/types/creature';
	import { capitalize } from '$lib/utils/formatting';
	import CreatureAction from './CreatureAction.svelte';

	type Props = { creature: Creature };
	let { creature }: Props = $props();

	let { rollExpression } = useDiceRollerService();

	const roll = (expression: string, type: string) => {
		rollExpression({
			expression: expression,
			variables: {
				cuerpo: creature.attributes.cuerpo,
				reflejos: creature.attributes.reflejos,
				mente: creature.attributes.mente,
				instinto: creature.attributes.instinto,
				presencia: creature.attributes.presencia,
				iniciativa: creature.attributes.reflejos,
			},
			title: `${creature.name}: ${type}`,
		});
	};
</script>

<div class="statblock">
	<div class="header">
		<h2>{creature.name}</h2>
		<span>
			<strong>NA</strong>
			<span>{creature.na}</span>
		</span>
	</div>
	<div class="attributes">
		{#each ['cuerpo', 'reflejos', 'mente', 'instinto', 'presencia'] as attribute (attribute)}
			<div class="attribute">
				<strong>{attribute.charAt(0).toUpperCase() + attribute.slice(1)}</strong>
				<div class="score">
					<span>{creature.attributes[attribute]}</span>
					<button onclick={() => roll(`1d6e+${attribute}`, capitalize(attribute))} title="Tirar">
						🎲
					</button>
				</div>
			</div>
		{/each}
	</div>
	<div class="stats">
		<div class="attribute">
			<strong>Salud</strong>
			<span>{creature.stats.salud}</span>
		</div>
		<div class="attribute">
			<strong>Esquiva</strong>
			<span
				>{creature.stats.esquiva.value}{creature.stats.esquiva.note
					? ` (${creature.stats.esquiva.note})`
					: ''}</span
			>
		</div>
		<div class="attribute">
			<strong>Mitigación</strong>
			<span
				>{creature.stats.mitigacion.value}{creature.stats.mitigacion.note
					? ` (${creature.stats.mitigacion.note})`
					: ''}</span
			>
		</div>
		<div class="attribute">
			<strong>Velocidad</strong>
			<span
				>{creature.stats.velocidad.value}{creature.stats.velocidad.note
					? ` (${creature.stats.velocidad.note})`
					: ''}</span
			>
		</div>
		<div class="attribute">
			<strong>Iniciativa</strong>
			<div class="score">
				<span>{creature.attributes.reflejos}</span>
				<button onclick={() => roll(`1d6e+reflejos`, 'Iniciativa')} title="Tirar"> 🎲 </button>
			</div>
		</div>
	</div>
	<div class="middle">
		<div class="left">
			<div class="languages">
				<strong>Lenguas</strong>
				<span>
					{creature.languages.join(', ')}
				</span>
			</div>
			<div class="attacks">
				<strong>Ataques</strong>
				<ul>
					{#each creature.attacks as attack (attack.name)}
						<li>
							<strong>{attack.name}</strong>
							<span
								>{attack.bonus > 0 ? '+' + attack.bonus : attack.bonus} ({attack.damage}){attack.note
									? ` - ${attack.note}`
									: ''}</span
							>
						</li>
					{/each}
				</ul>
			</div>
			<div class="actions">
				<strong>Acciones</strong>
				<ul>
					{#each creature.actions as action (action.name)}
						<li>
							<CreatureAction {action} />
						</li>
					{/each}
				</ul>
			</div>
			<div class="actions">
				<strong>Reacciones</strong>
				<ul>
					{#each creature.reactions as reaction (reaction.name)}
						<li>
							<CreatureAction action={reaction} />
						</li>
					{/each}
				</ul>
			</div>
			<div class="behavior">
				<strong>Comportamiento</strong>
				<span>{creature.behavior}</span>
			</div>
		</div>
		<div class="right">
			<img src={creature.img} alt={creature.name} />
		</div>
	</div>
</div>

<style>
	.statblock {
		display: flex;
		flex-direction: column;
		padding: 1rem;
		border: 1px solid #ccc;
		border-radius: 4px;
		box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
	}

	.header {
		display: flex;
		flex-direction: row;
		justify-content: space-between;
		align-items: center;
	}

	.attributes {
		display: flex;
		flex-direction: row;
		justify-content: space-between;
		align-items: center;
		border-top: 1px solid black;
		border-bottom: 1px solid black;
		padding: var(--spacing-md);
		margin-bottom: var(--spacing-md);
		margin-top: var(--spacing-md);
	}

	.stats {
		display: flex;
		flex-direction: row;
		justify-content: space-between;
		align-items: start;
		margin: var(--spacing-md);
	}

	.middle {
		display: flex;
		flex-direction: row;

		.left {
			display: flex;
			flex-direction: column;
			flex: 1;
			gap: var(--spacing-md);
		}

		.right {
		}
	}

	img {
		max-width: 200px;
		height: auto;
		border-radius: 50%;
		box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
		border: 2px solid gray;
	}

	@media screen and (max-width: 768px) {
	}
	.attribute {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;

		.score {
			display: flex;
			flex-direction: row;
			justify-content: center;
			align-items: center;
			gap: var(--spacing-md);
			border: 1px solid var(--border-color);
			border-radius: var(--radius-md);
			padding: var(--spacing-sm);

			button {
				padding: 0;
				border: none;
			}
		}
	}
</style>
