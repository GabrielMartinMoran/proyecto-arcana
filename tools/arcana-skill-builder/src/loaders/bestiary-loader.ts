import fs from 'fs';
import path from 'path';
import { dump as yamlDump, load as yamlLoad } from 'js-yaml';
import { CONFIG } from '../config.js';
import { mapCreature } from '../mappers/creature-mapper.js';
import type { Creature } from '../types/creature.js';

/**
 * Modular bestiary source loader (builder side).
 *
 * The canonical bestiary source is one YAML per creature under
 * `static/docs/bestiary/`, with `index.json` preserving the canonical order.
 * Every file listed in the manifest is loaded in manifest order; an invalid
 * file (empty, unparseable, bad wrapper, unmappable) is logged with its
 * filename and omitted while valid files keep loading. The logical
 * `bestiary.yml` label and the derived dataset name are preserved by the
 * consumers, not by this loader.
 */

export interface BestiarySourceOptions {
	/** Root docs directory containing the modular `bestiary/` source. */
	docsDir?: string;
	/** Per-file error logger; defaults to console.error. */
	log?: (message: string) => void;
}

interface BestiaryManifest {
	files: string[];
}

interface BestiaryEntry {
	filename: string;
	rawCreature: unknown;
	creature: Creature;
}

const defaultLog = (message: string): void => console.error(message);

const errorMessage = (cause: unknown): string =>
	cause instanceof Error ? cause.message : String(cause);

const isBestiaryManifest = (value: unknown): value is BestiaryManifest => {
	if (typeof value !== 'object' || value === null) return false;
	const files = (value as { files?: unknown }).files;
	return Array.isArray(files) && files.every((file) => typeof file === 'string');
};

/** Manifest entries are storage filenames only: no separators or traversal. */
const isSafeFilename = (filename: string): boolean =>
	filename.length > 0 &&
	filename !== '.' &&
	filename !== '..' &&
	!filename.includes('/') &&
	!filename.includes('\\');

const bestiaryDirOf = (docsDir: string): string => path.join(docsDir, CONFIG.BESTIARY_SOURCE_DIR);

const manifestPathOf = (docsDir: string): string =>
	path.join(bestiaryDirOf(docsDir), CONFIG.BESTIARY_MANIFEST_FILE);

const creatureFilePath = (docsDir: string, filename: string): string =>
	path.join(bestiaryDirOf(docsDir), filename);

const loadManifest = (docsDir: string, log: (message: string) => void): BestiaryManifest | null => {
	const manifestPath = manifestPathOf(docsDir);
	let text: string;
	try {
		text = fs.readFileSync(manifestPath, 'utf-8');
	} catch (error) {
		log(`Error loading bestiary manifest ${manifestPath}: ${errorMessage(error)}`);
		return null;
	}

	let parsed: unknown;
	try {
		parsed = JSON.parse(text);
	} catch (error) {
		log(`Error loading bestiary manifest ${manifestPath}: ${errorMessage(error)}`);
		return null;
	}

	if (!isBestiaryManifest(parsed)) {
		log(
			`Error loading bestiary manifest ${manifestPath}: manifest must contain a "files" string array`,
		);
		return null;
	}
	return parsed;
};

/** Validates the `creatures` wrapper and returns the single creature record. */
const extractSingleCreature = (parsed: unknown): unknown => {
	if (typeof parsed !== 'object' || parsed === null) return null;
	const creatures = (parsed as { creatures?: unknown }).creatures;
	if (!Array.isArray(creatures) || creatures.length !== 1) return null;
	return creatures[0];
};

const loadBestiaryEntries = (options: BestiarySourceOptions = {}): BestiaryEntry[] => {
	const docsDir = options.docsDir ?? CONFIG.DOCS_PATH;
	const log = options.log ?? defaultLog;

	const manifest = loadManifest(docsDir, log);
	if (manifest === null) return [];

	const entries: BestiaryEntry[] = [];
	for (const filename of manifest.files) {
		if (!isSafeFilename(filename)) {
			log(
				`Error loading bestiary file ${filename} (${creatureFilePath(docsDir, filename)}): invalid filename in manifest`,
			);
			continue;
		}
		const fullPath = creatureFilePath(docsDir, filename);

		let content: string;
		try {
			content = fs.readFileSync(fullPath, 'utf-8');
		} catch (error) {
			log(`Error loading bestiary file ${filename} (${fullPath}): ${errorMessage(error)}`);
			continue;
		}
		if (content.trim() === '') {
			log(`Error loading bestiary file ${filename} (${fullPath}): file is empty`);
			continue;
		}

		let parsed: unknown;
		try {
			parsed = yamlLoad(content);
		} catch (error) {
			log(`Error loading bestiary file ${filename} (${fullPath}): ${errorMessage(error)}`);
			continue;
		}

		const rawCreature = extractSingleCreature(parsed);
		if (rawCreature === null) {
			log(
				`Error loading bestiary file ${filename} (${fullPath}): expected a "creatures" wrapper with exactly one creature`,
			);
			continue;
		}

		let creature: Creature;
		try {
			creature = mapCreature(rawCreature);
		} catch (error) {
			log(`Error loading bestiary file ${filename} (${fullPath}): ${errorMessage(error)}`);
			continue;
		}

		entries.push({ filename, rawCreature, creature });
	}
	return entries;
};

/** Mapped creatures in canonical manifest order; invalid files are omitted. */
export const loadBestiaryCreatures = (options?: BestiarySourceOptions): Creature[] =>
	loadBestiaryEntries(options).map((entry) => entry.creature);

/**
 * Deterministic derived dataset under the logical `bestiary.yml` name: the raw
 * authored records (no mapper-invented fields) wrapped in `creatures`, in
 * canonical manifest order.
 */
export const loadBestiaryDatasetYaml = (options?: BestiarySourceOptions): string =>
	yamlDump(
		{ creatures: loadBestiaryEntries(options).map((entry) => entry.rawCreature) },
		{ noRefs: true },
	);
