import fs from 'fs';
import { load as yamlLoad } from 'js-yaml';
import path from 'path';
import { fileURLToPath } from 'url';
import { mapAbilityCard, mapItemCard } from '../../mappers/card-mapper.js';
import type { AbilityCard, Card, ItemCard } from '../../types/card.js';
import { CONTENT_INDEX_SCHEMA_VERSION, type ContentIndex } from '../../types/content-index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const DATASET_FILES = {
	cards: 'cards.yml',
	items: 'magical-items.yml',
} as const;

const DATASET_FALLBACK_DIRECTORIES = [
	path.resolve(process.cwd(), 'references', 'datasets'),
	path.resolve(process.cwd(), 'references'),
	path.resolve(__dirname, '../../..', 'references', 'datasets'),
	path.resolve(__dirname, '../../..', 'references'),
	path.resolve(__dirname, '../../../..', 'references', 'datasets'),
	path.resolve(__dirname, '../../../..', 'references'),
];

const datasetFallbackDirectories = (): string[] =>
	[process.env.ARCANA_DATASET_DIR, ...DATASET_FALLBACK_DIRECTORIES].filter(
		(value, index, array): value is string => {
			if (typeof value !== 'string' || value.length === 0) return false;
			return array.indexOf(value) === index;
		},
	);

type RawYaml = Record<string, unknown>;

interface LoadedYaml {
	data: RawYaml;
	sourcePath: string;
}

const ensureArray = (value: unknown, fileLabel: string): unknown[] => {
	if (value === undefined) return [];
	if (!Array.isArray(value)) {
		const valueType = typeof value;
		throw new Error(
			`Expected an array in ${fileLabel}, but received ${valueType === 'object' ? 'object' : valueType}`,
		);
	}
	return value;
};

const resolveDatasetFile = (fileName: string): string => {
	for (const baseDir of datasetFallbackDirectories()) {
		const candidate = path.join(baseDir, fileName);
		if (fs.existsSync(candidate)) {
			return candidate;
		}
	}
	throw new Error(
		`Unable to locate dataset file "${fileName}". Provide ARCANA_DATASET_DIR or run from the skill package root.`,
	);
};

const loadYaml = (fileName: string): LoadedYaml => {
	const sourcePath = resolveDatasetFile(fileName);
	const raw = fs.readFileSync(sourcePath, 'utf-8');
	const data = yamlLoad(raw);
	if (data == null || typeof data !== 'object' || Array.isArray(data)) {
		throw new Error(`Unexpected root structure in ${sourcePath}`);
	}
	return { data: data as RawYaml, sourcePath };
};

export const loadAbilityCards = (): AbilityCard[] => {
	const { data, sourcePath } = loadYaml(DATASET_FILES.cards);
	const rawCards = ensureArray(data.cards, sourcePath);
	return rawCards.map((entry, index) => {
		try {
			return mapAbilityCard(entry);
		} catch (err) {
			throw new Error(
				`Failed to map ability card at index ${index} from ${sourcePath}: ${(err as Error).message}`,
			);
		}
	});
};

export const loadMagicalItems = (): ItemCard[] => {
	const { data, sourcePath } = loadYaml(DATASET_FILES.items);
	const rawItems = ensureArray(data.items, sourcePath);
	return rawItems.map((entry, index) => {
		try {
			return mapItemCard(entry);
		} catch (err) {
			throw new Error(
				`Failed to map magical item at index ${index} from ${sourcePath}: ${(err as Error).message}`,
			);
		}
	});
};

export interface CardsDataset {
	abilities: AbilityCard[];
	items: ItemCard[];
	all: Card[];
}

export const loadCardsDataset = (): CardsDataset => {
	const abilities = loadAbilityCards();
	const items = loadMagicalItems();
	return {
		abilities,
		items,
		all: [...abilities, ...items],
	};
};

const INDEX_FILE_NAME = 'content-index.json';

/**
 * Candidate locations for the generated `content-index.json`, covering the run
 * from the source tree, from the bundled CLI, and from a repo/package root.
 */
const INDEX_BASE_DIRECTORIES: string[] = [
	path.resolve(process.cwd(), 'out', 'arcana-reference'),
	path.resolve(process.cwd(), 'out', 'arcana-system'),
	// Bundled CLI at <out>/<family>/scripts/arcana-content-searcher/dist/index.js
	path.resolve(__dirname, '..', '..', '..'),
	path.resolve(__dirname, '..', '..', '..', '..', 'arcana-reference'),
	path.resolve(__dirname, '..', '..', '..', '..', 'arcana-system'),
	// Source/tsx runtime at <builder>/src/scripts/cli
	path.resolve(__dirname, '..', '..', 'out', 'arcana-reference'),
	path.resolve(__dirname, '..', '..', 'out', 'arcana-system'),
	path.resolve(process.cwd()),
].filter((value, index, array) => array.indexOf(value) === index);

export const resolveContentIndexFile = (): string => {
	const candidates: string[] = [];
	const explicit = process.env.ARCANA_INDEX_PATH;
	if (explicit) {
		const isFile = fs.existsSync(explicit) && fs.statSync(explicit).isFile();
		candidates.push(isFile ? explicit : path.join(explicit, INDEX_FILE_NAME));
	}
	candidates.push(path.join(process.cwd(), INDEX_FILE_NAME));
	for (const dir of INDEX_BASE_DIRECTORIES) {
		candidates.push(path.join(dir, INDEX_FILE_NAME));
	}

	const seen = new Set<string>();
	for (const candidate of candidates) {
		if (seen.has(candidate)) continue;
		seen.add(candidate);
		if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
			return candidate;
		}
	}
	throw new Error(
		'No se encontró content-index.json. Proporcione ARCANA_INDEX_PATH o ejecute desde la raíz del paquete/skill generado.',
	);
};

const parseContentIndex = (text: string, sourcePath: string): ContentIndex => {
	let parsed: unknown;
	try {
		parsed = JSON.parse(text);
	} catch {
		throw new Error(`El índice ${sourcePath} no es JSON válido.`);
	}
	if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
		throw new Error(`Estructura raíz inesperada en ${sourcePath}.`);
	}
	const index = parsed as Partial<ContentIndex>;
	if (index.schemaVersion !== CONTENT_INDEX_SCHEMA_VERSION) {
		throw new Error(
			`El índice ${sourcePath} usa schemaVersion ${String(
				index.schemaVersion,
			)}; se esperaba ${CONTENT_INDEX_SCHEMA_VERSION}.`,
		);
	}
	if (!Array.isArray(index.entries)) {
		throw new Error(`El índice ${sourcePath} no contiene un array "entries".`);
	}
	return index as ContentIndex;
};

export interface ContentIndexFile {
	index: ContentIndex;
	resolvedPath: string;
}

export const loadContentIndexFile = (indexPath: string): ContentIndexFile => {
	let text: string;
	try {
		text = fs.readFileSync(indexPath, 'utf-8');
	} catch (error) {
		throw new Error(`No se pudo leer el índice ${indexPath}: ${(error as Error).message}`);
	}
	return { index: parseContentIndex(text, indexPath), resolvedPath: indexPath };
};

export const loadContentIndex = (): ContentIndex =>
	loadContentIndexFile(resolveContentIndexFile()).index;
