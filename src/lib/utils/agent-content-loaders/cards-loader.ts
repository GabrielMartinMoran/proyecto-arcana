import { mapAbilityCard, mapItemCard } from '$lib/mappers/card-mapper';
import type { Card } from '$lib/types/cards/card';
import { serializeCardsAsMDTable } from '$lib/utils/serializers/card-serializer';
import { load as yamlLoad } from 'js-yaml';
import { loadAgentFile } from './agent-content-loader';

const ABILITY_CARDS_FILE_PATH = '/docs/cards.yml';
const MAGICAL_ITEM_CARDS_FILE_PATH = '/docs/magical-items.yml';

const loadCards = async (
	path: string,
	mapper: (card: any) => Card,
	rootKey: string,
): Promise<string> => {
	const fileContent = await loadAgentFile(path);

	let rawCards = [];
	try {
		rawCards = (yamlLoad(fileContent) as any)[rootKey] ?? [];
	} catch (e) {
		console.error('Error parsing YAML:', e);
	}

	const cards = rawCards.map((x) => mapper(x));

	return serializeCardsAsMDTable(cards);
};

export const loadAbilityCardsAsMD = async () => {
	return await loadCards(ABILITY_CARDS_FILE_PATH, mapAbilityCard, 'cards');
};

export const loadMagicalItemsCardsAsMD = async () => {
	return await loadCards(MAGICAL_ITEM_CARDS_FILE_PATH, mapItemCard, 'items');
};
