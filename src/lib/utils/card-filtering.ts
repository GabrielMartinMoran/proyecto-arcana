import type { CardFilters } from '$lib/types/card-filters';
import type { Card } from '$lib/types/cards/card';
import type { Character } from '$lib/types/character';
import { CONFIG } from '../../config';
import { removeDiacritics } from './formatting';

export const filterCards = (
	cards: Card[],
	filters: CardFilters,
	character: Character | undefined = undefined,
) => {
	let fulfilledRequirements: string[] = [];
	let filterOnlyAvailables = false;
	if (character && filters.onlyAvailables) {
		fulfilledRequirements = getFulfilledRequirements(cards, character);
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
			(!filterOnlyAvailables || isAvailable(card, fulfilledRequirements))
		);
	});
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
const isAvailable = (card: Card, fulfilledRequirements: string[]) => {
	// For cards with ORs, we consider all are ORs
	if (card.requirements.find((x) => x.toLowerCase().startsWith('o '))) {
		return card.requirements.some((req) =>
			fulfilledRequirements.includes(req.toLowerCase().replace('o ', '')),
		);
	}
	return card.requirements.every((req) => fulfilledRequirements.includes(req.toLowerCase()));
};
