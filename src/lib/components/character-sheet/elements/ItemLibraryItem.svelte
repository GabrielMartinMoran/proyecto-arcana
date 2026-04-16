<script lang="ts">
	import type { LibraryItem } from '$lib/types/item';

	type Props = {
		item: LibraryItem;
		currentGold: number;
		onAddFree: (item: LibraryItem) => void;
		onPurchase: (item: LibraryItem) => void;
	};

	let { item, currentGold, onAddFree, onPurchase }: Props = $props();

	const canPurchase = $derived(currentGold >= item.price);
</script>

<div class="item-library-item">
	<div class="item-info">
		<span class="item-name">{item.name} ({item.price} o)</span>
		<span class="item-notes">
			{#if item.category === 'armors'}
				Mitigación Física {item.physicalMitigation}
			{:else if item.category === 'weapons'}
				{@const weaponDetails = [item.damage, item.type, item.properties]
					.filter(Boolean)
					.join(', ')}
				Daño {weaponDetails}
			{:else}
				{item.notes}
			{/if}
		</span>
	</div>
	<div class="item-actions">
		<button onclick={() => onAddFree(item)} class="btn-add-free" title="Agregar gratuitamente">
			Agregar gratis
		</button>
		<button
			onclick={() => onPurchase(item)}
			class="btn-purchase"
			class:disabled={!canPurchase}
			disabled={!canPurchase}
			title={!canPurchase
				? `Oro insuficiente (tienes ${currentGold} o)`
				: `Comprar por ${item.price} o`}
		>
			Comprar
		</button>
	</div>
</div>

<style>
	.item-library-item {
		display: flex;
		flex-direction: row;
		justify-content: space-between;
		align-items: center;
		padding: var(--spacing-sm) var(--spacing-md);
		border-bottom: 1px solid var(--border-color);
		gap: var(--spacing-md);
	}

	.item-library-item:last-child {
		border-bottom: none;
	}

	.item-info {
		display: flex;
		flex-direction: column;
		gap: 2px;
		flex: 1;
	}

	.item-name {
		font-weight: 600;
		color: var(--text-primary);
	}

	.item-notes {
		color: var(--text-secondary);
		font-size: 0.8rem;
	}

	.item-actions {
		display: flex;
		flex-direction: row;
		gap: var(--spacing-sm);
	}

	.btn-add-free,
	.btn-purchase {
		padding: var(--spacing-xs) var(--spacing-sm);
		border: none;
		border-radius: var(--radius-md);
		cursor: pointer;
		font-size: 0.8rem;
		transition: all 0.2s;
	}

	.btn-add-free {
		background-color: var(--secondary-bg);
		color: var(--text-primary);
		border: 1px solid var(--border-color);
	}

	.btn-add-free:hover {
		background-color: var(--primary-bg);
	}

	.btn-purchase {
		background-color: #f59e0b;
		color: #ffffff;
	}

	.btn-purchase:hover:not(.disabled) {
		filter: brightness(1.1);
	}

	.btn-purchase.disabled {
		background-color: var(--primary-bg);
		color: var(--text-secondary);
		cursor: not-allowed;
		opacity: 0.6;
	}
</style>
