<script lang="ts">
	import { useDiceRollerService } from '$lib/services/dice-roller-service';
	import { dicePanelExpandedStore } from '$lib/stores/dice-panel-expanded-store';
	import { CONFIG } from '../../config';

	type Props = {
		isMobile: boolean;
	};

	let { isMobile }: Props = $props();

	let { rollLogs, rollExpression } = useDiceRollerService();

	let currentExpression = $state('');

	let logList: HTMLElement | undefined;

	rollLogs.subscribe(() => {
		setTimeout(() => {
			logList?.scroll({ top: logList.scrollHeight, behavior: 'smooth' });
		}, 100);
	});

	const onBodyClick = (event: MouseEvent) => {
		event.stopPropagation();
	};

	const onExpressionRoll = async (expression: string) => {
		if (!expression) return;
		await rollExpression({ expression });
	};
</script>

<div
	class="dice-panel"
	class:mobile={isMobile}
	class:collapsed={isMobile && !$dicePanelExpandedStore}
	onclick={onBodyClick}
>
	<div class="log" bind:this={logList}>
		{#each $rollLogs as log (log.id)}
			<div class="log-item">
				<span class="title">{log.title}</span>
				<span class="total">{log.total}</span>
				<span class="detail">{@html log.detail}</span>
			</div>
		{:else}
			<div class="empty">
				<em>No hay registros de tiradas</em>
			</div>
		{/each}
	</div>
	<div class="controls">
		<div class="quick-dices">
			{#each CONFIG.STANDARD_DICES as dice (dice)}
				<button class="quick-dice-btn" onclick={() => onExpressionRoll(`1${dice}`)}>{dice}</button>
			{/each}
		</div>
		<form
			class="dice-form"
			onsubmit={(event: Event) => {
				onExpressionRoll(currentExpression);
				event.preventDefault();
				currentExpression = '';
			}}
		>
			<input type="text" bind:value={currentExpression} placeholder="Ej: 1d2e+1d4-1 (e→💥)" />
			<button type="submit">Tirar</button>
		</form>
	</div>
</div>

<style>
	.dice-panel {
		position: fixed;
		right: 0;
		display: flex;
		flex-direction: column;
		height: 100%;
		width: var(--side-bar-width);
		z-index: 1000;
		border-left: 1px solid var(--border-color);
		background-color: var(--secondary-bg);
		box-shadow: var(--shadow-sm);

		&.mobile {
			position: fixed;
			top: var(--top-bar-height);
			right: 0;
			bottom: 0;
			width: var(--side-bar-width);
			overflow-y: auto;
			transition: transform 0.3s ease-in-out;
		}

		&.collapsed {
			display: none;
		}

		.log {
			display: flex;
			flex-direction: column;
			margin: var(--spacing-sm);
			padding: var(--spacing-sm);
			flex: 1;
			overflow-y: auto;
			border: 1px solid var(--border-color);
			border-radius: var(--radius-md);
			background-color: var(--primary-bg);
			gap: var(--spacing-sm);
			overflow-y: scroll;
			scrollbar-width: thin;

			.empty {
				display: flex;
				flex-direction: column;
				align-items: center;
				justify-content: center;
				height: 100%;
				width: 100%;
				text-align: center;
			}

			.log-item {
				display: flex;
				flex-direction: column;
				gap: var(--spacing-sm);
				border: 1px solid var(--border-color);
				border-radius: var(--radius-md);
				padding: var(--spacing-xs);

				.total {
					display: flex;
					align-items: center;
					justify-content: center;
					border-radius: var(--radius-md);
					border: 1px solid var(--border-color);
					padding: var(--spacing-xs);
					font-size: 1.2rem;
					font-weight: 600;
					background-color: var(--disabled-bg);
				}

				.detail {
					font-size: 0.8rem;

					:global(.max) {
						/* Used in detail */
						color: green;
						font-weight: 600;
					}

					:global(.min) {
						/* Used in detail */
						color: darkred;
						font-weight: 600;
					}
				}
			}
		}

		.controls {
			margin: var(--spacing-sm);

			.quick-dices {
				display: flex;
				flex-direction: row;
				align-items: center;
				justify-content: space-between;
				gap: var(--spacing-sm);
				flex-wrap: wrap;

				.quick-dice-btn {
					height: 35px;
					width: 35px;
					padding: var(--spacing-xs);
					margin: 0;
					font-size: 0.75rem;
				}
			}

			.dice-form {
				display: flex;
				flex-direction: column;
				gap: var(--spacing-sm);
				padding-top: var(--spacing-md);
			}
		}
	}
</style>
