/**
 * Contract tests for the generated YAML source-file registries.
 *
 * These tests deliberately re-implement the directory/manifest enumeration
 * here, without importing anything from scripts/generate-source-file-lists.mjs,
 * so a bug in the generator cannot make the test pass by sharing its own
 * enumeration: the generated module must agree with an independent reading
 * of the filesystem and of each manifest.
 *
 * For every corpus the test verifies:
 * - every YAML on disk appears exactly once in the registry
 * - every registered path exists on disk, is a .yml and is unique
 * - registry order equals the canonical manifest order
 * - the manifest is in sync with the corpus directory
 */

import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { BESTIARY_SOURCE_FILES } from '../generated/bestiary-source-files';
import { CARD_SOURCE_FILES } from '../generated/card-source-files';

// Vitest runs with the Vite root at the repository root, so the static corpus
// lives at process.cwd()/static (the same layout served in dev and build).
const STATIC_ROOT = path.join(process.cwd(), 'static');

interface Corpus {
	name: string;
	directory: string;
	assetPrefix: string;
	registry: readonly string[];
}

const CORPORA: Corpus[] = [
	{
		name: 'cards',
		directory: path.join(STATIC_ROOT, 'docs', 'cards'),
		assetPrefix: '/docs/cards',
		registry: CARD_SOURCE_FILES,
	},
	{
		name: 'bestiary',
		directory: path.join(STATIC_ROOT, 'docs', 'bestiary'),
		assetPrefix: '/docs/bestiary',
		registry: BESTIARY_SOURCE_FILES,
	},
];

const listYamlFilenames = async (directory: string): Promise<string[]> => {
	const entries = await readdir(directory, { withFileTypes: true });
	return entries
		.filter((entry) => entry.isFile() && entry.name.endsWith('.yml'))
		.map((entry) => entry.name);
};

const readManifestFilenames = async (directory: string): Promise<string[]> => {
	const raw = await readFile(path.join(directory, 'index.json'), 'utf8');
	const parsed: unknown = JSON.parse(raw);
	const files = (parsed as { files?: unknown }).files;
	if (!Array.isArray(files) || !files.every((file) => typeof file === 'string')) {
		throw new Error(
			`manifest ${path.join(directory, 'index.json')} must contain a "files" string array`,
		);
	}
	return files;
};

const assetPathToFilename = (assetPath: string, assetPrefix: string): string =>
	assetPath.slice(assetPrefix.length + 1);

describe('generated YAML source-file registries', () => {
	for (const corpus of CORPORA) {
		describe(`corpus: ${corpus.name}`, () => {
			it(`should register every YAML found in ${corpus.name} exactly once`, async () => {
				const diskFilenames = await listYamlFilenames(corpus.directory);

				const registryFilenames = corpus.registry.map((entry) =>
					assetPathToFilename(entry, corpus.assetPrefix),
				);

				expect(new Set(registryFilenames).size).toBe(registryFilenames.length);
				expect(registryFilenames.length).toBe(diskFilenames.length);
				expect(new Set(registryFilenames)).toEqual(new Set(diskFilenames));
			});

			it(`should expose only .yml assets as /docs/... paths in ${corpus.name}`, () => {
				for (const entry of corpus.registry) {
					expect(entry.startsWith(`${corpus.assetPrefix}/`)).toBe(true);
					expect(entry.endsWith('.yml')).toBe(true);
				}
			});

			it(`should keep the canonical manifest order in ${corpus.name}`, async () => {
				const manifestFilenames = await readManifestFilenames(corpus.directory);

				const expected = manifestFilenames.map((filename) => `${corpus.assetPrefix}/${filename}`);
				expect(corpus.registry).toEqual(expected);
			});

			it(`should contain no stale path in ${corpus.name}`, async () => {
				const diskFilenames = await listYamlFilenames(corpus.directory);
				const diskSet = new Set(diskFilenames);

				const registryFilenames = corpus.registry.map((entry) =>
					assetPathToFilename(entry, corpus.assetPrefix),
				);
				const stale = registryFilenames.filter((filename) => !diskSet.has(filename));

				expect(stale).toEqual([]);
			});

			it(`should not omit any YAML newly added to ${corpus.name}`, async () => {
				const diskFilenames = await listYamlFilenames(corpus.directory);

				const registryFilenames = corpus.registry.map((entry) =>
					assetPathToFilename(entry, corpus.assetPrefix),
				);
				const unregistered = diskFilenames.filter(
					(filename) => !registryFilenames.includes(filename),
				);

				expect(unregistered).toEqual([]);
			});

			it(`should keep the ${corpus.name} manifest in sync with the corpus directory`, async () => {
				const diskFilenames = await listYamlFilenames(corpus.directory);
				const manifestFilenames = await readManifestFilenames(corpus.directory);

				expect(new Set(manifestFilenames)).toEqual(new Set(diskFilenames));
			});

			it(`should not contain any duplicate entry in ${corpus.name}`, () => {
				const unique = new Set(corpus.registry);
				expect(unique.size).toBe(corpus.registry.length);
			});
		});
	}
});
