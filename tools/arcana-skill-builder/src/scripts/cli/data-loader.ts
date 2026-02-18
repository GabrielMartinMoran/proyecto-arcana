import fs from 'fs';
import { load as yamlLoad } from 'js-yaml';
import path from 'path';
import { fileURLToPath } from 'url';
import { mapAbilityCard, mapItemCard } from '../../mappers/card-mapper.js';
import type { AbilityCard, Card, ItemCard } from '../../types/card.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const DATASET_FILES = {
	cards: 'cards.yml',
	items: 'magical-items.yml',
} as const;

const FALLBACK_DIRECTORIES = [
	process.env.ARCANA_DATASET_DIR,
	path.resolve(process.cwd(), 'references', 'datasets'),
	path.resolve(process.cwd(), 'references'),
	path.resolve(__dirname, '../../..', 'references', 'datasets'),
	path.resolve(__dirname, '../../..', 'references'),
	path.resolve(__dirname, '../../../..', 'references', 'datasets'),
	path.resolve(__dirname, '../../../..', 'references'),
	path.resolve(process.cwd(), 'static', 'docs'),
	path.resolve(process.cwd(), '../../static/docs'),
	path.resolve(__dirname, '../../../../../static/docs'),
].filter((value, index, array): value is string => {
	if (typeof value !== 'string' || value.length === 0) return false;
	return array.indexOf(value) === index;
});

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
	for (const baseDir of FALLBACK_DIRECTORIES) {
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
