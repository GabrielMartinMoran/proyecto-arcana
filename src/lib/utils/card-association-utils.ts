import type { Card } from '$lib/types/cards/card';
import type { CharacterCard } from '$lib/types/character';
import { getCardTotalUses } from './card-utils';
import { evaluateRequirements } from './requirement-expression';

export type CardAssociationErrorCode = 'PARENT_NOT_OWNED' | 'SELF_ASSOCIATION' | 'CYCLE';

export type CardAssociationValidationResult =
	{ valid: true } | { valid: false; code: CardAssociationErrorCode; message: string };

export interface ParentCandidateOption {
	card: Card;
	fulfillsRequirement: boolean;
	isActive: boolean;
	isCustom: boolean;
}

const CUSTOM_CARD_ID_PREFIX = 'custom-';

const ASSOCIATION_ERROR_MESSAGES: Record<CardAssociationErrorCode, string> = {
	PARENT_NOT_OWNED: 'La carta padre debe pertenecer a la colección del personaje.',
	SELF_ASSOCIATION: 'Una carta no puede ser su propio padre.',
	CYCLE: 'La asociación crearía un ciclo entre cartas.',
};

const resolveCardDefinition = (cardId: string, allCards: Card[]): Card | undefined =>
	allCards.find((card) => card.id === cardId);

const getParentById = (
	parentId: string,
	characterCards: CharacterCard[],
): CharacterCard | undefined => characterCards.find((card) => card.id === parentId);

const isCustomCard = (card: Card): boolean => card.id.startsWith(CUSTOM_CARD_ID_PREFIX);

const isActivableDefinition = (cardId: string, allCards: Card[]): boolean =>
	resolveCardDefinition(cardId, allCards)?.type === 'activable';

const getFulfilledPossessedNames = (
	characterCards: CharacterCard[],
	allCards: Card[],
): string[] => {
	const names: string[] = [];
	for (const characterCard of characterCards) {
		const definition = resolveCardDefinition(characterCard.id, allCards);
		if (definition) {
			names.push(definition.name.toLowerCase());
		}
	}
	return names;
};

/**
 * Splits a requirement expression into its atoms using the same separators that
 * requirement-expression tokenizes on, so the check matches its semantics.
 */
const getRequirementAtoms = (expression: string): string[] =>
	expression
		.split(/[&|()]/)
		.map((atom) => atom.trim().toLowerCase())
		.filter((atom) => atom.length > 0);

const candidateFulfillsRequirement = (
	childDefinition: Card,
	candidateName: string,
	fulfilledPossessedNames: string[],
): boolean => {
	const expression = childDefinition.requirements;
	if (!expression) return false;
	const atoms = getRequirementAtoms(expression);
	if (atoms.length === 0) return false;
	if (!atoms.includes(candidateName.toLowerCase())) return false;
	return evaluateRequirements(expression, fulfilledPossessedNames);
};

const deactivateWithRestoredUses = (card: CharacterCard, allCards: Card[]): CharacterCard => {
	const definition = resolveCardDefinition(card.id, allCards);
	return {
		...card,
		isActive: false,
		uses: definition ? getCardTotalUses(definition) : card.uses,
	};
};

const invalid = (code: CardAssociationErrorCode): CardAssociationValidationResult => ({
	valid: false,
	code,
	message: ASSOCIATION_ERROR_MESSAGES[code],
});

const wouldCreateCycle = (
	childId: string,
	parentId: string,
	characterCards: CharacterCard[],
): boolean => {
	const visitedIds = new Set<string>();
	let currentId: string | null | undefined = parentId;
	while (currentId !== null && currentId !== undefined && currentId !== '') {
		if (currentId === childId) return true;
		if (visitedIds.has(currentId)) return true;
		visitedIds.add(currentId);
		currentId = getParentById(currentId, characterCards)?.grantedBy ?? null;
	}
	return false;
};

/**
 * Returns the owned cards (excluding the child itself) that can act as parent,
 * resolving each definition and ordering first the options that fulfill the
 * child requirement. Options expose the match, the active state and the custom
 * flag so the UI can present them without re-deriving the rule.
 */
export const getOwnedParentCandidates = (
	child: CharacterCard,
	characterCards: CharacterCard[],
	allCards: Card[],
): ParentCandidateOption[] => {
	const childDefinition = resolveCardDefinition(child.id, allCards);
	const fulfilledPossessedNames = getFulfilledPossessedNames(characterCards, allCards);
	const candidates: ParentCandidateOption[] = [];

	for (const characterCard of characterCards) {
		if (characterCard.id === child.id) continue;
		const card = resolveCardDefinition(characterCard.id, allCards);
		if (!card) continue;
		candidates.push({
			card,
			fulfillsRequirement: childDefinition
				? candidateFulfillsRequirement(childDefinition, card.name, fulfilledPossessedNames)
				: false,
			isActive: characterCard.isActive,
			isCustom: isCustomCard(card),
		});
	}

	return candidates.sort((a, b) => Number(b.fulfillsRequirement) - Number(a.fulfillsRequirement));
};

