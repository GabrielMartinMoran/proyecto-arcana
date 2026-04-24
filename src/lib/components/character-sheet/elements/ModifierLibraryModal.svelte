<script lang="ts">
	import Modal from '$lib/components/ui/Modal.svelte';
	import type { LibraryModifier } from '$lib/types/modifier';
	import { modifiersService } from '$lib/services/modifiers-service';
	import ModifierLibraryItem from './ModifierLibraryItem.svelte';

	type Props = {
		opened: boolean;
		onClose: () => void;
		onAddModifier: (modifier: LibraryModifier) => void;
	};

	let { opened, onClose, onAddModifier }: Props = $props();

	let selectedCategory: string | null = $state(null);
	let searchQuery = $state('');
	let filteredModifiers = $state<LibraryModifier[]>([]);
	let categories = $state<string[]>([]);

	const loadLibraryModifiers = async () => {
		await modifiersService.loadModifiers();
		if (!opened) return;
		categories = modifiersService.getCategories();
		filteredModifiers = modifiersService.getModifiers();
	};

	$effect(() => {
		if (opened) {
			void loadLibraryModifiers();
		}
	});

	$effect(() => {
		if (opened) {
			filteredModifiers = filterModifiers(selectedCategory, searchQuery);
		}
	});

	const filterModifiers = (category: string | null, search: string): LibraryModifier[] => {
		let result = modifiersService.getModifiers();

		if (category) {
			result = result.filter((m) => m.category === category);
		}

		if (search.trim()) {
			const lowerSearch = search.toLowerCase();
			result = result.filter(
				(m) =>
					m.name.toLowerCase().includes(lowerSearch) ||
					m.description.toLowerCase().includes(lowerSearch),
			);
		}

		return result;
	};

	const handleCategoryChange = (category: string | null) => {
		selectedCategory = category;
	};

	const handleSearchChange = (query: string) => {
		searchQuery = query;
	};

	const handleClose = () => {
		onClose();
	};

	const handleAdd = (modifier: LibraryModifier) => {
		onAddModifier(modifier);
		handleClose();
	};
</script>

<Modal {opened} title="Biblioteca de Modificadores" onClose={handleClose}>
	<div class="filters">
		<div class="search-box">
			<input
				type="text"
				placeholder="Buscar modificadores..."
				bind:value={searchQuery}
				oninput={(e) => handleSearchChange(e.currentTarget.value)}
			/>
		</div>
		<div class="category-tabs">
			<button
				class="category-tab"
				class:active={selectedCategory === null}
				onclick={() => handleCategoryChange(null)}
			>
				Todos
			</button>
			{#each categories as category (category)}
				<button
					class="category-tab"
					class:active={selectedCategory === category}
					onclick={() => handleCategoryChange(category)}
				>
					{category}
				</button>
			{/each}
		</div>
	</div>
	<div class="modifiers-list">
		{#if filteredModifiers.length > 0}
			{#each filteredModifiers as modifier (modifier.id)}
				<ModifierLibraryItem {modifier} onAdd={handleAdd} />
			{/each}
		{:else}
			<div class="empty">No se encontraron modificadores</div>
		{/if}
	</div>

	{#snippet footer()}
		<span class="results-count"
			>{filteredModifiers.length}
			{filteredModifiers.length === 1 ? 'resultado' : 'resultados'}</span
		>
		<button onclick={handleClose}>Cerrar</button>
	{/snippet}
</Modal>

<style>
	.filters {
		display: flex;
		flex-direction: column;
		gap: var(--spacing-sm);
	}

	.search-box input {
		width: 100%;
		padding: var(--spacing-sm);
		border: 1px solid var(--border-color);
		border-radius: var(--radius-md);
		background-color: var(--primary-bg);
		color: var(--text-primary);
		font-size: 0.9rem;
	}

	.category-tabs {
		display: flex;
		flex-direction: row;
		flex-wrap: wrap;
		gap: var(--spacing-xs);
	}

	.category-tab {
		padding: var(--spacing-xs) var(--spacing-sm);
		background-color: var(--primary-bg);
		color: var(--text-secondary);
		border: 1px solid var(--border-color);
		border-radius: var(--radius-md);
		cursor: pointer;
		font-size: 0.8rem;
		transition: all 0.2s;
		text-transform: capitalize;
	}

	.category-tab:hover {
		background-color: var(--secondary-bg);
		color: var(--text-primary);
	}

	.category-tab.active {
		background-color: var(--color-primary);
		color: white;
		border-color: var(--color-primary);
	}

	.modifiers-list {
		display: flex;
		flex-direction: column;
		max-height: 400px;
		overflow-y: auto;
		width: 100%;
	}

	.empty {
		display: flex;
		justify-content: center;
		align-items: center;
		padding: var(--spacing-xl);
		color: var(--text-secondary);
		font-style: italic;
	}

	.results-count {
		color: var(--text-secondary);
		font-size: 0.9rem;
	}
</style>
