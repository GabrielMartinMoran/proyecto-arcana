<script lang="ts">
	import CardsFilter from '$lib/components/cards/CardsFilter.svelte';
	import CardsList from '$lib/components/cards/CardsList.svelte';
	import Container from '$lib/components/ui/Container.svelte';
	import InputField from '$lib/components/ui/InputField.svelte';
	import { useCardsService } from '$lib/services/cards-service';
	import type { Card } from '$lib/types/card';
	import type { Character, CharacterCard } from '$lib/types/character';
	import { onMount } from 'svelte';

	type Props = {
		character: Character;
		readonly: boolean;
		onChange: (character: Character) => void;
	};

	let { character, readonly, onChange }: Props = $props();

	let { loadCards, cards: cardsStore } = useCardsService();

	let cards = $derived($cardsStore);

	onMount(async () => {
		await loadCards();
	});

	const onCharacterCardsChange = (updatedCards: CharacterCard[]) => {
		character.cards = updatedCards;
		onChange(character);
	};

	const onAllCardFilter = (results: Card[]) => {
		cards = results;
	};
</script>

<div class="cards-tab">
	{#if !readonly}
		<Container>
			<InputField
				label="Ranuras de Cartas Activas"
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
			<CardsFilter cards={$cardsStore} onFilter={onAllCardFilter} />
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
