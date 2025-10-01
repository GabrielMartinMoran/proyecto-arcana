import type { CardFilters } from '$lib/types/card-filters';
import type { Card } from '$lib/types/cards/card';
import { removeDiacritics } from './formatting';

export const filterCards = (cards: Card[], filters: CardFilters) => {
	return cards.filter((card) => {
		return (
			removeDiacritics(card.name.toLowerCase()).includes(
				removeDiacritics(filters.name.toLowerCase()),
			) &&
			(filters.level.length === 0 || filters.level.includes(card.level)) &&
			(filters.tags.length === 0 ||
				filters.tags.every((tag) => card.tags.map((t) => t.toLowerCase()).includes(tag))) &&
			(!filters.type || filters.type === card.type)
		);
	});
};
