<script lang="ts">
	import type { ItemCategory } from '$lib/types/item';
	import { CATEGORY_LABELS } from '$lib/types/item';

	type Props = {
		selectedCategory: ItemCategory | null;
		searchQuery: string;
		onCategoryChange: (category: ItemCategory | null) => void;
		onSearchChange: (query: string) => void;
	};

	let { selectedCategory, searchQuery, onCategoryChange, onSearchChange }: Props = $props();
</script>

<div class="item-category-filter">
	<div class="search-container">
		<input
			type="text"
			placeholder="Buscar por nombre..."
			value={searchQuery}
			oninput={(e) => onSearchChange(e.currentTarget.value)}
			class="search-input"
		/>
	</div>
	<div class="category-container">
		<select
			value={selectedCategory ?? ''}
			onchange={(e) => {
				const value = e.currentTarget.value;
				onCategoryChange(value ? (value as ItemCategory) : null);
			}}
			class="category-select"
		>
			<option value="">Todas las categorías</option>
			{#each Object.entries(CATEGORY_LABELS).filter(([key]) => key !== 'services') as [key, label] (key)}
				<option value={key}>{label}</option>
			{/each}
		</select>
	</div>
</div>

<style>
	.item-category-filter {
		display: flex;
		flex-direction: row;
		flex-wrap: wrap;
		gap: var(--spacing-sm);
		padding: var(--spacing-md);
		background-color: var(--secondary-bg);
		border-radius: var(--radius-md);
	}

	.search-container {
		width: 100%;
	}

	.search-input {
		width: 100%;
		padding: var(--spacing-sm) var(--spacing-md);
		border: 1px solid var(--border-color);
		border-radius: var(--radius-md);
		background-color: var(--secondary-bg);
		color: var(--text-primary);
		font-size: 0.9rem;
	}

	.search-input:focus {
		outline: none;
		border-color: #f59e0b;
	}

	.search-input::placeholder {
		color: var(--text-secondary);
	}

	.category-container {
		width: 100%;
	}

	.category-select {
		width: 100%;
		padding: var(--spacing-sm) var(--spacing-md);
		border: 1px solid var(--border-color);
		border-radius: var(--radius-md);
		background-color: var(--secondary-bg);
		color: var(--text-primary);
		font-size: 0.9rem;
		cursor: pointer;
	}

	.category-select:focus {
		outline: none;
		border-color: #f59e0b;
	}
</style>
