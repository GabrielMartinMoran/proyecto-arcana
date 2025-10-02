<script lang="ts">
	import CardsFilter from '$lib/components/cards/CardsFilter.svelte';
	import CardsList from '$lib/components/cards/CardsList.svelte';
	import Container from '$lib/components/ui/Container.svelte';
	import InputField from '$lib/components/ui/InputField.svelte';
	import { useCardFiltersService } from '$lib/services/cards-filter-service';
	import { useCardsService } from '$lib/services/cards-service';
	import { useDiceRollerService } from '$lib/services/dice-roller-service';
	import type { CardFilters } from '$lib/types/card-filters';
	import type { Card } from '$lib/types/cards/card';
	import type { Character, CharacterCard } from '$lib/types/character';
	import { filterCards } from '$lib/utils/card-filtering';
	import { clickOutsideDetector } from '$lib/utils/outside-click-detector';
	import { onDestroy, onMount } from 'svelte';
	import { get } from 'svelte/store';

	type Props = {
		character: Character;
		readonly: boolean;
		onChange: (character: Character) => void;
	};

	let { character, readonly, onChange }: Props = $props();

	let {
		loadAbilityCards,
		abilityCards: abilityCardsStore,
		loadItemCards,
		itemCards: itemCardsStore,
	} = useCardsService();

	let { rollExpression } = useDiceRollerService();

	const { buildEmptyFilters } = useCardFiltersService();

	let filters: CardFilters = $state(buildEmptyFilters());

	let allCards: Card[] = $state([]);

	let addCardModalState = $state({
		opened: false,
		filteredCards: [] as Card[],
		allCards: [] as Card[],
	});

	const unsubscribe = abilityCardsStore.subscribe(() => {
		addCardModalState = {
			...addCardModalState,
			allCards: [],
			filteredCards: [],
		};
	});

	onDestroy(() => {
		unsubscribe();
	});

	onMount(async () => {
		await Promise.all([loadItemCards(), loadAbilityCards()]);
		allCards = [...get(itemCardsStore), ...get(abilityCardsStore)];
	});

	const onCharacterCardsChange = (updatedCards: CharacterCard[]) => {
		character.cards = updatedCards;
		onChange(character);
	};

	const onCardReloadClick = async (cardId: string) => {
		const characterCard = character.cards.find((card) => card.id === cardId);
		const card = allCards.find((card) => card.id === cardId);
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
		addCardModalState = {
			...addCardModalState,
			filteredCards: filterCards(addCardModalState.allCards, filters),
		};
	};

	const onResetFilters = () => {
		onFiltersChange(buildEmptyFilters());
	};

	const openAddCardModal = (type: 'ability' | 'item') => {
		setTimeout(() => {
			const modalCards = type === 'ability' ? get(abilityCardsStore) : get(itemCardsStore);
			addCardModalState = {
				opened: true,
				filteredCards: modalCards,
				allCards: modalCards,
			};
		}, 0);
	};

	const closeAddCardModal = () => {
		addCardModalState = {
			opened: false,
			filteredCards: [],
			allCards: [],
		};
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
			<div class="controls">
				<span>Agregar cartas a tu colección</span>
				<div class="buttons">
					<button onclick={() => openAddCardModal('ability')}>Agregar Carta de Habilidad</button>
					<button onclick={() => openAddCardModal('item')}>Agregar Carta de Objeto Mágico</button>
				</div>
			</div>
		</Container>
	{/if}
	<Container title="Cartas Activas ({character.numActiveCards}/{character.maxActiveCards})">
		<CardsList
			cards={allCards.filter((x) => character.cards.some((y) => y.isActive && y.id === x.id))}
			{readonly}
			characterCards={character.cards}
			listMode="active"
			onChange={onCharacterCardsChange}
			{onCardReloadClick}
		/>
	</Container>

	<Container title="Colección">
		<CardsList
			cards={allCards.filter((x) => character.cards.some((y) => y.id === x.id))}
			{readonly}
			characterCards={character.cards}
			listMode="collection"
			onChange={onCharacterCardsChange}
		/>
	</Container>
</div>

<div
	class="add-card-modal"
	hidden={!addCardModalState.opened}
	use:clickOutsideDetector
	onoutsideclick={closeAddCardModal}
>
	<div class="all-cards">
		<CardsFilter
			cards={addCardModalState.filteredCards}
			{onFiltersChange}
			{onResetFilters}
			{filters}
		/>
		<div class="cards-viewport">
			{#if addCardModalState.filteredCards.length > 0}
				<CardsList
					cards={addCardModalState.filteredCards.filter(
						(x) => character.cards.find((y) => y.id === x.id) === undefined,
					)}
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
	</div>
	<div class="footer">
		<button onclick={closeAddCardModal}>Cerrar</button>
	</div>
</div>

<style>
	.cards-tab {
		position: relative;
		display: flex;
		flex-direction: column;
		width: 100%;
		gap: var(--spacing-md);
	}

	.empty {
		display: flex;
		justify-content: center;
		align-items: center;
		height: 100%;
		width: 100%;
	}

	.add-card-modal {
		position: fixed;
		top: 50%;
		left: 50%;
		transform: translate(-50%, -50%);
		z-index: 2;
		border: 1px solid var(--border-color);
		border-radius: var(--radius-md);
		padding: var(--spacing-md);
		background-color: var(--secondary-bg);
		box-shadow: var(--shadow-md);

		.all-cards {
			display: flex;
			flex-direction: column;
			gap: var(--spacing-md);
			padding-top: var(--spacing-md);

			.cards-viewport {
				height: 400px;
				overflow-y: scroll;
			}
		}

		.footer {
			display: flex;
			flex-direction: row;
			justify-content: center;
			align-items: center;
			padding: var(--spacing-sm);
		}
	}

	@media screen and (max-width: 1280px) {
		.add-card-modal {
			width: 95%;
		}
	}

	@media screen and (min-width: 1600px) {
		.add-card-modal {
			width: 1000px;
		}
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
