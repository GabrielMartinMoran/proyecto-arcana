import { asset } from '$app/paths';
import { load as parseYaml } from 'js-yaml';
import { BESTIARY_SOURCE_FILES } from '$lib/generated/bestiary-source-files';
import { mapCreature } from '$lib/mappers/creature-mapper';
import type { Creature } from '$lib/types/creature';

const BESTIARY_PREFIX = '/docs/bestiary/';

let bestiaryCreaturesLoad: Promise<Creature[]> | null = null;

/**
 * Loads every creature YAML registered at build time, in registry order.
 *
 * All registered files are fetched in parallel. A file that fails to fetch,
 * parse or map is logged with its path and omitted while valid files keep
 * loading (fault isolation). The load is cached at module level so the
 * creatures service and the Markdown loaders share a single acquisition for
 * the lifetime of the SPA; a rejected load frees the cache so the next call
 * retries. There is no runtime manifest fetch: the generated registry is the
 * source of truth.
 */
export const loadBestiaryCreatures = (): Promise<Creature[]> => {
	if (bestiaryCreaturesLoad === null) {
		bestiaryCreaturesLoad = loadBestiaryCreaturesFromRegistry().catch((error) => {
			bestiaryCreaturesLoad = null;
			throw error;
		});
	}
	return bestiaryCreaturesLoad;
};

const loadBestiaryCreaturesFromRegistry = async (): Promise<Creature[]> => {
	const files = BESTIARY_SOURCE_FILES.map((sourcePath) => ({
		url: asset(sourcePath),
		sourcePath,
	}));
	const creaturesPerFile = await Promise.all(
		files.map(({ sourcePath, url }) => loadCreatureFile(sourcePath, url)),
	);
	return creaturesPerFile.flat();
};

const loadCreatureFile = async (sourcePath: string, url: string): Promise<Creature[]> => {
	if (!isSafeSourcePath(sourcePath)) {
		logFileError(sourcePath, url, 'invalid filename in source registry');
		return [];
	}

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

	const rawCreature = extractSingleCreature(parsed);
	if (rawCreature === null) {
		logFileError(sourcePath, url, 'expected a "creatures" wrapper with exactly one creature');
		return [];
	}

	try {
		return [mapCreature(rawCreature)];
	} catch (error) {
		logFileError(sourcePath, url, error);
		return [];
	}
};

/** Registry entries are storage paths only: the bestiary prefix plus one safe filename segment. */
const isSafeSourcePath = (sourcePath: string): boolean =>
	sourcePath.startsWith(BESTIARY_PREFIX) &&
	isSafeFilename(sourcePath.slice(BESTIARY_PREFIX.length));

/** Registry entries are storage filenames only: no separators or traversal. */
const isSafeFilename = (filename: string): boolean =>
	filename.length > 0 &&
	filename !== '.' &&
	filename !== '..' &&
	!filename.includes('/') &&
	!filename.includes('\\');

const extractSingleCreature = (parsed: unknown): unknown => {
	if (typeof parsed !== 'object' || parsed === null) return null;
	const creatures = (parsed as { creatures?: unknown }).creatures;
	if (!Array.isArray(creatures) || creatures.length !== 1) return null;
	return creatures[0];
};

const logFileError = (sourcePath: string, url: string, cause: unknown) => {
	console.error(`Error loading bestiary file ${sourcePath} (${url}):`, cause);
};
