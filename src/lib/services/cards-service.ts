import { resolve } from '$app/paths';
import { mapAbilityCard, mapItemCard } from '$lib/mappers/card-mapper';

import type { AbilityCard } from '$lib/types/cards/ability-card';
import type { Card } from '$lib/types/cards/card';
import type { ItemCard } from '$lib/types/cards/item-card';

import { load as loadYaml } from 'js-yaml';
import { get, writable, type Writable } from 'svelte/store';

const abilityCardsStore = writable<AbilityCard[]>([]);
const itemCardsStore = writable<ItemCard[]>([]);

const loadCards = async <T extends Card>(
	url: string,
	rootKey: string,
	store: Writable<T[]>,
	mapper: (x: any) => T,
) => {
	if (get(store).length > 0) return;

	const response = await fetch(resolve(url));
	const rawData = await response.text();

	let rawCards = [];

	try {
		rawCards = (loadYaml(rawData) as any)[rootKey] ?? [];
	} catch (e) {
		console.error('Error parsing YAML:', e);
	}

	store.set(
		rawCards
			.map((x) => mapper(x))
			.toSorted((a, b) => a.level - b.level || a.name.localeCompare(b.name)),
	);
};

export const useCardsService = () => {
	const loadAbilityCards = async () => {
		await loadCards('/docs/cards.yml', 'cards', abilityCardsStore, mapAbilityCard);
	};

	const loadItemCards = async () => {
		await loadCards('/docs/magical-items.yml', 'items', itemCardsStore, mapItemCard);
	};

	return {
		loadAbilityCards,
		abilityCards: abilityCardsStore,
		loadItemCards,
		itemCards: itemCardsStore,
	};
};
