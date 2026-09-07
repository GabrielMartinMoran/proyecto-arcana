import { asset } from '$app/paths';
import { load as parseYaml } from 'js-yaml';
import { CARD_SOURCE_FILES } from '$lib/generated/card-source-files';
import { mapAbilityCard } from '$lib/mappers/card-mapper';
import type { AbilityCard } from '$lib/types/cards/ability-card';

let abilityCardsLoad: Promise<AbilityCard[]> | null = null;

/**
 * Loads every ability card YAML registered at build time, in registry order.
 *
 * All registered files are fetched in parallel. A file that fails to fetch,
 * parse or map is logged and omitted while valid files keep loading (fault
 * isolation). The load is cached at module level so the cards service and the
 * Markdown loaders share a single acquisition for the lifetime of the SPA; a
 * rejected load frees the cache so the next call retries. There is no runtime
 * manifest fetch: the registry itself is the source of truth.
 */
export const loadAbilityCards = (): Promise<AbilityCard[]> => {
	if (abilityCardsLoad === null) {
		abilityCardsLoad = loadAbilityCardsFromRegistry().catch((error) => {
			abilityCardsLoad = null;
			throw error;
		});
	}
	return abilityCardsLoad;
};

const loadAbilityCardsFromRegistry = async (): Promise<AbilityCard[]> => {
	const files = CARD_SOURCE_FILES.map((sourcePath) => ({
		url: asset(sourcePath),
		sourcePath,
	}));
	const cardsPerFile = await Promise.all(
		files.map(({ sourcePath, url }) => loadCardsFile(sourcePath, url)),
	);
	return cardsPerFile.flat();
};

const loadCardsFile = async (sourcePath: string, url: string): Promise<AbilityCard[]> => {
	let response: Response;
	try {
		response = await fetch(url);
	} catch (error) {
		logFileError(sourcePath, url, error);
		return [];
	}

	if (!response.ok) {
		logFileError(sourcePath, url, `fetch failed with status ${response.status}`);
		return [];
	}

	const content = await response.text();
	if (content.trim() === '') {
		logFileError(sourcePath, url, 'file is empty');
		return [];
	}

	let parsed: unknown;
	try {
		parsed = parseYaml(content);
	} catch (error) {
		logFileError(sourcePath, url, error);
		return [];
	}

	const rawCards = extractCards(parsed);
	if (rawCards === null) {
		logFileError(sourcePath, url, 'expected a non-empty "cards" array');
		return [];
	}

	try {
		return rawCards.map((rawCard) => mapAbilityCard(rawCard));
	} catch (error) {
		logFileError(sourcePath, url, error);
		return [];
	}
};

const extractCards = (parsed: unknown): unknown[] | null => {
	if (typeof parsed !== 'object' || parsed === null) return null;
	const cards = (parsed as { cards?: unknown }).cards;
	if (!Array.isArray(cards) || cards.length === 0) return null;
	return cards;
};

const logFileError = (sourcePath: string, url: string, cause: unknown) => {
	console.error(`Error loading cards file ${sourcePath} (${url}):`, cause);
};
