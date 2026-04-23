<script lang="ts">
	import type { Card } from '$lib/types/cards/card';

	type Props = {
		card: Card;
		currentPP: number;
		onAddFree: (card: Card) => void;
		onPurchase: (card: Card) => void;
	};

	let { card, currentPP, onAddFree, onPurchase }: Props = $props();

	const costValue = $derived(() => {
		const cost = (card as any).cost;
		return cost ? parseInt(cost) || 0 : 0;
	});
	const canPurchase = $derived(currentPP >= costValue());
</script>

<div class="card-library-item">
	<div class="card-info">
		<span class="card-name">{card.name}</span>
		<span class="card-meta">
			Nivel {card.level} | {card.type}
		</span>
	</div>
	<div class="card-actions">
		<button onclick={() => onAddFree(card)} class="btn-add-free" title="Agregar gratuitamente">
			Agregar gratis
		</button>
		<button
			onclick={() => onPurchase(card)}
			class="btn-purchase"
			class:disabled={!canPurchase}
			disabled={!canPurchase}
			title={!canPurchase
				? `PP insuficiente (tienes ${currentPP} PP)`
				: `Comprar por ${costValue()} PP`}
		>
			Comprar por {costValue()}PP
		</button>
	</div>
</div>

<style>
	.card-library-item {
		display: flex;
		flex-direction: row;
		justify-content: space-between;
		align-items: center;
		padding: var(--spacing-sm) var(--spacing-md);
		border-bottom: 1px solid var(--border-color);
		gap: var(--spacing-md);
	}

	.card-library-item:last-child {
		border-bottom: none;
	}

	.card-info {
		display: flex;
		flex-direction: column;
		gap: 2px;
		flex: 1;
	}

	.card-name {
		font-weight: 600;
		color: var(--text-primary);
	}

	.card-meta {
		color: var(--text-secondary);
		font-size: 0.8rem;
	}

	.card-actions {
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