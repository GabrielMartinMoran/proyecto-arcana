import type { Card } from '../types/card.js';
import { slugify } from '../utils/formatting.js';

const ARQUETIPO_TAG = 'Arquetipo';

export interface CardGroup {
	tag: string;
	tagSlug: string;
	level: number;
	cards: Card[];
	filename: string;
	// When a card has "Arquetipo" as a secondary tag, it lives under arquetipos/ inside the primary tag dir
	isArquetipo: boolean;
}

export interface ItemGroup {
	level: number;
	cards: Card[];
	filename: string;
}

export const groupCardsByTagAndLevel = (cards: Card[]): Map<string, Map<number, Card[]>> => {
	const result = new Map<string, Map<number, Card[]>>();
	for (const card of cards) {
		const primaryTag = card.tags[0] ?? 'General';
		// Cards with "Arquetipo" tag get routed under their primary tag + arquetipos subdir
		const groupKey = card.tags.includes(ARQUETIPO_TAG)
			? `${primaryTag}::${ARQUETIPO_TAG}`
			: primaryTag;

		if (!result.has(groupKey)) result.set(groupKey, new Map());
		const byLevel = result.get(groupKey)!;
		if (!byLevel.has(card.level)) byLevel.set(card.level, []);
		byLevel.get(card.level)!.push(card);
	}
	return result;
};

export const flattenCardGroups = (grouped: Map<string, Map<number, Card[]>>): CardGroup[] => {
	const groups: CardGroup[] = [];
	for (const [groupKey, byLevel] of grouped) {
		const isArquetipo = groupKey.endsWith(`::${ARQUETIPO_TAG}`);
		const tag = isArquetipo ? groupKey.replace(`::${ARQUETIPO_TAG}`, '') : groupKey;
		const tagSlug = slugify(tag);
		for (const [level, cards] of [...byLevel.entries()].sort((a, b) => a[0] - b[0])) {
			groups.push({ tag, tagSlug, level, cards, filename: `nivel-${level}.yml`, isArquetipo });
		}
	}
	return groups;
};

export const groupItemsByLevel = (cards: Card[]): ItemGroup[] => {
	const byLevel = new Map<number, Card[]>();
	for (const card of cards) {
		if (!byLevel.has(card.level)) byLevel.set(card.level, []);
		byLevel.get(card.level)!.push(card);
	}
	return [...byLevel.entries()]
		.sort((a, b) => a[0] - b[0])
		.map(([level, cards]) => ({ level, cards, filename: `nivel-${level}.yml` }));
};
