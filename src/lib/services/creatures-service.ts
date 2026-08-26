import { loadBestiaryCreatures } from '$lib/utils/bestiary-source-loader';
import type { Creature } from '$lib/types/creature';
import { get, writable } from 'svelte/store';

const creaturesStore = writable<Creature[]>([]);

export const useCreaturesService = () => {
	const loadCreatures = async () => {
		if (get(creaturesStore).length > 0) return;

		const creatures = await loadBestiaryCreatures();

		creaturesStore.set(
			creatures.toSorted((a, b) => a.tier - b.tier || a.name.localeCompare(b.name)),
		);
	};

	return {
		loadCreatures,
		creatures: creaturesStore,
	};
};
