<script lang="ts">
	import type { Card as CardType } from '$lib/types/card';
	import type { CharacterCard } from '$lib/types/character';
	import { CONFIG } from '../../../config';
	import InputField from '../ui/InputField.svelte';
	import Card from './Card.svelte';

	type Props = {
		cards: CardType[];
		readonly?: boolean;
		characterCards?: CharacterCard[];
		listMode?: 'active' | 'collection' | 'all';
		onChange?: (characterCards: CharacterCard[]) => void;
		onCardReloadClick?: (cardId: string) => void;
	};

	let {
		cards,
		readonly = true,
		characterCards: initialCharacterCards = [],
		listMode = 'all',
		onChange = () => {},
		onCardReloadClick = () => {},
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
				return card.uses.qty ?? 0;
			case 'RELOAD':
				return CONFIG.RELOAD_CARD_USES;
			default:
				return null;
		}
	};

	const isCardActive = (card: CardType) => {
		const found = characterCards.find((x) => x.id === card.id);
		return found ? found.isActive : false;
	};
</script>

<div class="cards">
	{#each cards as card (card.id)}
		<Card {card}>
			{#if !readonly}
				<div class="controls">
					{#if listMode === 'active'}
						{#if getCardTotalUses(card) !== null}
							<InputField
								value={getCurrentUses(card.id)!}
								max={getCardTotalUses(card)!}
								onChange={(value) => updateCardCurrentUses(card.id, Number(value))}
								button={{
									icon: '🎲',
									title: 'Tirar para recargar',
									onClick: () => onCardReloadClick(card.id),
									disabled: getCurrentUses(card.id) === getCardTotalUses(card),
								}}
							/>
						{/if}
						<span class="spacer"></span>
						<button onclick={() => deactivateCard(card.id)}>Desactivar</button>
					{:else if listMode === 'collection'}
						<button onclick={() => removeCard(card.id)}>Quitar</button>
						<span class="spacer"></span>
						{#if card.type === 'activable'}
							{#if isCardActive(card)}
								<button onclick={() => deactivateCard(card.id)}>Desactivar</button>
							{:else}
								<button onclick={() => activateCard(card.id)}>Activar</button>
							{/if}
						{/if}
					{:else}
						<span class="spacer"></span>
						<button onclick={() => addCard(card)}>Agregar</button>
					{/if}
				</div>
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

		.controls {
			display: flex;
			flex-direction: row;
			flex-wrap: wrap;
			align-items: center;
			justify-content: space-between;
			flex-grow: 1;
			padding-top: var(--spacing-sm);
		}
	}
</style>
