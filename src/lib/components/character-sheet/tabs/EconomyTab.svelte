<script lang="ts">
	import Container from '$lib/components/ui/Container.svelte';
	import InputField from '$lib/components/ui/InputField.svelte';
	import { Character, type Log } from '$lib/types/character';

	const DEFAULT_REASON = 'Sin razón especifica';

	type Props = {
		character: Character;
		readonly: boolean;
		onChange: (character: Character) => void;
	};

	let { character, readonly, onChange }: Props = $props();

	let controls: { quantity: number; reason: string } = $state({ quantity: 1, reason: '' });

	const resetControls = () => {
		controls.quantity = 1;
		controls.reason = '';
	};

	const addGold = () => {
		const log = {
			id: crypto.randomUUID(),
			type: 'add',
			value: controls.quantity,
			reason: controls.reason || DEFAULT_REASON,
		} as Log;
		character.goldHistory.unshift(log);
		onChange(character);
		resetControls();
	};

	const substractGold = () => {
		const log = {
			id: crypto.randomUUID(),
			type: 'subtract',
			value: controls.quantity,
			reason: controls.reason || DEFAULT_REASON,
		} as Log;
		character.goldHistory.unshift(log);
		onChange(character);
		resetControls();
	};

	const rollbackLog = (log: Log) => {
		character.goldHistory = character.goldHistory.filter((item) => item.id !== log.id);
		onChange(character);
	};
</script>

<Container title="Estado Actual">
	<div class="status">
		<div class="indicator">
			<span>Oro Actual</span>
			<strong class="number" class:negative={character.currentGold < 0}
				>{character.currentGold}</strong
			>
		</div>
		<div class="indicator">
			<span>Oro Gastado</span>
			<strong class="number">{character.spentGold}</strong>
		</div>
	</div>
</Container>

{#if !readonly}
	<Container title="Actualizar Oro">
		<div class="editor">
			<div class="labels">
				<label>Cantidad</label>
				<label>Razón</label>
			</div>
			<div class="controls">
				<InputField
					value={controls.quantity}
					placeholder="Cantidad"
					fullWidth={true}
					onChange={(value) => {
						controls.quantity = Number(value);
					}}
				/>
				<InputField
					value={controls.reason}
					placeholder="Razón"
					fullWidth={true}
					onChange={(value) => {
						controls.reason = value.toString();
					}}
				/>
				<button title="Gastar Oro" onclick={substractGold}>-</button>
				<button title="Ganar Oro" onclick={addGold}>+</button>
			</div>
		</div>
	</Container>
{/if}

<Container title="Historial">
	<div class="history">
		{#each character.goldHistory as log (log.id)}
			<div class="log-content">
				<strong
					class="log-amount"
					class:positive={log.type === 'add'}
					class:negative={log.type === 'subtract'}
					>{log.type === 'add' ? '+' : '-'}{log.value} Oro
				</strong>
				<span class="log-reason">{log.reason}</span>
				<button title="Deshacer esta acción" onclick={() => rollbackLog(log)}> ↶ </button>
			</div>
		{:else}
			<div class="empty">
				<em>No hay registros</em>
			</div>
		{/each}
	</div>
</Container>

<style>
	.status {
		display: flex;
		justify-content: space-evenly;
		align-items: center;

		.indicator {
			display: flex;
			flex-direction: column;
			justify-content: center;
			align-items: center;

			.number {
				font-weight: bold;
				font-size: 1.2rem;
			}
		}
	}

	.editor {
		.labels {
			display: grid;
			grid-template-columns: 1fr 3fr 50px 50px;
			gap: var(--spacing-sm);
		}

		.controls {
			display: grid;
			grid-template-columns: 1fr 3fr 50px 50px;
			gap: var(--spacing-sm);
		}
	}

	.history {
		display: flex;
		flex-direction: column;
		gap: var(--spacing-sm);

		.log-content {
			display: flex;
			flex-direction: row;
			align-items: center;
			gap: var(--spacing-sm);

			.log-reason {
				flex-grow: 1;
			}
		}

		.empty {
			display: flex;
			justify-content: center;
			align-items: center;
			height: 100%;
			width: 100%;
		}
	}

	.positive {
		color: var(--success-color);
	}

	.negative {
		color: var(--failure-color);
	}
</style>
