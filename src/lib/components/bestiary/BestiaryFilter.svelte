<script lang="ts">
	import Container from '$lib/components/ui/Container.svelte';
	import type { Creature } from '$lib/types/creature';

	type BestiaryFilters = {
		name: string;
		tier: string; // keep as string to mirror query param handling (empty string = all)
	};

	type Props = {
		creatures: Creature[];
		filters: BestiaryFilters;
		onFiltersChange: (filters: BestiaryFilters) => void;
		onResetFilters: () => void;
	};

	let { creatures, filters: receivedFilters, onFiltersChange, onResetFilters }: Props = $props();

	let filters = $derived(receivedFilters);

	const getAvailableTiers = (): number[] => {
		const tiers = new Set<number>(creatures.map((c) => c.tier));
		return Array.from(tiers).sort((a, b) => a - b);
	};
</script>

<Container>
	<div class="filters">
		<input
			type="text"
			placeholder="Buscar por nombre"
			value={filters.name}
			oninput={(e) => onFiltersChange({ ...filters, name: (e.target as HTMLInputElement).value })}
		/>
		<select
			onchange={(e) => onFiltersChange({ ...filters, tier: (e.target as HTMLSelectElement).value })}
		>
			<option value="" selected={!filters.tier}>Todos los Rangos</option>
			{#each getAvailableTiers() as t (t)}
				<option value={`${t}`} selected={filters.tier === String(t)}>Rango {t}</option>
			{/each}
		</select>
		<button onclick={() => onResetFilters()}>Limpiar Filtros</button>
	</div>
</Container>

<style>
	.filters {
		display: flex;
		flex-direction: row;
		justify-content: space-evenly;
		align-items: center;
		gap: var(--spacing-md);
		flex-grow: 1;
		flex-wrap: wrap;

		input {
			flex: 1;
			min-width: 300px;
		}

		select {
			width: 200px;
			padding: var(--spacing-sm);
		}
	}
</style>
