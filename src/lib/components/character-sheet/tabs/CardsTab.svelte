<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { useCardsService } from '$lib/services/cards-service';
	import { dialogService } from '$lib/services/dialog-service.svelte';
	import { useDiceRollerService } from '$lib/services/dice-roller-service';
	import { modifiersService } from '$lib/services/modifiers-service';
	import type { Card } from '$lib/types/cards/card';
	import type { ItemCard } from '$lib/types/cards/item-card';
	import type { Character, CharacterCard, Modifier } from '$lib/types/character';
	import { CONFIG } from '../../../../config';

	import AddCardModal from '$lib/components/character-sheet/elements/AddCardModal.svelte';
	import CustomCardEditorModal from '$lib/components/character-sheet/elements/CustomCardEditorModal.svelte';
	import { onDestroy, onMount } from 'svelte';
	import { get } from 'svelte/store';
	import AvailableCardsView from './AvailableCardsView.svelte';
	import ManageCardsView from './ManageCardsView.svelte';

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

	let staticCards: Card[] = $state([]);

	let allCards = $derived([...staticCards, ...(character.customCards ?? [])]);

	let corruptedCharacterCards = $derived(
		character.cards.filter(
			(x) => !allCards.some((y) => y.id === x.id) && !x.id.startsWith('custom-'),
		),
	);

	// URL-synced sub-tab state
	let currentView: string = $derived(page.url.searchParams.get('view') ?? 'available');

	const onViewChange = (view: string) => {
		page.url.searchParams.set('view', view);
		goto(`?${page.url.searchParams.toString()}`);
	};

	let addCardModalState = $state({
		opened: false,
		allCards: [] as Card[],
		cardType: 'ability' as 'ability' | 'item',
	});

	let customCardEditorState = $state({
		opened: false,
		cardType: 'ability' as 'ability' | 'item',
		existingCard: undefined as Card | undefined,
	});

	const unsubscribe = abilityCardsStore.subscribe(() => {
		addCardModalState = {
			...addCardModalState,
			allCards: [],
		};
	});

	onDestroy(() => {
		unsubscribe();
	});

	onMount(async () => {
		await Promise.all([loadItemCards(), loadAbilityCards()]);
		staticCards = [...get(itemCardsStore), ...get(abilityCardsStore)];
	});

	const findCardById = (id: string): Card | undefined => {
		return allCards.find((c) => c.id === id) ?? character.customCards?.find((c) => c.id === id);
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

	const findRemovedCardId = (
		oldCards: CharacterCard[],
		newCards: CharacterCard[],
	): string | null => {
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
				const currentModifiers = character.modifiers ?? [];
				const alreadyHas = currentModifiers.some(
					(m) =>
						m.reason.toLowerCase() === modifier.name.toLowerCase() ||
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
					character.modifiers = [...currentModifiers, ...newModifiers];
				}
			}
		}
	};

	const onCharacterCardsChange = (updatedCards: CharacterCard[]) => {
		const addedCardId = findAddedCardId(character.cards, updatedCards);
		const removedCardId = findRemovedCardId(character.cards, updatedCards);

		if (addedCardId) {
			const addedCard = findCardById(addedCardId);
			if (addedCard) {
				autoAddModifiersForCard(addedCard.name);
			}
		}

		if (removedCardId) {
			const removedCard =
				updatedCards.find((c) => c.id === removedCardId) ||
				character.cards.find((c) => c.id === removedCardId);
			if (removedCard) {
				const cardInfo = findCardById(removedCardId);
				const cardName = cardInfo?.name ?? removedCardId;
				const cardNameLower = cardName.toLowerCase();
				const associatedModifiers = (character.modifiers ?? []).filter(
					(m) =>
						m.reason.toLowerCase() === cardNameLower ||
						m.reason.toLowerCase() === `carta: ${cardNameLower}`,
				);

				if (associatedModifiers.length > 0) {
					dialogService
						.confirm(`¿Remover modificadores asociados a '${cardName}'?`, {
							title: 'Modificadores Asociados',
							confirmLabel: 'Sí, remover',
							cancelLabel: 'No',
						})
						.then((confirmed) => {
							if (confirmed) {
								character.cards = character.cards.filter((c) => c.id !== removedCardId);
								character.modifiers = (character.modifiers ?? []).filter(
									(m) =>
										m.reason.toLowerCase() !== cardNameLower &&
										m.reason.toLowerCase() !== `carta: ${cardNameLower}`,
								);
							} else {
								character.cards = [...character.cards];
							}
							onChange(character);
						});
					return;
				}
			}
		}

		character.cards = updatedCards;

		if (removedCardId && removedCardId.startsWith('custom-')) {
			const stillPresent = updatedCards.some((c) => c.id === removedCardId);
			if (!stillPresent) {
				character.customCards = (character.customCards ?? []).filter((c) => c.id !== removedCardId);
			}
		}

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
		modifiersService.loadModifiers();

		setTimeout(() => {
			const modalCards = type === 'ability' ? get(abilityCardsStore) : get(itemCardsStore);
			addCardModalState = {
				opened: true,
				allCards: modalCards,
				cardType: type,
			};
		}, 0);
	};

	const closeAddCardModal = () => {
		addCardModalState = {
			opened: false,
			allCards: [],
			cardType: 'ability',
		};
	};

	const openCustomCardEditor = (cardType: 'ability' | 'item', existingCard?: Card) => {
		customCardEditorState = {
			opened: true,
			cardType,
			existingCard,
		};
	};

	const handleCloseCustomCardEditor = () => {
		customCardEditorState = {
			opened: false,
			cardType: 'ability',
			existingCard: undefined,
		};
	};

	const handleSaveCustomCard = (card: Card) => {
		const existingIndex = character.customCards?.findIndex((c) => c.id === card.id) ?? -1;
		if (existingIndex >= 0) {
			character.customCards = character.customCards.map((c) => (c.id === card.id ? card : c));
		} else {
			character.customCards = [...(character.customCards ?? []), card];
			const newCharacterCard: CharacterCard = {
				id: card.id,
				uses: null,
				isActive: false,
				level: card.level,
				cardType: card.cardType,
				isOvercharged: false,
			};
			character.cards = [...character.cards, newCharacterCard];
		}
		onChange(character);
		handleCloseCustomCardEditor();
	};

	const handlePurchaseCard = (card: Card) => {
		if (card.cardType === 'item') {
			const costValue = parseFloat((card as ItemCard).cost);
			if (isNaN(costValue)) {
				return;
			}
			if (character.currentGold < costValue) {
				dialogService.alert('No tienes suficiente oro');
				return;
			}

			const purchaseEntry = {
				id: crypto.randomUUID(),
				type: 'subtract' as const,
				value: costValue,
				reason: `Comprar objeto mágico: ${card.name}`,
			};
			character.goldHistory = [purchaseEntry, ...character.goldHistory];
		} else {
			const levelValue = (card as any).level ? parseInt((card as any).level) || 1 : 1;
			const costValue = CONFIG.CARD_LEVEL_PP_COST[levelValue] || 0;
			if (character.currentPP < costValue) {
				dialogService.alert(
					`No tienes suficiente PP. Tienes ${character.currentPP} PP y la carta cuesta ${costValue} PP.`,
				);
				return;
			}

			const purchaseEntry = {
				id: crypto.randomUUID(),
				type: 'subtract' as const,
				value: costValue,
				reason: `Comprar carta: ${card.name}`,
			};
			character.ppHistory = [purchaseEntry, ...character.ppHistory];
		}

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
				reason: `Comprar ranura: ${currentSlots + 1}ª ranura`,
			};

			character.ppHistory = [purchaseEntry, ...character.ppHistory];
			character.maxActiveCards = currentSlots + 1;

			onChange(character);
		}
	};
