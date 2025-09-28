import { Character } from '$lib/types/character';
import { CONFIG } from '../../config';

export const createCharacter = () => {
	return new Character({
		id: crypto.randomUUID(),
		name: 'Nuevo Personaje',
		attributes: {
			body: 1,
			reflexes: 1,
			mind: 1,
			instinct: 1,
			presence: 1,
		},
		cards: [],
		ppHistory: [],
		goldHistory: [],
		equipment: [],
		modifiers: [],
		currentHP: 0,
		tempHP: 0,
		currentLuck: CONFIG.STARTING_LUCK,
		img: null,
		story: '',
		notes: [],
		languages: '',
		quickInfo: '',
		attacks: [],
		maxActiveCards: CONFIG.BASE_MAX_ACTIVE_CARDS,
		version: 1,
	});
};
