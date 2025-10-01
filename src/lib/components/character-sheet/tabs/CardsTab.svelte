<script lang="ts">
	import CardsFilter from '$lib/components/cards/CardsFilter.svelte';
	import CardsList from '$lib/components/cards/CardsList.svelte';
	import Container from '$lib/components/ui/Container.svelte';
	import InputField from '$lib/components/ui/InputField.svelte';
	import { useCardFiltersService } from '$lib/services/cards-filter-service';
	import { useCardsService } from '$lib/services/cards-service';
	import { useDiceRollerService } from '$lib/services/dice-roller-service';
	import type { CardFilters } from '$lib/types/card-filters';
	import type { Character, CharacterCard } from '$lib/types/character';
	import { filterCards } from '$lib/utils/card-filtering';
	import { onDestroy, onMount } from 'svelte';
	import { get } from 'svelte/store';

	type Props = {
		character: Character;
		readonly: boolean;
		onChange: (character: Character) => void;
	};

	let { character, readonly, onChange }: Props = $props();

	let { loadCards, cards: cardsStore } = useCardsService();

	let { rollExpression } = useDiceRollerService();

	const { buildEmptyFilters, getFiltersFromURL, updateURLFilters } = useCardFiltersService();

	let filters: CardFilters = $state(getFiltersFromURL());

	let cards = $derived(filterCards(get(cardsStore), filters));

	const unsubscribe = cardsStore.subscribe(() => {
		cards = filterCards(get(cardsStore), filters);
	});

	onDestroy(() => {
		unsubscribe();
	});

	onMount(async () => {
		await loadCards();
	});

	const onCharacterCardsChange = (updatedCards: CharacterCard[]) => {
		character.cards = updatedCards;
		onChange(character);
	};
	const onCardReloadClick = async (cardId: string) => {
		const characterCard = character.cards.find((card) => card.id === cardId);
		const card = cards.find((card) => card.id === cardId);
		if (characterCard && card && characterCard.uses !== null && card) {
			const rollResult = await rollExpression({
				expression: '1d6',
				variables: {},
				title: `${character.name}: Recarga de carta ${card.name}`,
				resultFormatter: (result) =>
					`<span class="total ${result >= (card.uses?.qty ?? 0) ? 'success' : 'failure'}">${result}</span>`,
			});
			if (rollResult >= (card.uses?.qty ?? 0)) {
				characterCard.uses += 1;
				onCharacterCardsChange([...character.cards]);
			}
		}
	};

	const onFiltersChange = (newFilters: CardFilters) => {
		filters = newFilters;
		cards = filterCards(get(cardsStore), filters);
		updateURLFilters(filters);
	};

	const onResetFilters = () => {
		onFiltersChange(buildEmptyFilters());
	};
</script>

<div class="cards-tab">
	{#if !readonly}
		<Container>
			<InputField
				label="Ranuras de Cartas Activas"
				labelWidth="fit"
				value={character.maxActiveCards}
				{readonly}
				fullWidth={true}
				onChange={(value) => {
					character.maxActiveCards = Number(value);
					onChange(character);
				}}
			/>
		</Container>
	{/if}
	<Container title="Cartas Activas ({character.numActiveCards}/{character.maxActiveCards})">
		<CardsList
			cards={$cardsStore.filter((x) => character.cards.some((y) => y.isActive && y.id === x.id))}
			{readonly}
			characterCards={character.cards}
			listMode="active"
			onChange={onCharacterCardsChange}
			{onCardReloadClick}
		/>
	</Container>

	<Container title="Colección">
		<CardsList
			cards={$cardsStore.filter((x) => character.cards.some((y) => y.id === x.id))}
			{readonly}
			characterCards={character.cards}
			listMode="collection"
			onChange={onCharacterCardsChange}
		/>
	</Container>

	<Container title="Todas las Cartas">
		<div class="all-cards">
			<CardsFilter cards={$cardsStore} {onFiltersChange} {onResetFilters} {filters} />
			{#if cards.length > 0}
				<CardsList
					cards={cards.filter((x) => character.cards.find((y) => y.id === x.id) === undefined)}
					{readonly}
					characterCards={character.cards}
					listMode="all"
					onChange={onCharacterCardsChange}
				/>
			{:else}
				<div class="empty">
					<em>No se encontraron resultados</em>
				</div>
			{/if}
		</div>
	</Container>
</div>

<style>
	.cards-tab {
		display: flex;
		flex-direction: column;
		width: 100%;
		gap: var(--spacing-md);

		.all-cards {
			display: flex;
			flex-direction: column;
			gap: var(--spacing-md);
			padding-top: var(--spacing-md);
		}
	}

	.empty {
		display: flex;
		justify-content: center;
		align-items: center;
		height: 100%;
		width: 100%;
	}
</style>