export const validateCardAssociation = (
	childId: string,
	parentId: string,
	characterCards: CharacterCard[],
): CardAssociationValidationResult => {
	if (parentId === childId) return invalid('SELF_ASSOCIATION');
	if (!getParentById(parentId, characterCards)) return invalid('PARENT_NOT_OWNED');
	if (wouldCreateCycle(childId, parentId, characterCards)) return invalid('CYCLE');
	return { valid: true };
};

export const hasValidCardLink = (card: CharacterCard, characterCards: CharacterCard[]): boolean => {
	const parentId = card.grantedBy;
	if (parentId === null || parentId === undefined || parentId.trim() === '') return false;
	if (parentId === card.id) return false;
	return getParentById(parentId, characterCards) !== undefined;
};

/**
 * Returns the owned parent of a card only when its link is valid. Orphan,
 * self, empty and missing links return undefined so callers fail closed.
 */
const getValidParent = (
	card: CharacterCard,
	characterCards: CharacterCard[],
): CharacterCard | undefined =>
	hasValidCardLink(card, characterCards)
		? getParentById(card.grantedBy ?? '', characterCards)
		: undefined;

export const isEffectiveSlotExemption = (
	card: CharacterCard,
	characterCards: CharacterCard[],
	allCards: Card[],
): boolean => {
	const parent = getValidParent(card, characterCards);
	if (!parent) return false;
	if (card.doesNotConsumeActiveSlot !== true) return false;
	if (!isActivableDefinition(card.id, allCards)) return false;
	// A non-activable parent (an effect, the common case) is always available,
	// so the exemption is effective regardless of its active state. An activable
	// parent only grants the exemption while it is active.
	if (!isActivableDefinition(parent.id, allCards)) return true;
	return parent.isActive === true;
};

/**
 * Pure rule for the `Origen inactivo` presentation state. It is true only when
 * the link is valid and the owned parent is an activable card that is not
 * active. The child type is deliberately not checked: the state describes the
 * parent, and an effect parent can never produce it.
 */
export const isInactiveActivableOrigin = (
	card: CharacterCard,
	characterCards: CharacterCard[],
	allCards: Card[],
): boolean => {
	const parent = getValidParent(card, characterCards);
	if (!parent) return false;
	if (!isActivableDefinition(parent.id, allCards)) return false;
	return parent.isActive !== true;
};

export const getSlotConsumingActiveCards = (
	characterCards: CharacterCard[],
	allCards: Card[],
): CharacterCard[] =>
	characterCards.filter(
		(card) =>
			card.isActive &&
			isActivableDefinition(card.id, allCards) &&
			!isEffectiveSlotExemption(card, characterCards, allCards),
	);

export const getAssociatedDescendants = (
	parentId: string,
	characterCards: CharacterCard[],
): CharacterCard[] => {
	const descendants: CharacterCard[] = [];
	const visitedIds = new Set<string>([parentId]);

	const collect = (currentParentId: string): void => {
		for (const card of characterCards) {
			if (card.grantedBy !== currentParentId) continue;
			if (card.id === currentParentId || visitedIds.has(card.id)) continue;
			visitedIds.add(card.id);
			descendants.push(card);
			collect(card.id);
		}
	};

	collect(parentId);
	return descendants;
};

export const applyParentDeactivation = (
	parentId: string,
	characterCards: CharacterCard[],
	allCards: Card[],
): CharacterCard[] => {
	if (!getParentById(parentId, characterCards)) return characterCards;
	const affectedIds = new Set(
		getAssociatedDescendants(parentId, characterCards).map((card) => card.id),
	);
	return characterCards.map((card) => {
		if (card.id === parentId) return deactivateWithRestoredUses(card, allCards);
		if (!affectedIds.has(card.id)) return card;
		if (!isActivableDefinition(card.id, allCards)) return card;
		return deactivateWithRestoredUses(card, allCards);
	});
};

export const applyParentRemoval = (
	parentId: string,
	characterCards: CharacterCard[],
	allCards: Card[],
): CharacterCard[] => {
	if (!getParentById(parentId, characterCards)) return characterCards;
	const affectedIds = new Set(
		getAssociatedDescendants(parentId, characterCards).map((card) => card.id),
	);
	return characterCards
		.filter((card) => card.id !== parentId)
		.map((card) => {
			if (!affectedIds.has(card.id)) return card;
			// Removing the link also removes the explicit no-slot choice: the
			// exemption no longer has an origin to point at.
			const cleared = { ...card, grantedBy: null };
			delete cleared.doesNotConsumeActiveSlot;
			if (!isActivableDefinition(card.id, allCards)) return cleared;
			return deactivateWithRestoredUses(cleared, allCards);
		});
};
