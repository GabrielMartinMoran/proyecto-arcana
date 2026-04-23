<script lang="ts">
	import Modal from '$lib/components/ui/Modal.svelte';
	import CardsFilter from '$lib/components/cards/CardsFilter.svelte';
	import CardsList from '$lib/components/cards/CardsList.svelte';
	import type { Card } from '$lib/types/cards/card';
	import type { CardFilters } from '$lib/types/card-filters';
	import type { Character, CharacterCard } from '$lib/types/character';
	import { useCardFiltersService } from '$lib/services/cards-filter-service';
	import { filterCards } from '$lib/utils/card-filtering';

	type Props = {
		opened: boolean;
		cards: Card[];
		character: Character;
		onClose: () => void;
		onCardsChange: (cards: CharacterCard[]) => void;
		onPurchaseCard: (card: Card) => void;
	};

	let { opened, cards, character, onClose, onCardsChange, onPurchaseCard }: Props = $props();

	const { buildEmptyFilters } = useCardFiltersService();

	let filters: CardFilters = $state(buildEmptyFilters({ onlyAvailables: true }));

	let filteredCards = $derived(
		filterCards(cards, filters, character).filter(
			(x) => character.cards.find((y) => y.id === x.id) === undefined,
		),
	);

	const handleFiltersChange = (newFilters: CardFilters) => {
		filters = newFilters;
	};

	const handleResetFilters = () => {
		handleFiltersChange(buildEmptyFilters({ onlyAvailables: true }));
	};

	const handleAddCard = (card: Card) => {
		const newCard: CharacterCard = {
			id: card.id,
			uses: null,
			isActive: false,
			level: card.level,
			cardType: card.cardType,
			isOvercharged: false,
		};
		onCardsChange([...character.cards, newCard]);
	};
</script>

<Modal opened={opened} title="Agregar Carta" onClose={onClose}>
	<CardsFilter
		cards={filteredCards}
		{filters}
		onFiltersChange={handleFiltersChange}
		onResetFilters={handleResetFilters}
		includeOnlyAvailablesFilter={true}
	/>
	<div class="cards-viewport">
		{#if filteredCards.length > 0}
			<CardsList
				cards={filteredCards}
				characterCards={character.cards}
				listMode="all"
				readonly={false}
				onChange={onCardsChange}
				currentPP={character.currentPP}
				{onPurchaseCard}
			/>
		{:else}
			<div class="empty">
				<em>No se encontraron resultados</em>
			</div>
		{/if}
	</div>

	{#snippet footer()}
		<span class="results-count"
			>{filteredCards.length}
			{filteredCards.length === 1 ? 'resultado' : 'resultados'}</span
		>
		<button onclick={onClose}>Cerrar</button>
	{/snippet}
</Modal>

<style>
	.cards-viewport {
		height: 600px;
		overflow-y: scroll;
	}

	.empty {
		display: flex;
		justify-content: center;
		align-items: center;
		height: 100%;
		width: 100%;
		color: var(--text-secondary);
		font-style: italic;
	}

	.results-count {
		color: var(--text-secondary);
		font-size: 0.9rem;
	}

	@media screen and (max-width: 850px) {
		.cards-viewport {
			height: 500px !important;
		}
	}

	@media screen and (max-width: 640px) {
		.cards-viewport {
			height: 400px !important;
		}
	}
</style>
