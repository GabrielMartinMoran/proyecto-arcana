<script lang="ts">
	import { clickOutsideDetector } from '$lib/utils/outside-click-detector';
	import type { LibraryItem, ItemCategory } from '$lib/types/item';
	import { itemsService } from '$lib/services/items-service';
	import ItemCategoryFilter from './ItemCategoryFilter.svelte';
	import ItemLibraryItem from './ItemLibraryItem.svelte';

	type Props = {
		opened: boolean;
		currentGold: number;
		onClose: () => void;
		onAddItem: (item: LibraryItem, isPurchase: boolean) => void;
	};

	let { opened, currentGold, onClose, onAddItem }: Props = $props();

	let selectedCategory: ItemCategory | null = $state(null);
	let searchQuery = $state('');
	let filteredItems = $state<LibraryItem[]>([]);

	$effect(async () => {
		if (opened) {
			await itemsService.loadItems();
			filteredItems = itemsService.getItems();
		}
	});

	$effect(() => {
		if (opened) {
			filteredItems = itemsService.filterItems(selectedCategory, searchQuery);
		}
	});

	const handleCategoryChange = (category: ItemCategory | null) => {
		selectedCategory = category;
	};

	const handleSearchChange = (query: string) => {
		searchQuery = query;
	};

	const handleClose = () => {
		onClose();
	};

	const handleAddFree = (item: LibraryItem) => {
		onAddItem(item, false);
	};

	const handlePurchase = (item: LibraryItem) => {
		onAddItem(item, true);
	};
</script>

{#if opened}
	<div class="item-library-modal" use:clickOutsideDetector onoutsideclick={handleClose}>
		<div class="modal-content">
			<div class="modal-header">
				<h3>Biblioteca de Objetos</h3>
				<button onclick={handleClose} class="close-btn" title="Cerrar">✕</button>
			</div>
			<div class="modal-body">
				<ItemCategoryFilter
					{selectedCategory}
					{searchQuery}
					onCategoryChange={handleCategoryChange}
					onSearchChange={handleSearchChange}
				/>
				<div class="items-list">
					{#if filteredItems.length > 0}
						{#each filteredItems as item (item.id)}
							<ItemLibraryItem
								{item}
								{currentGold}
								onAddFree={handleAddFree}
								onPurchase={handlePurchase}
							/>
						{/each}
					{:else}
						<div class="empty">No se encontraron objetos</div>
					{/if}
				</div>
			</div>
			<div class="modal-footer">
				<span class="results-count"
					>{filteredItems.length}
					{filteredItems.length === 1 ? 'resultado' : 'resultados'}</span
				>
				<button onclick={handleClose}>Cerrar</button>
			</div>
		</div>
	</div>
{/if}

<style>
	.item-library-modal {
		position: fixed;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		background-color: rgba(0, 0, 0, 0.5);
		display: flex;
		justify-content: center;
		align-items: center;
		z-index: 1000;
	}

	.modal-content {
		background-color: var(--secondary-bg);
		border-radius: var(--radius-md);
		width: 90%;
		max-width: 600px;
		max-height: 80vh;
		display: flex;
		flex-direction: column;
		box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
	}

	.modal-header {
		display: flex;
		flex-direction: row;
		justify-content: space-between;
		align-items: center;
		padding: var(--spacing-md);
		border-bottom: 1px solid var(--border-color);
	}

	.modal-header h3 {
		margin: 0;
		color: var(--text-primary);
	}

	.close-btn {
		background: none;
		border: none;
		color: var(--text-secondary);
		font-size: 1.2rem;
		cursor: pointer;
		padding: var(--spacing-xs);
	}

	.close-btn:hover {
		color: var(--text-primary);
	}

	.modal-body {
		flex: 1;
		overflow-y: auto;
		padding: var(--spacing-md);
		display: flex;
		flex-direction: column;
		gap: var(--spacing-md);
	}

	.items-list {
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

	.modal-footer {
		display: flex;
		flex-direction: row;
		justify-content: space-between;
		align-items: center;
		padding: var(--spacing-md);
		border-top: 1px solid var(--border-color);
	}

	.results-count {
		color: var(--text-secondary);
		font-size: 0.9rem;
	}

	.modal-footer button {
		padding: var(--spacing-sm) var(--spacing-lg);
		background-color: var(--secondary-bg);
		color: var(--text-primary);
		border: 1px solid var(--border-color);
		border-radius: var(--radius-md);
		cursor: pointer;
	}

	.modal-footer button:hover {
		background-color: var(--primary-bg);
	}
</style>