</script>

<div class="cards-tab">
	{#if !readonly}
		<div class="sub-tabs">
			<button
				class="sub-tab"
				class:selected={currentView === 'available'}
				onclick={() => onViewChange('available')}>🚀 Disponibles</button
			>
			<button
				class="sub-tab"
				class:selected={currentView === 'manage'}
				onclick={() => onViewChange('manage')}>⚙️ Gestionar</button
			>
		</div>
	{/if}

	{#if currentView === 'available'}
		<AvailableCardsView
			cards={allCards}
			characterCards={character.cards}
			maxActiveCards={character.maxActiveCards}
			{readonly}
			onChange={onCharacterCardsChange}
			{onCardReloadClick}
		/>
	{:else}
		<ManageCardsView
			cards={allCards}
			characterCards={character.cards}
			{readonly}
			{character}
			onChange={onCharacterCardsChange}
			onEditCard={(card) => openCustomCardEditor(card.cardType, card)}
			{onCorruptedCardsChange}
			onAddAbilityClick={() => openAddCardModal('ability')}
			onAddItemClick={() => openAddCardModal('item')}
			onBuyActiveSlot={handleBuyActiveSlot}
			corruptedCards={corruptedCharacterCards}
		/>
	{/if}
</div>

<AddCardModal
	opened={addCardModalState.opened}
	cards={addCardModalState.allCards}
	cardType={addCardModalState.cardType}
	{character}
	onClose={closeAddCardModal}
	onCardsChange={onCharacterCardsChange}
	onPurchaseCard={handlePurchaseCard}
	onCreateCustom={(cardType: 'ability' | 'item') => openCustomCardEditor(cardType)}
/>

<CustomCardEditorModal
	opened={customCardEditorState.opened}
	cardType={customCardEditorState.cardType}
	existingCard={customCardEditorState.existingCard}
	onClose={handleCloseCustomCardEditor}
	onSave={handleSaveCustomCard}
/>

<style>
	.cards-tab {
		position: relative;
		display: flex;
		flex-direction: column;
		width: 100%;
		gap: var(--spacing-md);
	}

	.sub-tabs {
		display: flex;
		flex-direction: row;
		flex-wrap: wrap;
		gap: var(--spacing-sm);
	}
</style>
