<script lang="ts">
	import type { Card as CardType } from '$lib/types/cards/card';
	import type { CardRollContext } from '$lib/types/cards/card-roll-context';
	import type { ItemCard } from '$lib/types/cards/item-card';
	import type { CharacterCard } from '$lib/types/character';
	import {
		hasValidCardLink,
		isEffectiveSlotExemption,
		isInactiveActivableOrigin,
	} from '$lib/utils/card-association-utils';
	import { clampRemainingUses, getCardTotalUses } from '$lib/utils/card-utils';
	import type { FormulaContext } from '$lib/utils/modifiers-calculator';
	import { CONFIG } from '../../../config';
	import Card from './Card.svelte';
	import ReloadControl from './ReloadControl.svelte';

	type Props = {
		cards: CardType[];
		readonly?: boolean;
		characterCards?: CharacterCard[];
		listMode?: 'active' | 'collection' | 'all';
		onChange?: (characterCards: CharacterCard[]) => void;
		onCardReloadClick?: (cardId: string) => void;
		onEditCard?: (card: CardType) => void;
		onManageAssociation?: (card: CardType) => void;
		// For purchase button in 'all' listMode
		currentPP?: number;
		currentGold?: number;
		onPurchaseCard?: (card: CardType) => void;
		// Sheet-only optional roll context; absent keeps cards read-only prose
		rollContext?: CardRollContext;
		// Sheet-only optional character attributes used to resolve card formulas;
		// absent keeps formula cards without chip or usage controls.
		formulaContext?: FormulaContext;
		// Full catalog (static + custom) needed to resolve the linked parent
		// name; falls back to the rendered cards for existing consumers.
		allCards?: CardType[];
	};

	let {
		cards,
		readonly = true,
		characterCards: initialCharacterCards = [],
		listMode = 'all',
		onChange = () => {},
		onCardReloadClick = () => {},
		onEditCard = () => {},
		onManageAssociation = undefined,
		currentPP = 0,
		currentGold = 0,
		onPurchaseCard = () => {},
		rollContext = undefined,
		formulaContext = undefined,
		allCards = undefined,
	}: Props = $props();

	let characterCards = $derived(initialCharacterCards);

	// Catalog used to resolve linked parent names and slot exemptions.
	// Existing consumers that do not pass allCards keep resolving against the
	// rendered cards, which still contains owned parents.
	let allCardsCatalog = $derived(allCards ?? cards);

	// Effective remaining uses remembered per card: when the total computed from
	// the character attributes shrinks below the persisted remaining, the value
	// is clamped down and never topped up when the total rises again (D5).
	type EffectiveUsesMemory = { stored: number | null; effective: number };
	let effectiveUsesMemory = $state<Record<string, EffectiveUsesMemory>>({});

	const getClampedUses = (characterCard: CharacterCard, card: CardType): number | null =>
		clampRemainingUses(characterCard.uses, getCardTotalUses(card, formulaContext));

	const getEffectiveUses = (cardId: string): number | null => {
		const characterCard = characterCards.find((cc) => cc.id === cardId);
		const card = cards.find((c) => c.id === cardId);
		if (!characterCard || !card) return null;
		const clamped = getClampedUses(characterCard, card);
		if (clamped === null) return null;
		const memory = effectiveUsesMemory[cardId];
		if (memory && memory.stored === characterCard.uses) {
			return Math.min(clamped, memory.effective);
		}
		return clamped;
	};

	// Keeps the remembered value in sync: it follows the persisted remaining
	// (manual edits, reloads) and only ratchets down while the persisted value
	// stays the same, so a rising total never tops the card up.
	$effect(() => {
		const next = { ...effectiveUsesMemory };
		let changed = false;
		for (const characterCard of characterCards) {
			const card = cards.find((c) => c.id === characterCard.id);
			if (!card) continue;
			const clamped = getClampedUses(characterCard, card);
			if (clamped === null) continue;
			const memory = next[characterCard.id];
			if (!memory || memory.stored !== characterCard.uses || clamped < memory.effective) {
				next[characterCard.id] = { stored: characterCard.uses, effective: clamped };
				changed = true;
			}
		}
		if (changed) effectiveUsesMemory = next;
	});

	// Persists the clamped remaining for formula cards when the computed total
	// shrinks below the stored value, so the clamp survives remounts and the
	// remaining uses are never topped up later (D5).
	$effect(() => {
		const clampedCards = characterCards.map((characterCard) => {
			const card = cards.find((c) => c.id === characterCard.id);
			if (!card?.uses.formula || characterCard.uses === null) return characterCard;
			const clamped = getClampedUses(characterCard, card);
			if (clamped === null || clamped >= characterCard.uses) return characterCard;
			return { ...characterCard, uses: clamped };
		});
		if (clampedCards.some((card, index) => card !== characterCards[index])) {
			onChange(clampedCards);
		}
	});

	type CardLinkState = {
		isLinked: boolean;
		parentName: string | null;
		parentInactive: boolean;
		hasValidLink: boolean;
		hasSlotExemption: boolean;
	};

	// Derives the presentation state of a linked card from the pure helpers of
	// card-association-utils, so the Svelte layer never re-implements the rule.
	const getCardLinkState = (
		characterCard: CharacterCard | undefined,
		characterCardsList: CharacterCard[],
		catalog: CardType[],
	): CardLinkState => {
		const grantedBy = characterCard?.grantedBy;
		if (!grantedBy || grantedBy.trim() === '') {
			return {
				isLinked: false,
				parentName: null,
				parentInactive: false,
				hasValidLink: false,
				hasSlotExemption: false,
			};
		}
		const hasValidLink =
			characterCard !== undefined ? hasValidCardLink(characterCard, characterCardsList) : false;
		return {
			isLinked: true,
			parentName: catalog.find((c) => c.id === grantedBy)?.name ?? null,
			// Parent-based rule: only an owned activable parent that is not
			// active produces `Origen inactivo`; an effect parent never does.
			parentInactive:
				characterCard !== undefined &&
				isInactiveActivableOrigin(characterCard, characterCardsList, catalog),
			hasValidLink,
			hasSlotExemption:
				characterCard !== undefined &&
				isEffectiveSlotExemption(characterCard, characterCardsList, catalog),
		};
	};

	const deactivateCard = (cardId: string) => {
		const originalCard = cards.find((card) => card.id === cardId);
		if (!originalCard) {
			removeCard(cardId);
			return;
		}
		characterCards = characterCards.map((card) => {
			if (card.id === cardId) {
				return { ...card, isActive: false, uses: getCardTotalUses(originalCard, formulaContext) };
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
				uses: getCardTotalUses(card, formulaContext),
				isActive: false,
				level: card.level,
				cardType: card.cardType,
				isOvercharged: false,
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

	// The reload action belongs to activable cards only: effect cards are never
	// activatable, so they track finite uses without exposing RELOAD.
	const isReloadableCard = (card: CardType) => {
		return card.type === 'activable' && card.uses.type === 'RELOAD';
	};

	const toggleOverload = (cardId: string) => {
		const updated = characterCards.map((card) =>
			card.id === cardId ? { ...card, isOvercharged: !card.isOvercharged } : card,
		);
		onChange(updated);
	};

	const isCardActive = (card: CardType) => {
		const found = characterCards.find((x) => x.id === card.id);
		return found ? found.isActive : false;
	};

	// Composes the roll source title for a sheet-rendered card. The context
	// carries the character name; blank sources fall back to the card name.
	const composeCardRollTitle = (sourceName: string, cardName: string): string => {
		const characterName = sourceName.trim();
		if (!characterName) return cardName;
		return `${characterName}: ${cardName}`;
	};

	// Composes the attack title for explosive card formulas following the
	// weapon convention `<Character>: Ataque con <Card>`. Blank sources fall
	// back to `Ataque con <Card>`.
	const composeCardAttackTitle = (sourceName: string, cardName: string): string => {
		const characterName = sourceName.trim();
		if (!characterName) return `Ataque con ${cardName}`;
		return `${characterName}: Ataque con ${cardName}`;
	};

	const hasRemainingCardUses = (card: CardType) => {
		const totalUses = getCardTotalUses(card, formulaContext);
		if (totalUses === null) return true; // Unlimited uses
		return (getEffectiveUses(card.id) ?? 0) > 0;
	};

	const canReloadCard = (card: CardType) => {
		const characterCard = characterCards.find((cc) => cc.id === card.id);
		if (!characterCard || characterCard?.isOvercharged) return false; // Cannot reload if overcharged
		const totalUses = getCardTotalUses(card, formulaContext);
		if (totalUses === null) return false; // Unlimited uses, cannot reload
		return (getEffectiveUses(card.id) ?? 0) < totalUses;
	};

	const useCard = (cardId: string) => {
		const card = cards.find((c) => c.id === cardId);
		if (!card) return;

		const currentUses = getCurrentUses(cardId);
		const totalUses = getCardTotalUses(card, formulaContext);

		if (currentUses === null) {
			// Unlimited uses, no need to decrease
			return;
		}

		// Spend from the effective remaining, which is clamped down to the total.
		const effectiveUses = getEffectiveUses(cardId);
		if (effectiveUses === null) return;

		if (totalUses !== null && effectiveUses <= 0) {
			// No remaining uses
			return;
		}

		updateCardCurrentUses(cardId, effectiveUses - 1);
	};
</script>

<div class="cards">
	{#each cards as card (card.id)}
		{@const characterCard = characterCards.find((cc) => cc.id === card.id)}
		{@const isCustom = card.id.startsWith('custom-')}
		{@const cardLinkState = getCardLinkState(characterCard, characterCards, allCardsCatalog)}
		<Card
			{card}
			isOvercharged={listMode === 'active' && (characterCard?.isOvercharged ?? false)}
			isExhausted={listMode === 'active' && !hasRemainingCardUses(card)}
			{isCustom}
			linkedParentName={cardLinkState.isLinked ? cardLinkState.parentName : undefined}
			linkedParentInactive={cardLinkState.parentInactive}
			linkedParentOrphan={cardLinkState.isLinked && !cardLinkState.hasValidLink}
			showSlotExemption={cardLinkState.hasSlotExemption}
			rollContext={rollContext
				? {
						...rollContext,
						title: composeCardRollTitle(rollContext.title, card.name),
						attackTitle: composeCardAttackTitle(rollContext.title, card.name),
					}
				: undefined}
			{formulaContext}
		>
			{#if !readonly}
				{#if listMode === 'active'}
					<div class="active-controls">
						{#if card.type === 'activable' && card.uses.type === 'RELOAD'}
							<label
								class="overload-checkbox boxed-control button-height-rhythm"
								title="Sobrecargada"
							>
								<input
									type="checkbox"
									checked={characterCard?.isOvercharged ?? false}
									onchange={() => toggleOverload(card.id)}
								/>
								<span class="indicator" aria-hidden="true">⚡</span>
								<span class="label-text">Sob</span>
							</label>
						{/if}
						{#if getCardTotalUses(card, formulaContext) !== null}
							<ReloadControl
								value={getEffectiveUses(card.id) ?? 0}
								max={getCardTotalUses(card, formulaContext)!}
								onValueChange={(value) => updateCardCurrentUses(card.id, value)}
								onReload={() => onCardReloadClick(card.id)}
								reloadDisabled={!canReloadCard(card)}
								reloadButtonHiden={true}
							/>
							{#if isReloadableCard(card) && !hasRemainingCardUses(card)}
								<button
									class="btn-reload-card"
									onclick={() => onCardReloadClick(card.id)}
									disabled={characterCard?.isOvercharged}>🎲 Recargar</button
								>
							{:else}
								<button
									class="btn-use-card"
									onclick={() => useCard(card.id)}
									disabled={characterCard?.isOvercharged || !hasRemainingCardUses(card)}
									>✨ Usar</button
								>
							{/if}
						{/if}
					</div>
					<!-- <div class="card-actions one active-one">
						<button onclick={() => deactivateCard(card.id)}>Desactivar</button>
					</div> -->
				{:else if listMode === 'collection'}
					{@const showEdit = isCustom}
					{@const showActivate = card.type === 'activable'}
					{@const showManageAssociation = onManageAssociation !== undefined}
					{@const actionCount = [showEdit, true, showActivate, showManageAssociation].filter(
						Boolean,
					).length}
					{@const actionLayoutClass =
						actionCount === 1
							? 'one'
							: actionCount === 2
								? 'two'
								: actionCount === 3
									? 'three'
									: actionCount === 4
										? 'four'
										: ''}
					<div class="card-actions {actionLayoutClass}">
						<!-- Emojis are visual decoration only; the accessible names stay clean. -->
						<button aria-label="Quitar" onclick={() => removeCard(card.id)}>🗑️ Quitar</button>
						{#if showEdit}
							<button aria-label="Editar" onclick={() => onEditCard(card)}>✏️ Editar</button>
						{/if}
						{#if showManageAssociation}
							{@const isLinked = !!characterCard?.grantedBy}
							<button
								class="association-action"
								aria-label={isLinked ? `Editar vinculación ${card.name}` : `Vincular ${card.name}`}
								onclick={() => onManageAssociation(card)}
							>
								{isLinked ? `🔗 Revincular` : `🔗 Vincular`}
							</button>
						{/if}
						{#if showActivate}
							{#if isCardActive(card)}
								<button aria-label="Desactivar" onclick={() => deactivateCard(card.id)}>
									🚫 Desactivar
								</button>
							{:else}
								<button aria-label="Activar" onclick={() => activateCard(card.id)}>
									✅ Activar
								</button>
							{/if}
						{/if}
					</div>
				{:else}
					<div class="card-actions">
						<button onclick={() => addCard(card)} class="btn-add">Agregar</button>
						{#if card.cardType === 'ability'}
							{@const levelValue = (card as any).level ? parseInt((card as any).level) || 1 : 1}
							{@const costValue = CONFIG.CARD_LEVEL_PP_COST[levelValue] || 0}
							{@const canPurchase = currentPP >= costValue}
							{#if costValue > 0}
								<button
									onclick={() => onPurchaseCard(card)}
									class="btn-purchase"
									class:disabled={!canPurchase}
									disabled={!canPurchase}
									title={!canPurchase
										? `PP insuficiente (tienes ${currentPP} PP)`
										: `Comprar (${costValue} PP)`}
								>
									Comprar ({costValue} PP)
								</button>
							{/if}
						{:else if card.cardType === 'item'}
							{@const itemCost = parseFloat((card as ItemCard).cost)}
							{#if !isNaN(itemCost) && itemCost > 0}
								{@const canPurchase = currentGold !== undefined && currentGold >= itemCost}
								<button
									onclick={() => onPurchaseCard(card)}
									class="btn-purchase"
									class:disabled={!canPurchase}
									disabled={!canPurchase}
									title={!canPurchase
										? `Oro insuficiente (tienes ${currentGold} o)`
										: `Comprar (${itemCost} o)`}
								>
									Comprar ({itemCost} o)
								</button>
							{/if}
						{/if}
					</div>
				{/if}
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

		.card-actions {
			display: flex;
			flex-direction: row;
			flex-wrap: wrap;
			align-items: center;
			justify-content: space-between;
			flex-grow: 1;
			padding-top: var(--spacing-sm);
			gap: var(--spacing-sm);
		}

		.card-actions.one {
			justify-content: flex-start;
		}

		.card-actions.active-one {
			justify-content: flex-end;
		}

		.card-actions {
			button {
				font-size: 0.85rem;
				padding-left: var(--spacing-xs);
				padding-right: var(--spacing-xs);
			}

			&.two,
			&.three,
			&.four {
				justify-content: space-between;
			}
		}

		.active-controls {
			display: flex;
			flex-direction: row;
			align-items: center;
			justify-content: space-between;
			flex-grow: 1;
			padding-top: var(--spacing-sm);
			gap: var(--spacing-sm);
		}

		.btn-use-card,
		.btn-reload-card {
			width: 5.5rem;

			&:disabled {
				opacity: 0.6;
				cursor: not-allowed;
			}
		}

		.btn-reload-card {
			padding-left: 0.01rem;
			padding-right: 0.05rem;
			font-size: 0.9rem;
			height: 2.375rem;
		}

		.btn-add {
			background-color: var(--secondary-bg);
			color: var(--text-primary);
			border: 1px solid var(--border-color);
			border-radius: var(--radius-md);
			cursor: pointer;
			font-size: 0.8rem;
		}

		.btn-add:hover {
			background-color: var(--primary-bg);
		}

		.btn-purchase {
			background-color: #f59e0b;
			color: #ffffff;
			border: none;
			border-radius: var(--radius-md);
			cursor: pointer;
			font-size: 0.8rem;
		}

		.btn-purchase:hover:not(.disabled) {
			filter: brightness(1.1);
		}

		.btn-purchase.disabled {
			background-color: var(--primary-bg);
			color: var(--text-secondary);
			cursor: not-allowed;
			opacity: 0.6;
		}

		.overload-checkbox {
			display: inline-flex;
			align-items: center;
			gap: var(--spacing-xs);
			font-size: 0.875rem;
			color: var(--color-text);
			cursor: pointer;
		}

		.overload-checkbox.boxed-control {
			justify-content: center;
			padding: calc(var(--spacing-xs) + 1px) var(--spacing-sm);
			border: 1px solid var(--border-color);
			border-radius: var(--radius-md);
			background: var(--secondary-bg);
			box-shadow: var(--shadow-sm);
		}

		.button-height-rhythm {
			box-sizing: border-box;
			min-height: calc((1rem * 1.25) + (var(--spacing-sm) * 2) + 2px);
		}

		.overload-checkbox input[type='checkbox'] {
			accent-color: var(--color-warning);
		}

		.overload-checkbox .indicator {
			line-height: 1;
		}

		.overload-checkbox .label-text {
			line-height: 1;
		}
	}
</style>
