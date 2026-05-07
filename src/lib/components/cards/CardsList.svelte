<script lang="ts">
	import type { Card as CardType } from '$lib/types/cards/card';
	import type { ItemCard } from '$lib/types/cards/item-card';
	import type { CharacterCard } from '$lib/types/character';
	import { CONFIG } from '../../../config';
	import Card from './Card.svelte';
	import ReloadControl from './ReloadControl.svelte';

	type Props = {
		cards: CardType[];
		readonly?: boolean;
		characterCards?: CharacterCard[];
		listMode?: 'active' | 'collection' | 'all';
		onChange?: (characterCards: CharacterCard[]) => void;
		onCardReloadClick?: (cardId: string) => void;
		onEditCard?: (card: CardType) => void;
		// For purchase button in 'all' listMode
		currentPP?: number;
		currentGold?: number;
		onPurchaseCard?: (card: CardType) => void;
	};

	let {
		cards,
		readonly = true,
		characterCards: initialCharacterCards = [],
		listMode = 'all',
		onChange = () => {},
		onCardReloadClick = () => {},
		onEditCard = () => {},
		currentPP = 0,
		currentGold = 0,
		onPurchaseCard = () => {},
	}: Props = $props();

	let characterCards = $derived(initialCharacterCards);

	const deactivateCard = (cardId: string) => {
		const originalCard = cards.find((card) => card.id === cardId);
		if (!originalCard) {
			removeCard(cardId);
			return;
		}
		characterCards = characterCards.map((card) => {
			if (card.id === cardId) {
				return { ...card, isActive: false, uses: getCardTotalUses(originalCard) };
			}
			return card;
		});
		onChange(characterCards);
	};

	const activateCard = (cardId: string) => {
		characterCards = characterCards.map((card) => {
			if (card.id === cardId) {
				return { ...card, isActive: true };
			}
			return card;
		});
		onChange(characterCards);
	};

	const removeCard = (cardId: string) => {
		characterCards = characterCards.filter((card) => card.id !== cardId);
		onChange(characterCards);
	};

	const addCard = (card: CardType) => {
		characterCards = [
			...characterCards,
			{
				id: card.id,
				uses: getCardTotalUses(card),
				isActive: false,
				level: card.level,
				cardType: card.cardType,
				isOvercharged: false,
			} as CharacterCard,
		];
		onChange(characterCards);
	};

	const updateCardCurrentUses = (cardId: string, value: number) => {
		characterCards = characterCards.map((card) => {
			if (card.id === cardId) {
				return { ...card, uses: value };
			}
			return card;
		});
		onChange(characterCards);
	};

	const getCurrentUses = (cardId: string) => {
		const card = characterCards.find((card) => card.id === cardId);
		return card ? card.uses : 0;
	};

	const getCardTotalUses = (card: CardType) => {
		if (card.uses.type === null) return null;
		switch (card.uses.type) {
			case 'USES':
			case 'LONG_REST':
			case 'DAY':
				return card.uses.qty ?? 0;
			case 'RELOAD':
				return CONFIG.RELOAD_CARD_USES;
			default:
				return null;
		}
	};

	const isReloadableCard = (card: CardType) => {
		return card.uses.type === 'RELOAD';
	};

	const toggleOverload = (cardId: string) => {
		const updated = characterCards.map((card) =>
			card.id === cardId ? { ...card, isOvercharged: !card.isOvercharged } : card,
		);
		onChange(updated);
	};

	const isCardActive = (card: CardType) => {
		const found = characterCards.find((x) => x.id === card.id);
		return found ? found.isActive : false;
	};
</script>

