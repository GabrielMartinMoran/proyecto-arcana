import { mapCard } from '$lib/mappers/card-mapper';
import type { Card } from '$lib/types/card';

import { load } from 'js-yaml';
import { get, writable } from 'svelte/store';

const cardsStore = writable<Card[]>([]);

export const useCardsService = () => {
	const loadCards = async () => {
		if (get(cardsStore).length > 0) return;

		const response = await fetch('/docs/cards.yml');
		const rawData = await response.text();

		let rawCards = [];

		try {
			rawCards = (load(rawData) as any).cards ?? [];
		} catch (e) {
			console.error('Error parsing YAML:', e);
		}

		cardsStore.set(rawCards.map((x) => mapCard(x)));
	};

	return {
		loadCards,
		cards: cardsStore,
	};
};
