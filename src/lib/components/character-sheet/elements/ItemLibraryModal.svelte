<script lang="ts">
	import Modal from '$lib/components/ui/Modal.svelte';
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

<Modal opened={opened} title="Biblioteca de Objetos" onClose={handleClose}>
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
	
	{#snippet footer()}
		<span class="results-count"
			>{filteredItems.length}
			{filteredItems.length === 1 ? 'resultado' : 'resultados'}</span
		>
		<button onclick={handleClose}>Cerrar</button>
	{/snippet}
</Modal>

<style>
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

	.results-count {
		color: var(--text-secondary);
		font-size: 0.9rem;
	}
</style>
