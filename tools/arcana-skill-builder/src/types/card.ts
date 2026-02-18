export interface Uses {
	qty: number | null;
	type: 'RELOAD' | 'USES' | 'LONG_REST' | 'DAY';
}

export interface Card {
	id: string;
	name: string;
	slug?: string;
	level: number;
	tags: string[];
	requirements: string | null;
	description: string;
	uses: Uses;
	type: string;
	cardType: 'ability' | 'item';
}

export interface AbilityCard extends Card {
	type: 'efecto' | 'activable';
	cardType: 'ability';
}

export interface ItemCard extends Card {
	cost: string;
	type: 'efecto' | 'activable' | 'consumible';
	cardType: 'item';
}
