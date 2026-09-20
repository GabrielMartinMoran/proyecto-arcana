<script lang="ts">
	import type { Creature } from '$lib/types/creature';

	type Props = {
		creatures: Creature[];
		selectedCreatureId: string | null;
		onSelect: (creature: Creature) => void;
	};

	let { creatures, selectedCreatureId, onSelect }: Props = $props();
</script>

{#if creatures.length === 0}
	<p class="empty-state" role="status">No hay criaturas para mostrar.</p>
{:else}
	<div class="catalogue-header catalogue-grid">
		<span>Nombre</span>
		<span>Linaje</span>
		<span>Rango</span>
	</div>
	<ul class="creature-list">
		{#each creatures as creature (creature.id)}
			{@const isSelected = creature.id === selectedCreatureId}
			<li>
				<button
					type="button"
					class="creature-row catalogue-grid"
					aria-pressed={isSelected}
					onclick={() => onSelect(creature)}
				>
					<span class="creature-name">{creature.name}</span>
					<span class="creature-lineage">
						<span class="sr-only">Linaje</span>
						{creature.lineage}
					</span>
					<span class="creature-tier">Rango {creature.tier}</span>
				</button>
			</li>
		{/each}
	</ul>
{/if}

<style>
	.catalogue-grid {
		display: grid;
		grid-template-columns: minmax(0, 2fr) minmax(0, 1fr) 4.5rem;
		align-items: baseline;
		gap: var(--spacing-sm);
		padding: var(--spacing-sm);
	}

	.catalogue-header {
		/* Mirrors the row border width so header text aligns with row content. */
		border: 1px solid transparent;
		color: var(--text-secondary);
		font-size: 0.875rem;
	}

	.creature-list {
		display: flex;
		flex-direction: column;
		gap: var(--spacing-xs);
		margin: 0;
		padding: 0;
		list-style: none;
	}

	.creature-row {
		width: 100%;
		border: 1px solid var(--border-color);
		border-radius: var(--radius-md);
		background-color: var(--secondary-bg);
		color: var(--text-primary);
		cursor: pointer;
		text-align: left;
	}

	.creature-row:hover {
		background-color: var(--primary-bg);
	}

	.creature-row[aria-pressed='true'] {
		border-color: var(--text-primary);
		background-color: var(--primary-bg);
	}

	.creature-name {
		font-weight: 600;
	}

	.creature-lineage,
	.creature-tier {
		color: var(--text-secondary);
		font-size: 0.875rem;
	}

	.sr-only {
		position: absolute;
		width: 1px;
		height: 1px;
		padding: 0;
		margin: -1px;
		overflow: hidden;
		clip: rect(0, 0, 0, 0);
		white-space: nowrap;
		border: 0;
	}

	.empty-state {
		margin: 0;
		padding: var(--spacing-md);
		border: 1px dashed var(--border-color);
		border-radius: var(--radius-md);
		color: var(--text-secondary);
		text-align: center;
	}
</style>
