import type { AbilityCard } from '$lib/types/cards/ability-card';
import type { Card } from '$lib/types/cards/card';
import type { ItemCard } from '$lib/types/cards/item-card';
import type { Uses } from '$lib/types/uses';
import { removeDiacritics } from '$lib/utils/formatting';

import { generateId } from '$lib/utils/id-generator';
import { CONFIG } from '../../config';

const mapCard = (data: any): Card => {
	if (!data.name) throw new Error('Card name is required');
	return {
		id: generateId(data.name),
		...data,
		requirements: data.requirements ?? null,
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

const getItemCardImg = () => CONFIG.ITEM_CARD_BACKGROUNDS.default;

export const mapItemCard = (data: any): ItemCard => {
	return {
		...mapCard(data),
		type: data.type,
		cost: data.cost,
		img: getItemCardImg(),
		cardType: 'item',
	};
};

const VALID_ABILITY_TYPES = ['efecto', 'activable'];
const VALID_ITEM_TYPES = ['efecto', 'activable', 'consumible'];
const VALID_USES_TYPES = ['RELOAD', 'USES', 'LONG_REST', 'DAY'];

const validateCommonFields = (data: any) => {
	if (!data.name || typeof data.name !== 'string' || data.name.trim() === '') {
		throw new Error('Card name is required');
	}
	if (data.level === undefined || data.level === null) {
		throw new Error('Card level is required');
	}
	if (typeof data.level !== 'number' || data.level < 0) {
		throw new Error('Card level must be >= 0');
	}
};

const normalizeUses = (uses: any): Uses => {
	if (!uses || typeof uses !== 'object') {
		return { qty: 0, type: null };
	}

	if (uses.type === null || uses.type === undefined || uses.type === 'NULL') {
		return { qty: uses.qty ?? 0, type: null };
	}

	if (uses.qty === undefined || uses.qty === null) {
		throw new Error('Card uses.qty is required');
	}
	if (!VALID_USES_TYPES.includes(uses.type)) {
		throw new Error(
			`Invalid uses.type: ${uses.type}. Must be one of ${VALID_USES_TYPES.join(', ')}`,
		);
	}
	return { qty: uses.qty, type: uses.type as Uses['type'] };
};

export const mapCustomAbilityCard = (data: unknown, existingId?: string): AbilityCard => {
	const d = data as any;
	try {
		validateCommonFields(d);
		if (!VALID_ABILITY_TYPES.includes(d.type)) {
			throw new Error(
				`Invalid ability type: ${d.type}. Must be one of ${VALID_ABILITY_TYPES.join(', ')}`,
			);
		}

		const uses = normalizeUses(d.uses);

		return {
			id: existingId || `custom-${crypto.randomUUID()}`,
			name: d.name,
			level: d.level,
			tags: Array.isArray(d.tags) ? d.tags : [],
			requirements: d.requirements ?? null,
			description: d.description ?? '',
			uses,
			type: d.type,
			img: mapAbilityCardImg(d.tags),
			cardType: 'ability',
		};
	} catch (error) {
		if (error instanceof Error) throw error;
		throw new Error('Error parsing custom ability card: ' + String(error));
	}
};

export const mapCustomItemCard = (data: unknown, existingId?: string): ItemCard => {
	const d = data as any;
	try {
		validateCommonFields(d);
		if (!VALID_ITEM_TYPES.includes(d.type)) {
			throw new Error(
				`Invalid item type: ${d.type}. Must be one of ${VALID_ITEM_TYPES.join(', ')}`,
			);
		}
		if (!d.cost || typeof d.cost !== 'string') {
			throw new Error('Item cost is required');
		}

		const uses = normalizeUses(d.uses);

		return {
			id: existingId || `custom-${crypto.randomUUID()}`,
			name: d.name,
			level: d.level,
			tags: Array.isArray(d.tags) ? d.tags : [],
			requirements: d.requirements ?? null,
			description: d.description ?? '',
			uses,
			type: d.type,
			cost: d.cost,
			img: getItemCardImg(),
			cardType: 'item',
		};
	} catch (error) {
		if (error instanceof Error) throw error;
		throw new Error('Error parsing custom item card: ' + String(error));
	}
};
