<script lang="ts">
	import type { CardFilters } from '$lib/types/card-filters';
	import type { Card } from '$lib/types/cards/card';
	import { capitalize } from '$lib/utils/formatting';
	import Container from '../ui/Container.svelte';
	import MultiSelect from '../ui/MultiSelect.svelte';

	type Props = {
		cards: Card[];
		filters: CardFilters;
		onFiltersChange: (filters: CardFilters) => void;
		onResetFilters: () => void;
		includeOnlyAvailablesFilter?: boolean;
	};

	let {
		cards,
		filters: receivedFilters,
		onFiltersChange,
		onResetFilters,
		includeOnlyAvailablesFilter = false,
	}: Props = $props();

	let filters = $derived(receivedFilters);

	const getAvailableLevels = () => {
		const levels = new Set(cards.map((card) => card.level));
		return Array.from(levels).sort((a, b) => a - b);
	};

	const getAvailableTags = () => {
		const tags = new Set(cards.flatMap((card) => card.tags));
		return Array.from(tags).sort();
	};

	const getAvailableTypes = () => {
		const types = new Set(cards.map((card) => card.type));
		return Array.from(types).sort();
	};
</script>

<Container>
	<div class="filters">
		<input
			type="text"
			placeholder="Buscar por nombre"
			bind:value={filters.name}
			oninput={() => onFiltersChange({ ...filters })}
		/>
		<select
			onchange={(event) => {
				filters.type = (event.target as HTMLSelectElement).value;
				onFiltersChange({ ...filters });
			}}
		>
			<option value="">Todos los Tipos</option>
			{#each getAvailableTypes() as type (type)}
				<option value={type}>{capitalize(type)}</option>
			{/each}
		</select>
		<MultiSelect
			summary="Niveles"
			options={getAvailableLevels().map((x) => ({ value: x, label: `Nivel ${x}` }))}
			value={filters.level}
			onChange={(values: any[]) => {
				filters.level = values;
				onFiltersChange({ ...filters });
			}}
		/>
		<MultiSelect
			summary="Etiquetas"
			options={getAvailableTags().map((x) => ({ value: x.toLowerCase(), label: x }))}
			value={filters.tags}
			onChange={(values: any[]) => {
				filters.tags = values.map((x) => x.toLowerCase());
				onFiltersChange({ ...filters });
			}}
		/>
		{#if includeOnlyAvailablesFilter}
			<div class="only-availables-field">
				<label for="only-availables"
					><input
						type="checkbox"
						id="only-availables"
						checked={filters.onlyAvailables}
						oninput={(event: Event) => {
							filters.onlyAvailables = (event.target as HTMLInputElement).checked;
							onFiltersChange({ ...filters });
						}}
					/>Ver Solo disponibles
				</label>
			</div>
		{/if}
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

		.only-availables-field {
			label {
				display: flex;
				flex-direction: row;
				align-items: center;
				justify-content: start;
				gap: var(--spacing-sm);
				cursor: pointer;
				input {
					min-width: auto;
				}
			}
		}
	}
</style>