<div class="cards">
	{#each cards as card (card.id)}
		{@const characterCard = characterCards.find((cc) => cc.id === card.id)}
		{@const isCustom = card.id.startsWith('custom-')}
		<Card {card} isOvercharged={characterCard?.isOvercharged ?? false} {isCustom}>
			{#if !readonly}
				{#if listMode === 'active'}
					<div class="active-controls">
						{#if getCardTotalUses(card) !== null}
							<ReloadControl
								value={getCurrentUses(card.id)!}
								max={getCardTotalUses(card)!}
								onValueChange={(value) => updateCardCurrentUses(card.id, value)}
								onReload={() => onCardReloadClick(card.id)}
								reloadDisabled={getCurrentUses(card.id) === getCardTotalUses(card) ||
									(characterCard?.isOvercharged ?? false)}
								reloadButtonHiden={!isReloadableCard(card)}
							/>
						{/if}
						{#if card.type === 'activable' && card.uses.type === 'RELOAD'}
							<label
								class="overload-checkbox boxed-control button-height-rhythm"
								title="Sobrecargada"
							>
								<input
									type="checkbox"
									checked={characterCard?.isOvercharged ?? false}
									onchange={() => toggleOverload(card.id)}
								/>
								<span class="indicator" aria-hidden="true">⚡</span>
								<span class="label-text">Sob</span>
							</label>
						{/if}
					</div>
					<div class="card-actions one active-one">
						<button onclick={() => deactivateCard(card.id)}>Desactivar</button>
					</div>
				{:else if listMode === 'collection'}
					{@const showEdit = isCustom}
					{@const showActivate = card.type === 'activable'}
					{@const actionCount = [showEdit, true, showActivate].filter(Boolean).length}
					{@const actionLayoutClass =
						actionCount === 1
							? 'one'
							: actionCount === 2
								? 'two'
								: actionCount === 3
									? 'three'
									: ''}
					<div class="card-actions {actionLayoutClass}">
						<button onclick={() => removeCard(card.id)}>Quitar</button>
						{#if showEdit}
							<button onclick={() => onEditCard(card)}>Editar</button>
						{/if}
						{#if showActivate}
							{#if isCardActive(card)}
								<button onclick={() => deactivateCard(card.id)}>Desactivar</button>
							{:else}
								<button onclick={() => activateCard(card.id)}>Activar</button>
							{/if}
						{/if}
					</div>
				{:else}
					<div class="card-actions">
						<button onclick={() => addCard(card)} class="btn-add">Agregar</button>
						{#if card.cardType === 'ability'}
							{@const levelValue = (card as any).level ? parseInt((card as any).level) || 1 : 1}
							{@const costValue = CONFIG.CARD_LEVEL_PP_COST[levelValue] || 0}
							{@const canPurchase = currentPP >= costValue}
							{#if costValue > 0}
								<button
									onclick={() => onPurchaseCard(card)}
									class="btn-purchase"
									class:disabled={!canPurchase}
									disabled={!canPurchase}
									title={!canPurchase
										? `PP insuficiente (tienes ${currentPP} PP)`
										: `Comprar (${costValue} PP)`}
								>
									Comprar ({costValue} PP)
								</button>
							{/if}
						{:else if card.cardType === 'item'}
							{@const itemCost = parseFloat((card as ItemCard).cost)}
							{#if !isNaN(itemCost) && itemCost > 0}
								{@const canPurchase = currentGold !== undefined && currentGold >= itemCost}
								<button
									onclick={() => onPurchaseCard(card)}
									class="btn-purchase"
									class:disabled={!canPurchase}
									disabled={!canPurchase}
									title={!canPurchase
										? `Oro insuficiente (tienes ${currentGold} o)`
										: `Comprar (${itemCost} o)`}
								>
									Comprar ({itemCost} o)
								</button>
							{/if}
						{/if}
					</div>
				{/if}
			{/if}
		</Card>
	{/each}
</div>

<style>
	.cards {
		display: flex;
		flex-direction: row;
		flex-wrap: wrap;
		align-items: center;
		justify-content: space-around;
		width: 100%;
		gap: var(--spacing-md);
		padding: var(--spacing-sm);

		.card-actions {
			display: flex;
			flex-direction: row;
			align-items: center;
			justify-content: space-between;
			flex-grow: 1;
			padding-top: var(--spacing-sm);
			gap: var(--spacing-sm);
		}

		.card-actions.one {
			justify-content: flex-start;
		}

		.card-actions.active-one {
			justify-content: flex-end;
		}

		.card-actions {
			&.two,
			&.three {
				justify-content: space-between;
			}
		}

		.active-controls {
			display: flex;
			flex-direction: row;
			align-items: center;
			justify-content: flex-start;
			flex-grow: 1;
			padding-top: var(--spacing-sm);
			gap: var(--spacing-sm);
		}

		.btn-add {
			background-color: var(--secondary-bg);
			color: var(--text-primary);
			border: 1px solid var(--border-color);
			border-radius: var(--radius-md);
			cursor: pointer;
			font-size: 0.8rem;
		}

		.btn-add:hover {
			background-color: var(--primary-bg);
		}

		.btn-purchase {
			background-color: #f59e0b;
			color: #ffffff;
			border: none;
			border-radius: var(--radius-md);
			cursor: pointer;
			font-size: 0.8rem;
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

		.overload-checkbox {
			display: inline-flex;
			align-items: center;
			gap: var(--spacing-xs);
			font-size: 0.875rem;
			color: var(--color-text);
			cursor: pointer;
		}

		.overload-checkbox.boxed-control {
			justify-content: center;
			padding: calc(var(--spacing-xs) + 1px) var(--spacing-sm);
			border: 1px solid var(--border-color);
			border-radius: var(--radius-md);
			background: var(--secondary-bg);
			box-shadow: var(--shadow-sm);
		}

		.button-height-rhythm {
			box-sizing: border-box;
			min-height: calc((1rem * 1.25) + (var(--spacing-sm) * 2) + 2px);
		}

		.overload-checkbox input[type='checkbox'] {
			accent-color: var(--color-warning);
		}

		.overload-checkbox .indicator {
			line-height: 1;
		}

		.overload-checkbox .label-text {
			line-height: 1;
		}
	}
</style>
