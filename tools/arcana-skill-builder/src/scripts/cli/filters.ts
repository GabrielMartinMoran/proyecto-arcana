import type { AbilityCard, Card, ItemCard } from '../../types/card.js';

export type CardKind = 'ability' | 'item' | 'any';

export interface CardFilterOptions {
	cardKind?: CardKind;
	types?: string[];
	nameIncludes?: string;
	slugIncludes?: string;
	level?: number | number[];
	minLevel?: number;
	maxLevel?: number;
	tagsAll?: string[];
	tagsAny?: string[];
	tagsExclude?: string[];
	requirementsIncludes?: string[];
}

const normalize = (value: string): string => value.toLocaleLowerCase();

const normalizeList = (values: string[] | undefined): string[] =>
	values?.map((value) => normalize(value)) ?? [];

const matchesCardKind = (card: Card, kind: CardKind | undefined): boolean => {
	if (!kind || kind === 'any') return true;
	return card.cardType === kind;
};

const matchesType = (card: Card, types: string[] | undefined): boolean => {
	if (!types || types.length === 0) return true;
	const normalizedTypes = normalizeList(types);
	const cardType = normalize(card.type);
	return normalizedTypes.some((type) => type === cardType);
};

const matchesName = (card: Card, value: string | undefined): boolean => {
	if (!value) return true;
	const target = normalize(value);
	return normalize(card.name).includes(target);
};

const matchesSlug = (card: Card, value: string | undefined): boolean => {
	if (!value) return true;
	const slug = card.slug ? normalize(card.slug) : '';
	const target = normalize(value);
	return slug.includes(target);
};

const matchesLevel = (card: Card, options: CardFilterOptions): boolean => {
	const { level, minLevel, maxLevel } = options;
	if (Array.isArray(level) && level.length > 0) {
		return level.includes(card.level);
	}
	if (typeof level === 'number') {
		return card.level === level;
	}
	if (typeof minLevel === 'number' && card.level < minLevel) {
		return false;
	}
	if (typeof maxLevel === 'number' && card.level > maxLevel) {
		return false;
	}
	return true;
};

const matchesTagsAll = (card: Card, tags: string[] | undefined): boolean => {
	if (!tags || tags.length === 0) return true;
	const normalizedTags = normalizeList(tags);
	const cardTags = card.tags.map((tag) => normalize(tag));
	return normalizedTags.every((tag) => cardTags.includes(tag));
};

const matchesTagsAny = (card: Card, tags: string[] | undefined): boolean => {
	if (!tags || tags.length === 0) return true;
	const normalizedTags = normalizeList(tags);
	const cardTags = card.tags.map((tag) => normalize(tag));
	return normalizedTags.some((tag) => cardTags.includes(tag));
};

const matchesTagsExclude = (card: Card, tags: string[] | undefined): boolean => {
	if (!tags || tags.length === 0) return true;
	const normalizedTags = normalizeList(tags);
	const cardTags = card.tags.map((tag) => normalize(tag));
	return normalizedTags.every((tag) => !cardTags.includes(tag));
};

const matchesRequirements = (card: Card, values: string[] | undefined): boolean => {
	if (!values || values.length === 0) return true;
	const source = normalize(card.requirements ?? '');
	if (!source) return false;
	return values.every((value) => source.includes(normalize(value)));
};

const passesFilters = (card: Card, options: CardFilterOptions): boolean => {
	if (!matchesCardKind(card, options.cardKind)) return false;
	if (!matchesType(card, options.types)) return false;
	if (!matchesName(card, options.nameIncludes)) return false;
	if (!matchesSlug(card, options.slugIncludes)) return false;
	if (!matchesLevel(card, options)) return false;
	if (!matchesTagsAll(card, options.tagsAll)) return false;
	if (!matchesTagsAny(card, options.tagsAny)) return false;
	if (!matchesTagsExclude(card, options.tagsExclude)) return false;
	if (!matchesRequirements(card, options.requirementsIncludes)) return false;
	return true;
};

export const filterCards = (cards: Card[], options: CardFilterOptions = {}): Card[] => {
	return cards.filter((card) => passesFilters(card, options));
};

export const filterAbilityCards = (
	cards: AbilityCard[],
	options: CardFilterOptions = {},
): AbilityCard[] => {
	return filterCards(cards, { ...options, cardKind: 'ability' }) as AbilityCard[];
};

export const filterItemCards = (
	cards: ItemCard[],
	options: CardFilterOptions = {},
): ItemCard[] => {
	return filterCards(cards, { ...options, cardKind: 'item' }) as ItemCard[];
};

export const sortCardsByName = <T extends Card>(cards: T[]): T[] => {
	return [...cards].sort((a, b) => a.name.localeCompare(b.name, 'es', { sensitivity: 'base' }));
};

export const sortCardsByLevelThenName = <T extends Card>(cards: T[]): T[] => {
	return [...cards].sort((a, b) => {
		if (a.level !== b.level) {
			return a.level - b.level;
		}
		return a.name.localeCompare(b.name, 'es', { sensitivity: 'base' });
	});
};
