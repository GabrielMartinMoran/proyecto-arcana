import fs from 'fs';
import path from 'path';
import { dump as yamlDump, load as yamlLoad } from 'js-yaml';
import { CONFIG } from '../config.js';
import { mapAbilityCard } from '../mappers/card-mapper.js';
import type { AbilityCard } from '../types/card.js';

/**
 * Modular ability-card source loader (builder side).
 *
 * The canonical ability-card source is one YAML per first tag under
 * `static/docs/cards/`, with `index.json` preserving the canonical order.
 * Every file listed in the manifest is loaded in manifest order; an invalid
 * file (empty, unparseable, bad wrapper, unmappable) is logged with its
 * filename and omitted while valid files keep loading. The logical `cards.yml`
 * label and the derived dataset name are preserved by the consumers, not by
 * this loader.
 */

export interface CardSourceOptions {
	/** Root docs directory containing the modular `cards/` source. */
	docsDir?: string;
	/** Per-file error logger; defaults to console.error. */
	log?: (message: string) => void;
}

interface CardsManifest {
	files: string[];
}

interface CardEntry {
	filename: string;
	rawCards: unknown[];
	cards: AbilityCard[];
}

const defaultLog = (message: string): void => console.error(message);

const errorMessage = (cause: unknown): string =>
	cause instanceof Error ? cause.message : String(cause);

const isCardsManifest = (value: unknown): value is CardsManifest => {
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

const cardsDirOf = (docsDir: string): string => path.join(docsDir, CONFIG.CARDS_SOURCE_DIR);

const manifestPathOf = (docsDir: string): string =>
	path.join(cardsDirOf(docsDir), CONFIG.CARDS_MANIFEST_FILE);

const cardFilePath = (docsDir: string, filename: string): string =>
	path.join(cardsDirOf(docsDir), filename);

const loadManifest = (docsDir: string, log: (message: string) => void): CardsManifest | null => {
	const manifestPath = manifestPathOf(docsDir);
	let text: string;
	try {
		text = fs.readFileSync(manifestPath, 'utf-8');
	} catch (error) {
		log(`Error loading cards manifest ${manifestPath}: ${errorMessage(error)}`);
		return null;
	}

	let parsed: unknown;
	try {
		parsed = JSON.parse(text);
	} catch (error) {
		log(`Error loading cards manifest ${manifestPath}: ${errorMessage(error)}`);
		return null;
	}

	if (!isCardsManifest(parsed)) {
		log(
			`Error loading cards manifest ${manifestPath}: manifest must contain a "files" string array`,
		);
		return null;
	}
	return parsed;
};

/** Validates the `cards` wrapper and returns the raw records. */
const extractCards = (parsed: unknown): unknown[] | null => {
	if (typeof parsed !== 'object' || parsed === null) return null;
	const cards = (parsed as { cards?: unknown }).cards;
	if (!Array.isArray(cards) || cards.length === 0) return null;
	return cards;
};

const loadCardEntries = (options: CardSourceOptions = {}): CardEntry[] => {
	const docsDir = options.docsDir ?? CONFIG.DOCS_PATH;
	const log = options.log ?? defaultLog;

	const manifest = loadManifest(docsDir, log);
	if (manifest === null) return [];

	const entries: CardEntry[] = [];
	for (const filename of manifest.files) {
		if (!isSafeFilename(filename)) {
			log(
				`Error loading cards file ${filename} (${cardFilePath(docsDir, filename)}): invalid filename in manifest`,
			);
			continue;
		}
		const fullPath = cardFilePath(docsDir, filename);

		let content: string;
		try {
			content = fs.readFileSync(fullPath, 'utf-8');
		} catch (error) {
			log(`Error loading cards file ${filename} (${fullPath}): ${errorMessage(error)}`);
			continue;
		}
		if (content.trim() === '') {
			log(`Error loading cards file ${filename} (${fullPath}): file is empty`);
			continue;
		}

		let parsed: unknown;
		try {
			parsed = yamlLoad(content);
		} catch (error) {
			log(`Error loading cards file ${filename} (${fullPath}): ${errorMessage(error)}`);
			continue;
		}

		const rawCards = extractCards(parsed);
		if (rawCards === null) {
			log(`Error loading cards file ${filename} (${fullPath}): expected a non-empty "cards" array`);
			continue;
		}

		let cards: AbilityCard[];
		try {
			cards = rawCards.map((rawCard) => mapAbilityCard(rawCard));
		} catch (error) {
			log(`Error loading cards file ${filename} (${fullPath}): ${errorMessage(error)}`);
			continue;
		}

		entries.push({ filename, rawCards, cards });
	}
	return entries;
};

/** Mapped ability cards in canonical manifest order; invalid files are omitted. */
export const loadAbilityCards = (options?: CardSourceOptions): AbilityCard[] =>
	loadCardEntries(options).flatMap((entry) => entry.cards);

/**
 * Deterministic derived dataset under the logical `cards.yml` name: the raw
 * authored records (no mapper-invented fields) wrapped in `cards`, in
 * canonical manifest order.
 */
export const loadCardsDatasetYaml = (options?: CardSourceOptions): string =>
	yamlDump(
		{ cards: loadCardEntries(options).flatMap((entry) => entry.rawCards) },
		{ noRefs: true },
	);
