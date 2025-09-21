import { Character } from '$lib/types/character';
import { writable } from 'svelte/store';

const STORAGE_KEY = 'arcana:characters';

const state = {
	charactersStore: writable<Character[]>([]),
	alreadyLoaded: false,
};

const charactersStore = writable<Character[]>([]);

const subscribePersistance = () => {
	charactersStore.subscribe((characters: Character[]) => {
		const serialized = JSON.stringify(characters);
		localStorage.setItem(STORAGE_KEY, serialized);
	});
};

export const useCharactersService = () => {
	const loadCharacters = async () => {
		if (state.alreadyLoaded) return;
		const rawLoaded = localStorage.getItem(STORAGE_KEY);
		if (rawLoaded) {
			try {
				const characters = JSON.parse(rawLoaded);
				charactersStore.set(characters.map((x) => new Character(x)));
			} catch (error) {
				console.error('Error parsing characters JSON:', error);
			}
		}
		subscribePersistance();
		state.alreadyLoaded = true;
	};

	return {
		loadCharacters: loadCharacters,
		characters: charactersStore,
	};
};
