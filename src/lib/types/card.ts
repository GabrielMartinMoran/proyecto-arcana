import type { Uses } from './uses';

export interface Card {
	id: string;
	name: string;
	level: number;
	type: 'efecto' | 'activable';
	tags: string[];
	requirements: string[];
	description: string;
	uses: Uses;
}
