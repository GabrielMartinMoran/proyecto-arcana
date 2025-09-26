import { resolve } from '$app/paths';
import { mapCreature } from '$lib/mappers/creature-mapper';
import type { Creature } from '$lib/types/creature';
import { load } from 'js-yaml';
import { get, writable } from 'svelte/store';

const creaturesStore = writable<Creature[]>([]);

export const useCreaturesService = () => {
	const loadCreatures = async () => {
		if (get(creaturesStore).length > 0) return;

		const response = await fetch(resolve('/docs/bestiary.yml'));
		const rawData = await response.text();

		let rawCreatures = [];

		try {
			rawCreatures = (load(rawData) as any).creatures ?? [];
		} catch (e) {
			console.error('Error parsing YAML:', e);
		}

		creaturesStore.set(rawCreatures.map((x) => mapCreature(x)));
	};

	return {
		loadCreatures,
		creatures: creaturesStore,
	};
};
