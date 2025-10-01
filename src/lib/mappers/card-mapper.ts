import type { AbilityCard } from '$lib/types/cards/ability-card';
import type { Card } from '$lib/types/cards/card';
import type { ItemCard } from '$lib/types/cards/item-card';
import { removeDiacritics } from '$lib/utils/formatting';

import { generateId } from '$lib/utils/id-generator';
import { CONFIG } from '../../config';

const mapCard = (data: any): Card => {
	if (!data.name) throw new Error('Card name is required');
	return {
		id: generateId(data.name),
		...data,
		requirements: data.requirements ?? [],
	};
};

const mapAbilityCardImg = (tags: string[]) => {
	const first = removeDiacritics(tags.length > 0 ? String(tags[0]).toLowerCase() : '');

	if (CONFIG.ABILITY_CARD_BACKGROUNDS[first]) {
		return CONFIG.ABILITY_CARD_BACKGROUNDS[first];
	}

	return CONFIG.ABILITY_CARD_BACKGROUNDS.default;
};

export const mapAbilityCard = (data: any): AbilityCard => {
	return {
		...mapCard(data),
		type: data.type,
		img: mapAbilityCardImg(data.tags),
		cardType: 'ability',
	};
};

const mapItemCardImg = (tags: string[]) => {
	return CONFIG.ITEM_CARD_BACKGROUNDS.default;
};

export const mapItemCard = (data: any): ItemCard => {
	return {
		...mapCard(data),
		type: data.type,
		cost: data.cost,
		img: mapItemCardImg(data.tags),
		cardType: 'item',
	};
};
