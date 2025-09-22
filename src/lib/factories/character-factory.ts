import { Character } from '$lib/types/character';
import { CONFIG } from '../../config';

export const createCharacter = () => {
	return new Character({
		id: crypto.randomUUID(),
		name: 'Nuevo Personaje',
		attributes: {
			cuerpo: 1,
			reflejos: 1,
			mente: 1,
			instinto: 1,
			presencia: 1,
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
	});
};
