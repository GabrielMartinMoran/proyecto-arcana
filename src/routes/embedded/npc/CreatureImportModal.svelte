<script lang="ts">
	import { onMount } from 'svelte';
	import { useCreaturesService } from '$lib/services/creatures-service';
	import type { Creature } from '$lib/types/creature';
	import { dump } from 'js-yaml';

	interface Props {
		onSelect: (yamlText: string) => void;
		onClose: () => void;
		open: boolean;
	}

	let { onSelect, onClose, open = $bindable(false) }: Props = $props();

	const { loadCreatures, creatures } = useCreaturesService();

	let nameFilter = $state('');
	let tierFilter = $state('');

	let filteredCreatures = $derived(
		($creatures || []).filter((c) => {
			const nameOk = !nameFilter || c.name.toLowerCase().includes(nameFilter.toLowerCase());
			const tierOk = !tierFilter || c.tier === parseInt(tierFilter);
			return nameOk && tierOk;
		}),
	);

	let availableTiers = $derived(
		Array.from(new Set(($creatures || []).map((c) => c.tier))).sort((a, b) => a - b),
	);

	onMount(async () => {
		await loadCreatures();
	});

	function selectCreature(creature: Creature) {
		// Convert creature to YAML string, excluding the id
		const { id, ...creatureWithoutId } = creature;
		const yamlText = dump(creatureWithoutId, { indent: 2, lineWidth: 100 });
		onSelect(yamlText);
		open = false;
	}
</script>

{#if open}
	<div class="modal-backdrop" onclick={onClose} role="presentation">
		<div class="modal-content" onclick={(e) => e.stopPropagation()}>
			<div class="modal-header">
				<h3>Importar del Bestiario</h3>
				<button onclick={onClose} class="close-btn">✕</button>
			</div>

			<div class="filters">
				<input type="text" placeholder="Buscar por nombre..." bind:value={nameFilter} />
				<select bind:value={tierFilter}>
					<option value="">Todos los tiers</option>
					{#each availableTiers as tier}
						<option value={tier.toString()}>Tier {tier}</option>
					{/each}
				</select>
			</div>

			<div class="creature-list">
				{#each filteredCreatures as creature (creature.id)}
					<button class="creature-item" onclick={() => selectCreature(creature)}>
						<span class="creature-name">{creature.name}</span>
						<span class="creature-tier">Tier {creature.tier}</span>
					</button>
				{:else}
					<p class="empty-state">No hay criaturas que coincidan con los filtros.</p>
				{/each}
			</div>
		</div>
	</div>
{/if}

<style>
	.modal-backdrop {
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		background: rgba(0, 0, 0, 0.5);
		display: flex;
		align-items: top;
		justify-content: center;
		padding-top: var(--spacing-lg);
		z-index: 1000;
	}

	.modal-content {
		background: var(--primary-bg);
		border: 1px solid var(--border-color);
		border-radius: 8px;
		width: 90%;
		max-width: 500px;
		max-height: 80vh;
		display: flex;
		flex-direction: column;
		overflow: hidden;
	}

	.modal-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 1rem;
		border-bottom: 1px solid var(--border-color);
	}

	.modal-header h3 {
		margin: 0;
		font-size: 1.1rem;
	}

	.close-btn {
		padding: 0.25rem 0.5rem;
		background: transparent;
		border: none;
		font-size: 1.25rem;
		cursor: pointer;
	}

	.filters {
		padding: 1rem;
		display: flex;
		gap: 0.5rem;
		border-bottom: 1px solid var(--border-color);
	}

	.filters input,
	.filters select {
		flex: 1;
		padding: 0.5rem;
		border: 1px solid var(--border-color);
		border-radius: 4px;
		background: var(--secondary-bg);
	}

	.creature-list {
		flex: 1;
		overflow-y: auto;
		padding: 0.5rem;
	}

	.creature-item {
		width: 100%;
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 0.75rem;
		margin-bottom: 0.5rem;
		border: 1px solid var(--border-color);
		border-radius: 4px;
		background: var(--secondary-bg);
		cursor: pointer;
		text-align: left;
	}

	.creature-item:hover {
		background: var(--background);
		border-color: var(--primary);
	}

	.creature-name {
		font-weight: 500;
	}

	.creature-tier {
		font-size: 0.9rem;
		color: var(--muted-text);
	}

	.empty-state {
		text-align: center;
		padding: 2rem;
		color: var(--muted-text);
	}
</style>
