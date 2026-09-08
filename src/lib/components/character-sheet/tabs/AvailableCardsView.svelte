<script lang="ts">
	import CardsList from '$lib/components/cards/CardsList.svelte';
	import Container from '$lib/components/ui/Container.svelte';
	import type { Card } from '$lib/types/cards/card';
	import type { CardRollContext } from '$lib/types/cards/card-roll-context';
	import type { CharacterCard } from '$lib/types/character';
	import { getSlotConsumingActiveCards } from '$lib/utils/card-association-utils';

	type Props = {
		cards: Card[];
		characterCards: CharacterCard[];
		maxActiveCards: number;
		readonly: boolean;
		onChange: (characterCards: CharacterCard[]) => void;
		onCardReloadClick: (cardId: string) => void;
		rollContext?: CardRollContext;
	};

	let {
		cards,
		characterCards,
		maxActiveCards,
		readonly,
		onChange,
		onCardReloadClick,
		rollContext = undefined,
	}: Props = $props();

	// Filter active + activable cards for the Cartas Activas section
	let activeActivableCards = $derived(
		cards.filter(
			(c) => c.type === 'activable' && characterCards.some((cc) => cc.id === c.id && cc.isActive),
		),
	);

	// All effect cards the character owns (regardless of isActive)
	let effectCards = $derived(
		cards.filter((c) => c.type === 'efecto' && characterCards.some((cc) => cc.id === c.id)),
	);

	// Slot accounting derived from the pure helpers: linked activable cards
	// with an effective exemption stay visible in the list but are excluded
	// from the slot-consuming counter.
	let slotConsumingActiveCards = $derived(getSlotConsumingActiveCards(characterCards, cards));
</script>

<Container title={`Cartas Activas (${slotConsumingActiveCards.length}/${maxActiveCards})`}>
	{#if activeActivableCards.length > 0}
		<CardsList
			cards={activeActivableCards}
			{readonly}
			{characterCards}
			listMode="active"
			{onChange}
			{onCardReloadClick}
			{rollContext}
			allCards={cards}
		/>
	{:else}
		<p class="empty-message">
			No tienes cartas activables equipadas. Ve a Gestionar para activar cartas.
		</p>
	{/if}
</Container>

<Container title="Efectos Activos ({effectCards.length})">
	{#if effectCards.length > 0}
		<CardsList
			cards={effectCards}
			readonly={true}
			{characterCards}
			listMode="active"
			onChange={() => {}}
			onCardReloadClick={() => {}}
			{rollContext}
			allCards={cards}
		/>
	{:else}
		<p class="empty-message">No tienes cartas de efecto en tu colección.</p>
	{/if}
</Container>

<style>
	.empty-message {
		color: var(--text-secondary);
		font-size: 0.9rem;
		text-align: center;
		padding: var(--spacing-md);
	}

	.slot-exemption-legend {
		color: var(--text-secondary);
		font-size: 0.85rem;
		margin: 0;
		padding: var(--spacing-xs) 0 var(--spacing-sm);
	}
</style>
