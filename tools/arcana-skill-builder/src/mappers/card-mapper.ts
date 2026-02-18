import { sha1 } from 'js-sha1';
import type { AbilityCard, Card, ItemCard } from '../types/card.js';
import { slugify } from '../utils/formatting.js';

const generateId = (seed: string): string => sha1(seed);

const cloneRequirements = (requirements: any) => {
	if (requirements == null) return null;
	return JSON.parse(JSON.stringify(requirements));
};

const toNormalizedString = (value: unknown): string | null => {
	if (typeof value !== 'string') return null;
	const trimmed = value.trim();
	return trimmed.length > 0 ? trimmed : null;
};

const deriveSlug = (value: unknown, fallback: string): string => {
	const candidate = toNormalizedString(value);
	return slugify(candidate ?? fallback);
};

const mapCard = (data: any): Card => {
	const name = toNormalizedString(data.name);
	if (!name) throw new Error('Card name is required');

	return {
		id: generateId(name),
		...data,
		name,
		slug: deriveSlug(data.slug, name),
		requirements: cloneRequirements(data.requirements),
	};
};

export const mapAbilityCard = (data: any): AbilityCard => {
	return {
		...mapCard(data),
		type: data.type,
		cardType: 'ability',
	};
};

export const mapItemCard = (data: any): ItemCard => {
	return {
		...mapCard(data),
		type: data.type,
		cost: data.cost,
		cardType: 'item',
	};
};
