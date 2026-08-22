import type { Card } from '../../types/card.js';
import type { ContentIndex } from '../../types/content-index.js';
import { removeDiacritics } from '../../utils/formatting.js';
import { loadContentIndex, type CardsDataset } from './data-loader.js';
import { searchContentIndex } from './search/engine.js';
import type { SearchOptions } from './search/types.js';
import {
	filterCards,
	sortCardsByLevelThenName,
	sortCardsByName,
	type CardFilterOptions,
	type CardKind,
} from './filters.js';
import {
	formatCardDetails,
	formatListWithHeader,
	formatSearchOutput,
	type CardDetailOptions,
	type CardSummaryOptions,
} from './formatters.js';

export type ListSortMode = 'name' | 'level';

export interface ListCommandOptions {
	cardKind?: CardKind;
	types?: string[];
	tagsAll?: string[];
	tagsAny?: string[];
	tagsExclude?: string[];
	requirementsIncludes?: string[];
	nameIncludes?: string;
	slugIncludes?: string;
	level?: number;
	levels?: number[];
	minLevel?: number;
	maxLevel?: number;
	sortBy?: ListSortMode;
	title?: string;
	emptyMessage?: string;
	display?: CardSummaryOptions;
}

export interface DetailCommandOptions {
	identifier: string;
	cardKind?: CardKind;
	display?: CardDetailOptions;
}

const DEFAULT_EMPTY_MESSAGE = 'No se encontraron cartas que cumplan esos criterios.';

const normalizeArray = (values?: string[]): string[] | undefined => {
	if (!values) return undefined;
	const filtered = values.map((value) => value.trim()).filter(Boolean);
	return filtered.length > 0 ? filtered : undefined;
};

const toLevelFilter = (options: ListCommandOptions): number | number[] | undefined => {
	if (options.levels && options.levels.length > 0) {
		return options.levels.length === 1 ? options.levels[0] : options.levels;
	}
	if (typeof options.level === 'number') {
		return options.level;
	}
	return undefined;
};

const determineTitle = (options: ListCommandOptions): string => {
	if (options.title && options.title.trim().length > 0) return options.title;
	switch (options.cardKind) {
		case 'ability':
			return 'Cartas de habilidad';
		case 'item':
			return 'Objetos mágicos';
		default:
			return 'Cartas de ARCANA';
	}
};

const determineSortMode = (options: ListCommandOptions): ListSortMode => {
	if (options.sortBy) return options.sortBy;
	return options.cardKind && options.cardKind !== 'any' ? 'level' : 'name';
};

const sortCards = <T extends Card>(cards: T[], mode: ListSortMode): T[] => {
	return mode === 'level' ? sortCardsByLevelThenName(cards) : sortCardsByName(cards);
};

const buildFilterOptions = (options: ListCommandOptions): CardFilterOptions => {
	return {
		cardKind: options.cardKind,
		types: normalizeArray(options.types),
		nameIncludes: options.nameIncludes?.trim(),
		slugIncludes: options.slugIncludes?.trim(),
		level: toLevelFilter(options),
		minLevel: options.minLevel,
		maxLevel: options.maxLevel,
		tagsAll: normalizeArray(options.tagsAll),
		tagsAny: normalizeArray(options.tagsAny),
		tagsExclude: normalizeArray(options.tagsExclude),
		requirementsIncludes: normalizeArray(options.requirementsIncludes),
	};
};

const buildSummaryOptions = (
	options: ListCommandOptions,
	cardKind: CardKind | undefined,
): CardSummaryOptions => {
	const summary: CardSummaryOptions = { ...(options.display ?? {}) };
	if (summary.includeKindLabel === undefined) {
		summary.includeKindLabel = !cardKind || cardKind === 'any';
	}
	return summary;
};

export const listCards = (dataset: CardsDataset, options: ListCommandOptions = {}): string => {
	const filterOptions = buildFilterOptions(options);
	const filtered = filterCards(dataset.all, filterOptions);
	const sorted = sortCards(filtered, determineSortMode(options));

	if (sorted.length === 0) {
		return options.emptyMessage ?? DEFAULT_EMPTY_MESSAGE;
	}

	const title = determineTitle(options);
	const summaryOptions = buildSummaryOptions(options, options.cardKind);
	return formatListWithHeader(title, sorted, summaryOptions);
};

const normalizeIdentifier = (value: string): string =>
	removeDiacritics(value.trim()).toLocaleLowerCase();

const matchesIdentifier = (card: Card, target: string): boolean => {
	const normalizedTarget = normalizeIdentifier(target);
	if (!normalizedTarget) return false;

	const candidates = [
		card.id,
		card.slug ?? '',
		card.name,
		normalizeIdentifier(card.id),
		normalizeIdentifier(card.slug ?? ''),
		normalizeIdentifier(card.name),
	];

	return candidates.some((candidate) => normalizeIdentifier(candidate) === normalizedTarget);
};

const selectPoolByKind = (dataset: CardsDataset, kind?: CardKind): Card[] => {
	switch (kind) {
		case 'ability':
			return dataset.abilities;
		case 'item':
			return dataset.items;
		default:
			return dataset.all;
	}
};

export const showCardDetail = (dataset: CardsDataset, options: DetailCommandOptions): string => {
	const pool = selectPoolByKind(dataset, options.cardKind);
	const card = pool.find((candidate) => matchesIdentifier(candidate, options.identifier));

	if (!card) {
		throw new Error(`No se encontró ninguna carta con identificador "${options.identifier}".`);
	}

	return formatCardDetails(card, options.display);
};

export interface SearchCommandDeps {
	/** Injectable index loader so tests never depend on generated artifacts. */
	loadIndex?: () => ContentIndex;
}

/**
 * Global search over the generated content index. Defaults to the minimal
 * agent-facing projection; `--explain` exposes the rich ranking detail.
 */
export const runSearch = (options: SearchOptions, deps: SearchCommandDeps = {}): string => {
	const index = (deps.loadIndex ?? loadContentIndex)();
	const result = searchContentIndex(index, options);
	return formatSearchOutput(
		result,
		options.format ?? 'json',
		options.explain === true,
		options.query,
	);
};
