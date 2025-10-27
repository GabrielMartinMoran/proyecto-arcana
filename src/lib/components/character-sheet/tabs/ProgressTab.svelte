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

	const addPP = () => {
		const log = {
			id: crypto.randomUUID(),
			type: 'add',
			value: controls.quantity,
			reason: controls.reason || DEFAULT_REASON,
		} as Log;
		character.ppHistory.unshift(log);
		onChange(character);
		resetControls();
	};

	const substractPP = () => {
		const log = {
			id: crypto.randomUUID(),
			type: 'subtract',
			value: controls.quantity,
			reason: controls.reason || DEFAULT_REASON,
		} as Log;
		character.ppHistory.unshift(log);
		onChange(character);
		resetControls();
	};

	const rollbackLog = (log: Log) => {
		character.ppHistory = character.ppHistory.filter((item) => item.id !== log.id);
		onChange(character);
	};
</script>

<Container title="Estado Actual">
	<div class="status">
		<div class="indicator">
			<span>PP Actuales</span>
			<strong class="number" class:negative={character.currentPP < 0}>{character.currentPP}</strong>
		</div>
		<div class="indicator">
			<span>PP Gastados</span>
			<strong class="number">{character.spentPP}</strong>
		</div>
		<div class="indicator">
			<span>Rango del PJ</span>
			<strong class="number">{character.tier}</strong>
		</div>
	</div>
</Container>

{#if !readonly}
	<Container title="Actualizar Progreso">
		<div class="editor">
			<div class="labels">
				<label class="qty">Cantidad</label>
				<label class="reason">Razón</label>
				<label class="btn"></label>
				<label class="btn"></label>
			</div>
			<div class="controls">
				<InputField
					value={controls.quantity}
					placeholder="Cantidad"
					fullWidth={false}
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
				<button title="Gastar PP" onclick={substractPP}>-</button>
				<button title="Ganar PP" onclick={addPP}>+</button>
			</div>
		</div>
	</Container>
{/if}

<Container title="Historial">
	<div class="history">
		{#each character.ppHistory as log (log.id)}
			<div class="log-content">
				<strong
					class="log-amount"
					class:positive={log.type === 'add'}
					class:negative={log.type === 'subtract'}
					>{log.type === 'add' ? '+' : '-'}{log.value} PP
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
			display: flex;
			flex-direction: row;
			flex-wrap: wrap;
			gap: var(--spacing-sm);

			.qty {
				width: 8.2rem;
			}

			.reason {
				flex-grow: 1;
			}

			.btn {
				width: 30px;
			}
		}

		.controls {
			display: flex;
			flex-wrap: wrap;
			gap: var(--spacing-sm);

			button {
				width: 40px;
			}
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
