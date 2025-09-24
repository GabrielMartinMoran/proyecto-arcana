import { Character } from '$lib/types/character';
import { writable } from 'svelte/store';

const STORAGE_KEY = 'arcana:characters';

const state = {
	charactersStore: writable<Character[]>([]),
	exampleCharactersStore: writable<Character[]>([]),
	charactersAlreadyLoaded: false,
	exampleCharactersAlreadyLoaded: false,
};

const subscribePersistance = () => {
	state.charactersStore.subscribe((characters: Character[]) => {
		const serialized = JSON.stringify(characters);
		localStorage.setItem(STORAGE_KEY, serialized);
	});
};

export const useCharactersService = () => {
	const loadCharacters = async () => {
		if (state.charactersAlreadyLoaded) return;
		const rawLoaded = localStorage.getItem(STORAGE_KEY);
		if (rawLoaded) {
			try {
				const characters = JSON.parse(rawLoaded);
				state.charactersStore.set(characters.map((x) => new Character(x)));
			} catch (error) {
				console.error('Error parsing characters JSON:', error);
			}
		}
		subscribePersistance();
		state.charactersAlreadyLoaded = true;
	};

	const loadExampleCharacters = async () => {
		if (state.exampleCharactersAlreadyLoaded) return;
		let characters: any[] = [];
		try {
			const response = await fetch('/docs/example-characters.json');
			characters = await response.json();
		} catch (error) {
			console.error('Error fetching example characters:', error);
		}
		try {
			state.exampleCharactersStore.set(characters.map((x) => new Character(x)));
		} catch (error) {
			console.error('Error parsing example characters JSON:', error);
		}
		state.exampleCharactersAlreadyLoaded = true;
	};

	return {
		loadCharacters: loadCharacters,
		loadExampleCharacters: loadExampleCharacters,
		characters: state.charactersStore,
		exampleCharacters: state.exampleCharactersStore,
	};
};
