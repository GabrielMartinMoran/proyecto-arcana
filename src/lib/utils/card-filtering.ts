import type { CardFilters } from '$lib/types/card-filters';
import type { Card } from '$lib/types/cards/card';
import type { Character } from '$lib/types/character';
import { CONFIG } from '../../config';
import { removeDiacritics } from './formatting';
import { evaluateRequirements } from './requirement-expression';

export const filterCards = (
	cards: Card[],
	filters: CardFilters,
	character: Character | undefined = undefined,
) => {
	let fulfilledRequirements: string[] = [];
	let activeAliasExtras: AliasExtra[] = [];
	let filterOnlyAvailables = false;
	if (character && filters.onlyAvailables) {
		fulfilledRequirements = getFulfilledRequirements(cards, character);
		activeAliasExtras = getActiveAliasExtras(fulfilledRequirements, character);
		filterOnlyAvailables = true;
	}

	return cards.filter((card) => {
		let splitTextFilters = removeDiacritics(filters.name.toLowerCase())
			.split('|')
			.filter((x) => x.length > 0);
		if (splitTextFilters.length === 0) {
			splitTextFilters = [''];
		}
		return (
			splitTextFilters.some((x) => removeDiacritics(card.name.toLowerCase()).includes(x)) &&
			(filters.level.length === 0 || filters.level.includes(card.level)) &&
			(filters.tags.length === 0 ||
				filters.tags.every((tag) => card.tags.map((t) => t.toLowerCase()).includes(tag))) &&
			(!filters.type || filters.type === card.type) &&
			(!filterOnlyAvailables || isAvailable(card, fulfilledRequirements, activeAliasExtras))
		);
	});
};

type AliasExtra = {
	targetCard: string;
	extraFulfilled: string[];
};

const getActiveAliasExtras = (
	fulfilledRequirements: string[],
	character: Character,
): AliasExtra[] => {
	const extras: AliasExtra[] = [];
	for (const alias of CONFIG.CARD_ALIASES) {
		const hasTrigger = alias.triggerCards.some((name) =>
			fulfilledRequirements.includes(name.toLowerCase()),
		);
		if (!hasTrigger) continue;

		const extraFulfilled: string[] = [alias.targetCard.toLowerCase()];
		for (const sub of alias.attributeSubstitutions) {
			const toAttrKey = Object.entries(CONFIG.ATTR_NAME_MAP).find(([, v]) => v === sub.to)?.[0];
			if (!toAttrKey) continue;
			for (let i = 1; i <= character.attributes[toAttrKey]; i++) {
				extraFulfilled.push(`${sub.from} ${i}`.toLowerCase());
			}
		}
		extras.push({ targetCard: alias.targetCard.toLowerCase(), extraFulfilled });
	}
	return extras;
};

const getFulfilledRequirements = (cards: Card[], character: Character) => {
	const availableTags: string[] = [];
	for (const attribute of Object.keys(CONFIG.ATTR_NAME_MAP)) {
		for (let i = 1; i <= character.attributes[attribute]; i++) {
			availableTags.push(`${CONFIG.ATTR_NAME_MAP[attribute]} ${i}`.toLowerCase());
		}
	}
	const characterCards = cards.filter((x) => character.cards.find((y) => y.id === x.id));
	for (const ownedCard of characterCards) {
		availableTags.push(ownedCard.name.toLowerCase());
	}

	const obtainedLineageCardsCount = cards.filter(
		(x) => x.tags.includes(CONFIG.LINEAGE_CARD_TAG) && character.cards.find((y) => y.id === x.id),
	).length;
	if (
		character.cards.length <= CONFIG.MAX_CARDS_TO_INCLUDE_LINEAGES &&
		obtainedLineageCardsCount < CONFIG.MAX_LINEAGE_CARDS
	) {
		availableTags.push(CONFIG.LINEAGE_REQUIREMENT.toLowerCase());
	}
	return availableTags;
};

const isAvailable = (
	card: Card,
	fulfilledRequirements: string[],
	activeAliasExtras: AliasExtra[],
) => {
	// Check with base fulfilled requirements first
	if (evaluateRequirements(card.requirements, fulfilledRequirements)) return true;

	// If base check failed, try applying alias extras for any alias whose targetCard
	// appears in this card's requirements
	for (const alias of activeAliasExtras) {
		if (!card.requirements?.toLowerCase().includes(alias.targetCard)) continue;
		const extended = [...fulfilledRequirements, ...alias.extraFulfilled];
		if (evaluateRequirements(card.requirements, extended)) return true;
	}

	return false;
};
