import type { Attributes } from '$lib/types/attributes';
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
	let filterOnlyAvailables = false;
	if (character && filters.onlyAvailables) {
		fulfilledRequirements = getFulfilledRequirements(cards, character);
		fulfilledRequirements = addAliasFulfillments(fulfilledRequirements, character);
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
			(!filterOnlyAvailables || evaluateRequirements(card.requirements, fulfilledRequirements))
		);
	});
};

const getAttributeKeyByDisplayName = (displayName: string): keyof Attributes | undefined => {
	const entry = Object.entries(CONFIG.ATTR_NAME_MAP).find(([, name]) => name === displayName);
	return entry?.[0] as keyof Attributes | undefined;
};

/**
 * Expands the fulfilled requirements with the aliases granted by possessed
 * archetype cards: the target card they unlock and, for every substituted
 * attribute, the virtual levels the character reaches with the real attribute
 * (for example `Atributo Arcano 3` when Mente is 3). Adding them unconditionally
 * keeps the availability check consistent with inline dice alias resolution,
 * where the virtual attribute is available to every card that references it.
 */
const addAliasFulfillments = (fulfilledRequirements: string[], character: Character): string[] => {
	const aliasFulfillments: string[] = [];
	for (const alias of CONFIG.CARD_ALIASES) {
		const isTriggerOwned = alias.triggerCards.some((name) =>
			fulfilledRequirements.includes(name.toLowerCase()),
		);
		if (!isTriggerOwned) continue;

		aliasFulfillments.push(alias.targetCard.toLowerCase());
		for (const substitution of alias.attributeSubstitutions) {
			const attributeKey = getAttributeKeyByDisplayName(substitution.to);
			if (!attributeKey) continue;
			for (let value = 1; value <= character.attributes[attributeKey]; value++) {
				aliasFulfillments.push(`${substitution.from} ${value}`.toLowerCase());
			}
		}
	}
	return [...fulfilledRequirements, ...aliasFulfillments];
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
