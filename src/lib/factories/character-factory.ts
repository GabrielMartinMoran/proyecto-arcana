import { Character } from '$lib/types/character';

export const createCharacter = () => {
	return new Character({
		id: crypto.randomUUID(),
		name: 'Nuevo Personaje',
		attributes: {
			cuerpo: 1,
			reflejos: 2,
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
		currentLuck: 2,
		img: null,
		story: '',
		notes: [],
		languages: '',
		quickInfo: '',
		attacks: [],
	});
};
