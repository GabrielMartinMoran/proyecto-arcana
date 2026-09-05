import { asset } from '$app/paths';
import { load as parseYaml } from 'js-yaml';
import { mapAbilityCard } from '$lib/mappers/card-mapper';
import type { AbilityCard } from '$lib/types/cards/ability-card';

const CARDS_DIRECTORY = '/docs/cards';
const MANIFEST_FILENAME = 'index.json';
const MANIFEST_URL = asset(`${CARDS_DIRECTORY}/${MANIFEST_FILENAME}`);

interface CardsManifest {
	files: string[];
}

const isCardsManifest = (value: unknown): value is CardsManifest => {
	if (typeof value !== 'object' || value === null) return false;
	const files = (value as { files?: unknown }).files;
	return Array.isArray(files) && files.every((file) => typeof file === 'string');
};

const isSafeFilename = (filename: string): boolean =>
	filename.length > 0 &&
	filename !== '.' &&
	filename !== '..' &&
	!filename.includes('/') &&
	!filename.includes('\\');

/**
 * Loads every ability card listed in the modular cards manifest, in manifest
 * order.
 *
 * A failing manifest falls back to an empty list. A failing file is logged
 * with its filename and URL and only that file is omitted while valid files
 * keep loading. No sorting or caching happens here: consumers own those
 * concerns.
 */
export const loadAbilityCards = async (): Promise<AbilityCard[]> => {
	const manifest = await fetchManifest();
	if (manifest === null) return [];

	const cards: AbilityCard[] = [];
	for (const filename of manifest.files) {
		if (!isSafeFilename(filename)) {
			logFileError(filename, `${CARDS_DIRECTORY}/${filename}`, 'invalid filename in manifest');
			continue;
		}
		const fileCards = await loadCardsFile(filename);
		if (fileCards !== null) cards.push(...fileCards);
	}
	return cards;
};

const fetchManifest = async (): Promise<CardsManifest | null> => {
	let response: Response;
	try {
		response = await fetch(MANIFEST_URL);
	} catch (error) {
		logManifestError(error);
		return null;
	}

	if (!response.ok) {
		logManifestError(`fetch failed with status ${response.status}`);
		return null;
	}

	let parsed: unknown;
	try {
		parsed = await response.json();
	} catch (error) {
		logManifestError(error);
		return null;
	}

	if (!isCardsManifest(parsed)) {
		logManifestError('manifest must contain a "files" string array');
		return null;
	}

	return parsed;
};

const loadCardsFile = async (filename: string): Promise<AbilityCard[] | null> => {
	const url = asset(`${CARDS_DIRECTORY}/${filename}`);

	let response: Response;
	try {
		response = await fetch(url);
	} catch (error) {
		logFileError(filename, url, error);
		return null;
	}

	if (!response.ok) {
		logFileError(filename, url, `fetch failed with status ${response.status}`);
		return null;
	}

	const content = await response.text();
	if (content.trim() === '') {
		logFileError(filename, url, 'file is empty');
		return null;
	}

	let parsed: unknown;
	try {
		parsed = parseYaml(content);
	} catch (error) {
		logFileError(filename, url, error);
		return null;
	}

	const rawCards = extractCards(parsed);
	if (rawCards === null) {
		logFileError(filename, url, 'expected a non-empty "cards" array');
		return null;
	}

	try {
		return rawCards.map((rawCard) => mapAbilityCard(rawCard));
	} catch (error) {
		logFileError(filename, url, error);
		return null;
	}
};

const extractCards = (parsed: unknown): unknown[] | null => {
	if (typeof parsed !== 'object' || parsed === null) return null;
	const cards = (parsed as { cards?: unknown }).cards;
	if (!Array.isArray(cards) || cards.length === 0) return null;
	return cards;
};

const logManifestError = (cause: unknown) => {
	console.error(`Error loading cards manifest ${MANIFEST_URL}:`, cause);
};

const logFileError = (filename: string, url: string, cause: unknown) => {
	console.error(`Error loading cards file ${filename} (${url}):`, cause);
};
