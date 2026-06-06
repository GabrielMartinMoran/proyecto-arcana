<script lang="ts">
	import CardsList from '$lib/components/cards/CardsList.svelte';
	import Container from '$lib/components/ui/Container.svelte';
	import type { Card } from '$lib/types/cards/card';
	import type { CharacterCard } from '$lib/types/character';

	type Props = {
		cards: Card[];
		characterCards: CharacterCard[];
		maxActiveCards: number;
		readonly: boolean;
		onChange: (characterCards: CharacterCard[]) => void;
		onCardReloadClick: (cardId: string) => void;
	};

	let { cards, characterCards, maxActiveCards, readonly, onChange, onCardReloadClick }: Props =
		$props();

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
</script>

<Container title="Cartas Activas ({activeActivableCards.length}/{maxActiveCards})">
	{#if activeActivableCards.length > 0}
		<CardsList
			cards={activeActivableCards}
			{readonly}
			{characterCards}
			listMode="active"
			{onChange}
			{onCardReloadClick}
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
</style>
