import type { Card } from '$lib/types/cards/card';
import { CONFIG } from '../../config';

export const getCardTotalUses = (card: Card) => {
	if (card.uses.type === null) return null;
	switch (card.uses.type) {
		case 'USES':
		case 'LONG_REST':
		case 'DAY':
			return card.uses.qty ?? 0;
		case 'RELOAD':
			return CONFIG.RELOAD_CARD_USES;
		default:
			return null;
	}
};
