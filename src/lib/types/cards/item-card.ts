import type { Card } from '$lib/types/cards/card';

export interface ItemCard extends Card {
	cost: string;
	type: 'efecto' | 'activable' | 'consumible';
	cardType: 'item';
}
