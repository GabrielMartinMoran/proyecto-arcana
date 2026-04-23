<script lang="ts">
	import CardsFilter from '$lib/components/cards/CardsFilter.svelte';
	import CardsList from '$lib/components/cards/CardsList.svelte';
	import Container from '$lib/components/ui/Container.svelte';
	import InputField from '$lib/components/ui/InputField.svelte';
	import { useCardFiltersService } from '$lib/services/cards-filter-service';
	import { useCardsService } from '$lib/services/cards-service';
	import { useDiceRollerService } from '$lib/services/dice-roller-service';
	import { dialogService } from '$lib/services/dialog-service.svelte';
	import { modifiersService } from '$lib/services/modifiers-service';
	import type { CardFilters } from '$lib/types/card-filters';
	import type { Card } from '$lib/types/cards/card';
	import type { Character, CharacterCard, Modifier } from '$lib/types/character';
	import { filterCards } from '$lib/utils/card-filtering';
	import AddCardModal from '$lib/components/character-sheet/elements/AddCardModal.svelte';
	import { onDestroy, onMount } from 'svelte';
	import { get } from 'svelte/store';
	import { CONFIG } from '../../../../config';

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

	let filters: CardFilters = $state(buildEmptyFilters({ onlyAvailables: true }));

	let allCards: Card[] = $state([]);

	let corruptedCharacterCards = $derived(
		character.cards.filter((x) => !allCards.some((y) => y.id === x.id)),
	);

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

	const findCardById = (id: string): Card | undefined => {
		return allCards.find((c) => c.id === id);
	};

	const findAddedCardId = (oldCards: CharacterCard[], newCards: CharacterCard[]): string | null => {
		const oldIds = new Set(oldCards.map((c) => c.id));
		for (const card of newCards) {
			if (!oldIds.has(card.id)) {
				return card.id;
			}
		}
		return null;
	};

	const findRemovedCardId = (oldCards: CharacterCard[], newCards: CharacterCard[]): string | null => {
		const newIds = new Set(newCards.map((c) => c.id));
		for (const card of oldCards) {
			if (!newIds.has(card.id)) {
				return card.id;
			}
		}
		return null;
	};

	const autoAddModifiersForCard = (cardName: string) => {
		const matchingModifiers = modifiersService.findAllByNameMatch(cardName);
		for (const modifier of matchingModifiers) {
			if (modifier.subModifiers.length > 0) {
				// Check if already has this modifier (with or without "Carta: " prefix)
				const cardNameLower = cardName.toLowerCase();
				const alreadyHas = character.modifiers.some(
					(m) => m.reason.toLowerCase() === modifier.name.toLowerCase() ||
						m.reason.toLowerCase() === `carta: ${modifier.name.toLowerCase()}`,
				);
				if (!alreadyHas) {
					const newModifiers: Modifier[] = modifier.subModifiers.map((sm) => ({
						id: crypto.randomUUID(),
						attribute: sm.attribute,
						type: sm.type,
						formula: sm.formula,
						reason: `Carta: ${sm.reason}`,
						enabled: true,
					}));
					character.modifiers = [...character.modifiers, ...newModifiers];
				}
			}
		}
	};

	const promptRemoveModifiersForCard = async (cardName: string) => {
		// Match modifiers with or without "Carta: " prefix
		const cardNameLower = cardName.toLowerCase();
		const associatedModifiers = character.modifiers.filter(
			(m) => m.reason.toLowerCase() === cardNameLower ||
				m.reason.toLowerCase() === `carta: ${cardNameLower}`,
		);
		if (associatedModifiers.length > 0) {
			const confirmed = await dialogService.confirm(
				`¿Remover modificadores asociados a '${cardName}'?`,
				{ title: 'Modificadores Asociados', confirmLabel: 'Sí, remover', cancelLabel: 'No' },
			);
			if (confirmed) {
				character.modifiers = character.modifiers.filter(
					(m) => m.reason.toLowerCase() !== cardNameLower &&
						m.reason.toLowerCase() !== `carta: ${cardNameLower}`,
				);
			}
		}
	};

	const onCharacterCardsChange = (updatedCards: CharacterCard[]) => {
		// Detect if a card was added or removed
		const addedCardId = findAddedCardId(character.cards, updatedCards);
		const removedCardId = findRemovedCardId(character.cards, updatedCards);

		// Handle modifier auto-add for added card
		if (addedCardId) {
			const addedCard = findCardById(addedCardId);
			if (addedCard) {
				autoAddModifiersForCard(addedCard.name);
			}
		}

		// Handle modifier prompt for removed card - show confirmation BEFORE removing
		if (removedCardId) {
			const removedCard = updatedCards.find((c) => c.id === removedCardId) ||
				character.cards.find((c) => c.id === removedCardId);
			if (removedCard) {
				const cardInfo = findCardById(removedCardId);
				const cardName = cardInfo?.name ?? removedCardId;
				const cardNameLower = cardName.toLowerCase();
				const associatedModifiers = character.modifiers.filter(
					(m) => m.reason.toLowerCase() === cardNameLower ||
						m.reason.toLowerCase() === `carta: ${cardNameLower}`,
				);

				if (associatedModifiers.length > 0) {
					// Show confirmation BEFORE removing anything
					dialogService.confirm(
						`¿Remover modificadores asociados a '${cardName}'?`,
						{ title: 'Modificadores Asociados', confirmLabel: 'Sí, remover', cancelLabel: 'No' },
					).then((confirmed) => {
						if (confirmed) {
							// User confirmed: remove BOTH card and modifiers together
							character.cards = character.cards.filter((c) => c.id !== removedCardId);
							character.modifiers = character.modifiers.filter(
								(m) => m.reason.toLowerCase() !== cardNameLower &&
									m.reason.toLowerCase() !== `carta: ${cardNameLower}`,
							);
						} else {
							// User cancelled: restore card to the list, do NOT remove anything
							character.cards = [...character.cards];
						}
						onChange(character);
					});
					return; // Don't call onChange yet - wait for async confirmation
				}
			}
		}

		// No removed card with associated modifiers - update cards directly
		character.cards = updatedCards;
		onChange(character);
	};

	const onCorruptedCardsChange = (updatedCorruptedCards: CharacterCard[]) => {
		character.cards = [
			...character.cards.filter((x) => allCards.some((y) => y.id === x.id)),
			...updatedCorruptedCards,
		];
		onChange(character);
	};

	const onCardReloadClick = async (cardId: string) => {
		const characterCard = character.cards.find((card) => card.id === cardId);
		const card = allCards.find((card) => card.id === cardId);
		if (characterCard && card && characterCard.uses !== null && card) {
			const rollResult = await rollExpression({
				expression: '1d8',
				variables: {},
				title: `${character.name}: Recarga de carta ${card.name}`,
				resultFormatter: (result) =>
					`<span class="total ${result >= (card.uses?.qty ?? 0) ? 'success' : 'failure'}">${result}</span>`,
			});
			if (rollResult === 1) {
				characterCard.isOvercharged = true;
				onCharacterCardsChange([...character.cards]);
				return;
			}
			if (rollResult >= (card.uses?.qty ?? 0)) {
				characterCard.uses += 1;
				onCharacterCardsChange([...character.cards]);
			}
		}
	};

	const openAddCardModal = (type: 'ability' | 'item') => {
		// Load modifiers when opening modal
		modifiersService.loadModifiers();

		setTimeout(() => {
			const modalCards = type === 'ability' ? get(abilityCardsStore) : get(itemCardsStore);
			addCardModalState = {
				opened: true,
				filteredCards: filterCards(modalCards, filters, character),
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

	const handlePurchaseCard = (card: Card) => {
		const levelValue = (card as any).level ? parseInt((card as any).level) || 1 : 1;
		const costValue = CONFIG.CARD_LEVEL_PP_COST[levelValue] || 0;
		if (character.currentPP < costValue) {
			dialogService.alert(
				`No tienes suficiente PP. Tienes ${character.currentPP} PP y la carta cuesta ${costValue} PP.`,
			);
			return;
		}

		// Deduct PP and log transaction
		const purchaseEntry = {
			id: crypto.randomUUID(),
			type: 'subtract' as const,
			value: costValue,
			reason: `Comprar carta: ${card.name}`,
		};
		character.ppHistory = [purchaseEntry, ...character.ppHistory];
		onChange(character);

		// Add the card
		const newCard: CharacterCard = {
			id: card.id,
			uses: null,
			isActive: false,
			level: card.level,
			cardType: card.cardType,
			isOvercharged: false,
		};
		onCharacterCardsChange([...character.cards, newCard]);
	};

	const handleBuyActiveSlot = async () => {
		const currentSlots = character.maxActiveCards;
		const cost = CONFIG.ACTIVE_SLOT_PP_COST[currentSlots];

		if (!cost || currentSlots >= 10) return;

		const confirmed = await dialogService.confirm(
			`¿Comprar ${currentSlots + 1}ª ranura por ${cost} PP?`,
		);

		if (confirmed) {
			const purchaseEntry = {
				id: crypto.randomUUID(),
				type: 'subtract' as const,
				value: cost,
				reason: `Comprar ranura: ${currentSlots + 1}ª ranura`
			};

			// Mutate existing proxy (like handlePurchaseCard does)
			character.ppHistory = [purchaseEntry, ...character.ppHistory];
			character.maxActiveCards = currentSlots + 1;

			// Pass same proxy reference
			onChange(character);
		}
	};
</script>

<div class="cards-tab">
	{#if !readonly}
		<Container>
			<div class="slot-input-row">
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
				{#if !readonly && character.maxActiveCards < 10}
					{@const nextSlotCost = CONFIG.ACTIVE_SLOT_PP_COST[character.maxActiveCards] || 0}
					<button
						onclick={handleBuyActiveSlot}
						disabled={character.currentPP < nextSlotCost}
					>
						Comprar ranura ({nextSlotCost} PP)
					</button>
				{/if}
			</div>
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

	<Container title={`Colección (${character.cards.length})`}>
		<CardsList
			cards={allCards.filter((x) => character.cards.some((y) => y.id === x.id))}
			{readonly}
			characterCards={character.cards}
			listMode="collection"
			onChange={onCharacterCardsChange}
		/>
	</Container>

	<!-- Filter all cards that no longer exist -->

	{#if !readonly && corruptedCharacterCards.length > 0}
		<Container title={`Cartas Corruptas (${corruptedCharacterCards.length})`}>
			<CardsList
				cards={corruptedCharacterCards.map(
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
				characterCards={corruptedCharacterCards}
				listMode="collection"
				onChange={onCorruptedCardsChange}
			/>
		</Container>
	{/if}
</div>

<AddCardModal
	opened={addCardModalState.opened}
	cards={addCardModalState.filteredCards}
	{character}
	onClose={closeAddCardModal}
	onCardsChange={onCharacterCardsChange}
	onPurchaseCard={handlePurchaseCard}
/>

<style>
	.cards-tab {
		position: relative;
		display: flex;
		flex-direction: column;
		width: 100%;
		gap: var(--spacing-md);
	}

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
