import type { Card } from '$lib/types/cards/card';

export interface AbilityCard extends Card {
	type: 'efecto' | 'activable';
	cardType: 'ability';
}
