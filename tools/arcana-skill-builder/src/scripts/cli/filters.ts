import type { AbilityCard, Card, ItemCard } from '../../types/card.js';
import type { ContentIndexEntry, ContentKind } from '../../types/content-index.js';
import { fold } from './search/normalize.js';

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

export const filterItemCards = (cards: ItemCard[], options: CardFilterOptions = {}): ItemCard[] => {
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

/**
 * Structured filters for global index searches. These are applied BEFORE any
 * scoring: an entry whose kind/source/level/type/lineage/tag does not match
 * never appears in the ranking, regardless of how similar its text is to the
 * query.
 */

export type SearchFilterKind = ContentKind | 'any';

export interface IndexEntryFilterOptions {
	kind?: SearchFilterKind;
	source?: string;
	level?: number | number[];
	minLevel?: number;
	maxLevel?: number;
	tier?: number;
	tagsAll?: string[];
	/**
	 * Best-effort ANY filter over `structured.type` when the entry defines it,
	 * otherwise over legacy entry tags (schema v3).
	 */
	types?: string[];
	/**
	 * Best-effort filter over `structured.lineage` when the entry defines it,
	 * otherwise over legacy entry tags (schema v3).
	 */
	lineage?: string;
}

const foldList = (values: string[] | undefined): string[] =>
	values?.map((value) => fold(value)).filter(Boolean) ?? [];

const hasText = (value: string | undefined): value is string =>
	value !== undefined && value.trim().length > 0;

/**
 * Best-effort ANY filter for `types`/`lineage`. When the entry defines the v3
 * structured field it is the sole source for that entry: a non-matching
 * structured value never falls back to tags. Legacy entries without the field
 * keep the historical best-effort ANY semantics over their tags.
 */
export const matchesStructuredOrTags = (
	entry: ContentIndexEntry,
	wanted: string[] | undefined,
	structuredValue: string | undefined,
): boolean => {
	if (!wanted || wanted.length === 0) return true;
	const foldedWanted = foldList(wanted);
	if (hasText(structuredValue)) {
		return foldedWanted.includes(fold(structuredValue));
	}
	const entryTags = entry.tags.map((tag) => fold(tag));
	return foldedWanted.some((value) => entryTags.includes(value));
};

const matchesKind = (entry: ContentIndexEntry, kind: SearchFilterKind | undefined): boolean =>
	!kind || kind === 'any' || entry.kind === kind;

const matchesSource = (entry: ContentIndexEntry, source: string | undefined): boolean => {
	if (!source) return true;
	const target = fold(source);
	return target.length > 0 && fold(entry.source) === target;
};

const matchesLevelRange = (entry: ContentIndexEntry, options: IndexEntryFilterOptions): boolean => {
	const { level, minLevel, maxLevel, tier } = options;
	if (Array.isArray(level) && level.length > 0) {
		return typeof entry.level === 'number' && level.includes(entry.level);
	}
	if (typeof level === 'number' && entry.level !== level) return false;
	if (typeof tier === 'number' && !(entry.kind === 'creature' && entry.level === tier)) {
		return false;
	}
	if (typeof minLevel === 'number' && typeof entry.level !== 'number') return false;
	if (typeof maxLevel === 'number' && typeof entry.level !== 'number') return false;
	if (typeof minLevel === 'number' && entry.level! < minLevel) return false;
	if (typeof maxLevel === 'number' && entry.level! > maxLevel) return false;
	return true;
};

const matchesAllTags = (entry: ContentIndexEntry, wanted: string[] | undefined): boolean => {
	if (!wanted || wanted.length === 0) return true;
	const entryTags = entry.tags.map((tag) => fold(tag));
	const folded = foldList(wanted);
	return folded.every((value) => entryTags.includes(value));
};

const passesIndexFilters = (
	entry: ContentIndexEntry,
	options: IndexEntryFilterOptions,
): boolean => {
	if (!matchesKind(entry, options.kind)) return false;
	if (!matchesSource(entry, options.source)) return false;
	if (!matchesLevelRange(entry, options)) return false;
	if (!matchesAllTags(entry, options.tagsAll)) return false;
	if (!matchesStructuredOrTags(entry, options.types, entry.structured?.type)) return false;
	if (
		!matchesStructuredOrTags(
			entry,
			options.lineage ? [options.lineage] : undefined,
			entry.structured?.lineage,
		)
	) {
		return false;
	}
	return true;
};

export const filterContentIndexEntries = (
	entries: ContentIndexEntry[],
	options: IndexEntryFilterOptions = {},
): ContentIndexEntry[] => entries.filter((entry) => passesIndexFilters(entry, options));
