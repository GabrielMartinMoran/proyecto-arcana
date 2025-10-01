import type { Uses } from '../uses';

export interface Card {
	id: string;
	name: string;
	level: number;
	tags: string[];
	requirements: string[];
	description: string;
	uses: Uses;
	type: string;
	cardType: 'ability' | 'item';
	img?: string;
}
