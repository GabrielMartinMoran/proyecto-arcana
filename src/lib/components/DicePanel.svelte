<script lang="ts">
	import { useDiceRollerService } from '$lib/services/dice-roller-service';
	import { dialogService } from '$lib/services/dialog-service.svelte';
	import { useFirebaseService } from '$lib/services/firebase-service';
	import { usePartiesService } from '$lib/services/parties-service';
	import { useRollTargetService } from '$lib/services/roll-target-service';
	import { dicePanelExpandedStore } from '$lib/stores/dice-panel-expanded-store';
	import { sideMenuExpandedStore } from '$lib/stores/side-menu-expanded-store';
	import type { RollLog } from '$lib/types/roll-log';
	import { onMount } from 'svelte';
	import { CONFIG } from '../../config';

	const SCROLL_DELAY = 50;

	type Props = {
		isMobile: boolean;
	};

	let { isMobile }: Props = $props();

	let { rollLogs, rollExpression } = useDiceRollerService();

	const rollTarget = useRollTargetService();
	const { parties, loadParties } = usePartiesService();
	const { target } = rollTarget;

	const firebase = useFirebaseService();
	const { user } = firebase;

	const onTargetSelect = (val: string) => {
		if (!val) return;
		if (val === 'personal') {
			rollTarget.setPersonalTarget();
			return;
		}
		if (val.startsWith('party:')) {
			const partyId = val.slice('party:'.length);
			const p = ($parties || []).find((pp) => pp.id === partyId);
			rollTarget.setPartyTarget(partyId, p ? p.name : undefined);
		}
	};

	let currentExpression = $state('');
	let displayedLogs: RollLog[] = $state([]);

	let logList: HTMLElement | undefined;

	// Track logs by their IDs to detect new additions more reliably
	let lastLogIds = new Set<string>();
	let hasInitialized = false;

	// Track panel expansion to scroll when it opens
	let wasPanelExpanded = false;

	rollLogs.subscribe((logs: RollLog[]) => {
		if (!hasInitialized) {
			// First subscription - just initialize tracking
			lastLogIds = new Set(logs.map((log) => log.id).filter(Boolean));
			hasInitialized = true;
			displayedLogs = logs;
			return;
		}

		// Check if there are new logs by comparing IDs
		const currentIds = new Set(logs.map((log) => log.id).filter(Boolean));
		const hasNewLogs = logs.some((log) => log.id && !lastLogIds.has(log.id));

		if (hasNewLogs) {
			// New log detected - expand panel and scroll
			dicePanelExpandedStore.set(true);
			setTimeout(() => {
				logList?.scroll({ top: logList.scrollHeight, behavior: 'smooth' });
			}, SCROLL_DELAY);
		}

		lastLogIds = currentIds;
		displayedLogs = logs;
	});

	// Watch for panel expansion to scroll to bottom when opened
	dicePanelExpandedStore.subscribe((expanded) => {
		if (expanded && !wasPanelExpanded && hasInitialized) {
			// Panel just opened - scroll to bottom when opened
			setTimeout(() => {
				logList?.scroll({ top: logList.scrollHeight, behavior: 'smooth' });
			}, SCROLL_DELAY);
		}
		wasPanelExpanded = expanded;
	});

	// Reconcile roll target accessibility whenever the accessible parties list changes
	parties.subscribe((ps) => {
		try {
			const ids = (ps || []).map((p) => p.id);
			rollTarget.reconcileAccessibility(ids);
		} catch {
			/* ignore */
		}
	});

	// When target changes, clear current displayed logs so the list reflects only the new source
	target.subscribe(() => {
		displayedLogs = [];
		// Reset detection so first emission from new source doesn't auto-scroll as "new"
		hasInitialized = false;
		lastLogIds = new Set();
	});

	const onBodyClick = (event: MouseEvent) => {
		event.stopPropagation();
		sideMenuExpandedStore.set(false);
	};

	const onExpressionRoll = async (expression: string) => {
		if (!expression) return;
		await rollExpression({ expression });
	};

	const copyLog = async (log: RollLog) => {
		const toCopy = `${log.total} (${log.detail})`.replace(/<\/?[^>]+(>|$)/g, '');
		await navigator.clipboard.writeText(toCopy);
		await dialogService.alert('Resultado copiado al portapapeles');
	};

	onMount(async () => {
		// Ensure parties service is loaded so the target selector is populated and reacts to changes
		try {
			await loadParties();
		} catch {
			/* ignore load errors */
		}
		// Scroll to bottom on initial mount
		setTimeout(() => {
			logList?.scroll({ top: logList.scrollHeight, behavior: 'instant' });
		}, SCROLL_DELAY);
	});
