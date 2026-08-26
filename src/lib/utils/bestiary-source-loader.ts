import { asset } from '$app/paths';
import { load as parseYaml } from 'js-yaml';
import { mapCreature } from '$lib/mappers/creature-mapper';
import type { Creature } from '$lib/types/creature';

const BESTIARY_DIRECTORY = '/docs/bestiary';
const MANIFEST_FILENAME = 'index.json';
const MANIFEST_URL = asset(`${BESTIARY_DIRECTORY}/${MANIFEST_FILENAME}`);

interface BestiaryManifest {
	files: string[];
}

const isBestiaryManifest = (value: unknown): value is BestiaryManifest => {
	if (typeof value !== 'object' || value === null) return false;
	const files = (value as { files?: unknown }).files;
	return Array.isArray(files) && files.every((file) => typeof file === 'string');
};

/**
 * Loads every creature listed in the bestiary manifest, in manifest order.
 *
 * A failing manifest falls back to an empty list. A failing file is logged
 * with its filename and URL and only that file is omitted.
 */
export const loadBestiaryCreatures = async (): Promise<Creature[]> => {
	const manifest = await fetchManifest();
	if (manifest === null) return [];

	const creatures: Creature[] = [];
	for (const filename of manifest.files) {
		const creature = await loadCreatureFile(filename);
		if (creature !== null) creatures.push(creature);
	}
	return creatures;
};

const fetchManifest = async (): Promise<BestiaryManifest | null> => {
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

	if (!isBestiaryManifest(parsed)) {
		logManifestError('manifest must contain a "files" string array');
		return null;
	}

	return parsed;
};

const loadCreatureFile = async (filename: string): Promise<Creature | null> => {
	const url = asset(`${BESTIARY_DIRECTORY}/${filename}`);

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

	const rawCreature = extractSingleCreature(parsed);
	if (rawCreature === null) {
		logFileError(filename, url, 'expected a "creatures" wrapper with exactly one creature');
		return null;
	}

	try {
		return mapCreature(rawCreature);
	} catch (error) {
		logFileError(filename, url, error);
		return null;
	}
};

const extractSingleCreature = (parsed: unknown): unknown => {
	if (typeof parsed !== 'object' || parsed === null) return null;
	const creatures = (parsed as { creatures?: unknown }).creatures;
	if (!Array.isArray(creatures) || creatures.length !== 1) return null;
	return creatures[0];
};

const logManifestError = (cause: unknown) => {
	console.error(`Error loading bestiary manifest ${MANIFEST_URL}:`, cause);
};

const logFileError = (filename: string, url: string, cause: unknown) => {
	console.error(`Error loading bestiary file ${filename} (${url}):`, cause);
};
