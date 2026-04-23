<script lang="ts">
	import Modal from '$lib/components/ui/Modal.svelte';
	import type { Card } from '$lib/types/cards/card';
	import CardLibraryItem from './CardLibraryItem.svelte';

	type Props = {
		opened: boolean;
		currentPP: number;
		onClose: () => void;
		onAddCard: (card: Card) => void;
		onPurchaseCard: (card: Card) => void;
		children?: import('svelte').Snippet;
	};

	let { opened, currentPP, onClose, onAddCard, onPurchaseCard, children }: Props = $props();

	const handleAddFree = (card: Card) => {
		onAddCard(card);
	};

	const handlePurchase = (card: Card) => {
		onPurchaseCard(card);
	};

	const handleClose = () => {
		onClose();
	};
</script>

<Modal opened={opened} title="Biblioteca de Cartas" onClose={handleClose}>
	<div class="cards-list">
		{@render children?.()}
	</div>

	{#snippet footer()}
		<span class="pp-info">PP disponibles: {currentPP}</span>
		<button onclick={handleClose}>Cerrar</button>
	{/snippet}
</Modal>

<style>
	.cards-list {
		display: flex;
		flex-direction: column;
		max-height: 400px;
		overflow-y: auto;
		width: 100%;
	}

	.pp-info {
		color: var(--text-secondary);
		font-size: 0.9rem;
	}
</style>