</script>

<div
	class="dice-panel"
	class:mobile={isMobile}
	class:collapsed={isMobile && !$dicePanelExpandedStore}
	onclick={onBodyClick}
>
	<div class="log" bind:this={logList}>
		{#each displayedLogs as log (log.id)}
			<div class="log-item">
				<span class="title">{log.title}</span>
				<div class="total-container" onclick={() => copyLog(log)} title="Copiar resultado">
					{#if log.formattedTotal}
						{@html log.formattedTotal}
					{:else}
						<span class="total">{log.total}</span>
					{/if}
				</div>
				<span class="detail">{@html log.detail}</span>
				{#if (log as any).authorId && (log as any).authorId === $user?.uid}
					<span class="roll-author">Tú</span>
				{:else if (log as any).authorName}
					<span class="roll-author">{(log as any).authorName}</span>
				{/if}
			</div>
		{:else}
			<div class="empty">
				<em>No hay registros de tiradas</em>
			</div>
		{/each}
	</div>
	<div class="controls">
		<div class="target-select">
			<label for="roll-target">Canal</label>
			<select
				id="roll-target"
				onchange={(e) => onTargetSelect((e.target as HTMLSelectElement).value)}
			>
				<option value="personal" selected={$target.type === 'personal'}>👤 Personal</option>
				{#each $parties as p (p.id)}
					<option
						value={`party:${p.id}`}
						selected={$target.type === 'party' && $target.partyId === p.id}
					>
						👥 {p.name}
					</option>
				{/each}
			</select>
		</div>
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
		width: var(--dice-panel-width);
		z-index: 1000;
		border-left: 1px solid var(--border-color);
		background-color: var(--secondary-bg);
		box-shadow: var(--shadow-sm);

		&.mobile {
			top: var(--top-bar-height);
			bottom: 0;
			height: calc(100% - var(--top-bar-height));
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

				.title {
					font-weight: 600;
					font-size: 0.9rem;
				}

				.total-container {
					cursor: pointer;

					:global(.total) {
						display: flex;
						align-items: center;
						justify-content: center;
						border-radius: var(--radius-md);
						border: 1px solid var(--border-color);
						padding: var(--spacing-xs);
						font-weight: 600;
						background-color: var(--disabled-bg);

						&.success {
							/* Used by the children when custom formatting the total */
							color: var(--success-color);
							font-weight: 600;
						}

						&.failure {
							/* Used by the children when custom formatting the total */
							color: var(--failure-color);
							font-weight: 600;
						}
					}
				}

				.detail {
					font-size: 0.8rem;
					padding-left: var(--spacing-sm);
					padding-right: var(--spacing-sm);
					text-align: center;
					text-wrap: balance;

					:global(.max) {
						/* Used in detail */
						color: var(--success-color);
						font-weight: 600;
					}

					:global(.min) {
						/* Used in detail */
						color: var(--failure-color);
						font-weight: 600;
					}
				}

				.roll-author {
					font-size: 0.75rem;
					color: var(--text-secondary);
					text-align: center;
				}
			}
		}

		.controls {
			margin: var(--spacing-sm);

			.target-select {
				display: flex;
				flex-direction: row;
				align-items: center;
				gap: var(--spacing-sm);
				margin-bottom: var(--spacing-sm);
			}
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
