<script lang="ts">
	import { useDiceRollerService } from '$lib/services/dice-roller-service';
	import { dialogService } from '$lib/services/dialog-service.svelte';
	import type { Creature, CreatureAttack } from '$lib/types/creature';
	import { parseCreatureDamageExpression } from '$lib/utils/dice-rolling';
	import { capitalize } from '$lib/utils/formatting';
	import { CONFIG } from '../../../config';
	import CreatureAction from './CreatureAction.svelte';
	import { resolve } from '$app/paths';

	type Props = { creature: Creature };
	let { creature }: Props = $props();

	let { rollModal, rollExpression } = useDiceRollerService();

	const roll = (expression: string, type: string) => {
		const variables = {
			Cuerpo: creature.attributes.body,
			Reflejos: creature.attributes.reflexes,
			Mente: creature.attributes.mind,
			Instinto: creature.attributes.instinct,
			Presencia: creature.attributes.presence,
			Iniciativa: creature.attributes.reflexes,
		};
		for (const variable of Object.keys(variables)) {
			variables[variable.toLowerCase()] = variables[variable];
		}
		rollModal.openRollModal({
			expression: expression,
			variables,
			title: `${creature.name}: ${type}`,
		});
	};

	const rollAttack = (attack: CreatureAttack) => {
		roll(`1d8e+${attack.bonus}`, `Ataca con ${attack.name}`);
	};

	const rollDamage = (attack: CreatureAttack) => {
		const parsedFormula = parseCreatureDamageExpression(attack.damage);

		rollExpression({
			expression: parsedFormula,
			title: `${creature.name}: Daño de ${attack.name}`,
		});
	};

	// Copy embedded bestiary URL for this creature to clipboard
	const copyEmbeddedURL = async () => {
		try {
			const id = (creature && (creature.id ?? creature.name)) || null;
			if (!id) return;
			const publicURL = resolve(`/embedded/bestiary/${id}`);
			await navigator.clipboard.writeText(window.location.origin + publicURL);
			await dialogService.alert('Se copió el enlace embebido de la criatura al portapapeles.');
		} catch (err) {
			// best-effort: fallback ignored
			console.warn('[statblock] failed to copy URL', err);
		}
	};
</script>

