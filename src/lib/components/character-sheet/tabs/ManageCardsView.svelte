<script lang="ts">
	import CardsList from '$lib/components/cards/CardsList.svelte';
	import Container from '$lib/components/ui/Container.svelte';
	import InputField from '$lib/components/ui/InputField.svelte';
	import type { Card } from '$lib/types/cards/card';
	import type { Character, CharacterCard } from '$lib/types/character';
	import { CONFIG } from '../../../../config';

	type Props = {
		cards: Card[];
		characterCards: CharacterCard[];
		readonly: boolean;
		character: Character;
		onChange: (characterCards: CharacterCard[]) => void;
		onEditCard: (card: Card) => void;
		onCorruptedCardsChange: (characterCards: CharacterCard[]) => void;
		onAddAbilityClick: () => void;
		onAddItemClick: () => void;
		onBuyActiveSlot: () => void;
		corruptedCards?: CharacterCard[];
	};

	let {
		cards,
		characterCards,
		readonly,
		character,
		onChange,
		onEditCard,
		onCorruptedCardsChange,
		onAddAbilityClick,
		onAddItemClick,
		onBuyActiveSlot,
		corruptedCards = [],
	}: Props = $props();
</script>

{#if !readonly}
	<Container>
		<div class="slot-input-row">
			<InputField
				label="Ranuras de Cartas Activas"
				labelWidth="fit"
				value={character.maxActiveCards}
				{readonly}
				width="full"
				onChange={(value) => {
					character.maxActiveCards = Number(value);
				}}
			/>
			{#if !readonly && character.maxActiveCards < 10}
				{@const nextSlotCost = CONFIG.ACTIVE_SLOT_PP_COST[character.maxActiveCards] || 0}
				<button onclick={onBuyActiveSlot} disabled={character.currentPP < nextSlotCost}>
					Comprar ranura ({nextSlotCost} PP)
				</button>
			{/if}
		</div>
		<div class="controls">
			<span>Agregar cartas a tu colección</span>
			<div class="buttons">
				<button onclick={onAddAbilityClick}>Agregar Carta de Habilidad</button>
				<button onclick={onAddItemClick}>Agregar Carta de Objeto Mágico</button>
			</div>
		</div>
	</Container>
{/if}

<Container title={`Colección Completa (${characterCards.length})`}>
	<CardsList
		cards={cards.filter((x) => characterCards.some((y) => y.id === x.id))}
		{readonly}
		{characterCards}
		listMode="collection"
		{onChange}
		{onEditCard}
	/>
</Container>

{#if !readonly && corruptedCards.length > 0}
	<Container title={`Cartas Corruptas (${corruptedCards.length})`}>
		<CardsList
			cards={corruptedCards.map(
				(x) =>
					({
						id: x.id,
						name: 'Carta Corrupta',
						level: x.level,
						tags: ['Corrupta'],
						requirements: null,
						description: 'Esta carta ya no existe. Por favor, eliminala.',
						uses: {
							qty: 0,
							type: 'USES',
						},
						type: 'corrupta',
						cardType: x.cardType,
						img: CONFIG.ABILITY_CARD_BACKGROUNDS.default,
					}) as Card,
			)}
			{readonly}
			characterCards={corruptedCards}
			listMode="collection"
			onChange={onCorruptedCardsChange}
		/>
	</Container>
{/if}

<style>
	.slot-input-row {
		display: flex;
		align-items: center;
		gap: var(--spacing-md);
	}

	.controls {
		display: flex;
		flex-direction: column;
		gap: var(--spacing-md);
		padding-top: var(--spacing-md);

		span {
			color: var(--text-secondary);
			font-size: 0.9rem;
		}

		.buttons {
			display: flex;
			flex-direction: row;
			gap: var(--spacing-md);
			justify-content: space-evenly;
			align-items: center;
		}
	}
</style>