<div class="statblock">
	<div class="bg"></div>
	<div class="data">
		<div class="header">
			<h2>
				{creature.name}
			</h2>

			<span class="spacer"></span>

			<span>
				<strong>Rango</strong>
				<span>{creature.tier}</span>
			</span>

			<div class="header-actions">
				<button onclick={copyEmbeddedURL} title="Copiar enlace embebido">🔗</button>
			</div>
		</div>
		<div class="attributes">
			{#each ['body', 'reflexes', 'mind', 'instinct', 'presence'] as attribute (attribute)}
				<div class="attribute">
					<strong>{CONFIG.ATTR_NAME_MAP[attribute]}</strong>
					<div class="score">
						<span>{creature.attributes[attribute]}</span>
						<button
							onclick={() =>
								roll(
									`1d8e+${CONFIG.ATTR_NAME_MAP[attribute]}`,
									capitalize(CONFIG.ATTR_NAME_MAP[attribute]),
								)}
							title="Tirar"
						>
							🎲
						</button>
					</div>
				</div>
			{/each}
		</div>
		<div class="stats">
			<div class="attribute">
				<strong>Salud</strong>
				<span>{creature.stats.maxHealth}</span>
			</div>
			<div class="attribute">
				<strong>Esquiva</strong>
				<span
					>{creature.stats.evasion.value}{creature.stats.evasion.note
						? ` (${creature.stats.evasion.note})`
						: ''}</span
				>
			</div>
			<div class="attribute">
				<strong>Mitigación Física</strong>
				<span
					>{creature.stats.physicalMitigation.value}{creature.stats.physicalMitigation.note
						? ` (${creature.stats.physicalMitigation.note})`
						: ''}</span
				>
			</div>
			<div class="attribute">
				<strong>Mitigación Mágica</strong>
				<span
					>{creature.stats.magicalMitigation.value}{creature.stats.magicalMitigation.note
						? ` (${creature.stats.magicalMitigation.note})`
						: ''}</span
				>
			</div>
			<div class="attribute">
				<strong>Velocidad</strong>
				<span
					>{creature.stats.speed.value}{creature.stats.speed.note
						? ` (${creature.stats.speed.note})`
						: ''}</span
				>
			</div>
			<div class="attribute">
				<strong>Iniciativa</strong>
				<div class="score">
					<span>{creature.attributes.reflexes}</span>
					<button onclick={() => roll(`1d8e+reflejos`, 'Iniciativa')} title="Tirar"> 🎲 </button>
				</div>
			</div>
		</div>
		<div class="middle">
			<div class="left">
				<div class="languages">
					<strong>Lenguas</strong>
					<span>
						{#if creature.languages.length > 0}
							{creature.languages.join(', ')}
						{:else}
							Ninguna
						{/if}
					</span>
				</div>
				{#if creature.traits.length > 0}
					<div class="traits">
						<strong>Rasgos</strong>
						<ul>
							{#each creature.traits as trait (trait.name)}
								<li>
									<strong>{trait.name}: </strong>
									<span>{trait.detail}</span>
								</li>
							{/each}
						</ul>
					</div>
				{/if}
				{#if creature.attacks.length > 0}
					<div class="attacks">
						<strong>Ataques</strong>
						<ul>
							{#each creature.attacks as attack (attack.name)}
								<li>
									<strong>{attack.name}</strong>
									<span
										><button onclick={() => rollAttack(attack)}
											>{attack.bonus > 0 ? '+' + attack.bonus : attack.bonus} 🎯</button
										>
										<button onclick={() => rollDamage(attack)}>{attack.damage} 💥</button
										>{attack.note ? attack.note : ''}
									</span>
								</li>
							{/each}
						</ul>
					</div>
				{/if}
				{#if creature.actions.length > 0}
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
				{/if}
				{#if creature.reactions.length > 0}
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
				{/if}
				{#if creature.interactions.length > 0}
					<div class="actions">
						<strong>Interacciones</strong>
						<ul>
							{#each creature.interactions as interaction (interaction.name)}
								<li>
									<CreatureAction action={interaction} />
								</li>
							{/each}
						</ul>
					</div>
				{/if}
				<div class="behavior">
					<strong>Comportamiento: </strong>
					<span>{creature.behavior}</span>
				</div>
			</div>
			{#if creature.img}
				<div class="right">
					<img src={creature.img} alt={creature.name} />
				</div>
			{/if}
		</div>
	</div>
</div>

<style>
	.statblock {
		position: relative;
		display: flex;
		flex-direction: column;
		padding: 1rem;
		border: 1px solid var(--border-color);
		border-radius: var(--radius-md);
		box-shadow: var(--shadow-md);
		overflow: hidden;

		.bg {
			position: absolute;
			top: 0;
			left: 0;
			width: 100%;
			height: 100%;
			background-image: url('https://i.imgur.com/NhUqdlu.png');
			background-position: 50% 50%;
			background-size: 100%;
			opacity: 0.2;
			z-index: 1;
		}

		.data {
			flex: 1;
			display: flex;
			flex-direction: column;
			z-index: 2;
			width: 100%;

			.header {
				display: flex;
				flex-direction: row;
				justify-content: space-between;
				align-items: center;

				.spacer {
					flex: 1;
				}

				.header-actions {
					margin-left: var(--spacing-sm);
				}
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
				gap: var(--spacing-lg);
				flex-wrap: wrap;
			}

			.stats {
				display: flex;
				flex-direction: row;
				justify-content: space-between;
				align-items: start;
				margin: var(--spacing-md);
				gap: var(--spacing-lg);
				flex-wrap: wrap;
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
					display: flex;
					flex-direction: column;
					justify-content: center;
					align-items: center;
				}

				.attacks {
					button {
						margin-left: var(--spacing-sm);
					}
				}

				@media screen and (max-width: 640px) {
					flex-direction: column;
					gap: var(--spacing-md);
				}
			}

			img {
				max-width: 200px;
				height: auto;
				border-radius: 50%;
				box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
				border: 2px solid gray;
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
					background-color: var(--secondary-bg);

					button {
						padding: 0;
						border: none;
						background-color: var(--secondary-bg);
					}
				}
			}
		}
	}
</style>
