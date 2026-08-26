import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { load as yamlLoad } from 'js-yaml';

import { buildContentIndex } from '../src/builders/content-index-builder.js';
import { loadBestiaryCreatures, loadBestiaryDatasetYaml } from '../src/loaders/bestiary-loader.js';
import { groupCreaturesByTier } from '../src/processors/bestiary-processor.js';

/**
 * Fixture-driven coverage for the modular bestiary loader (builder side).
 *
 * The real corpus lives in `static/docs/bestiary/`; every test here builds an
 * isolated temp source tree so failures are deterministic and never depend on
 * the repository state.
 */

interface FixtureSource {
	docsDir: string;
	bestiaryDir: string;
}

const creatureYaml = (name: string, tier: number): string => `
creatures:
  - name: ${name}
    lineage: Criatura de Prueba
    tier: ${tier}
    attributes: { body: 1, reflexes: 1, mind: 1, instinct: 1, presence: 1 }
    stats:
      maxHealth: 10
      evasion: { value: 5, note: null }
      physicalMitigation: { value: 0, note: null }
      magicalMitigation: { value: 0, note: null }
      speed: { value: 6, note: null }
    languages: []
    attacks: []
    traits: []
    actions: []
    reactions: []
    interactions: []
    behavior: null
    img: null
`;

const makeSource = async (): Promise<FixtureSource> => {
	const docsDir = await fs.mkdtemp(path.join(os.tmpdir(), 'arcana-bestiary-loader-'));
	const bestiaryDir = path.join(docsDir, 'bestiary');
	await fs.mkdir(bestiaryDir, { recursive: true });
	return { docsDir, bestiaryDir };
};

const writeManifest = async (source: FixtureSource, files: string[]): Promise<void> => {
	await fs.writeFile(
		path.join(source.bestiaryDir, 'index.json'),
		JSON.stringify({ files }, null, '\t'),
		'utf-8',
	);
};

const writeCreatureFile = async (
	source: FixtureSource,
	filename: string,
	content: string,
): Promise<void> => {
	await fs.writeFile(path.join(source.bestiaryDir, filename), content, 'utf-8');
};

const collectLogs = (): { messages: string[]; log: (message: string) => void } => {
	const messages: string[] = [];
	return {
		messages,
		log: (message: string) => {
			messages.push(message);
		},
	};
};

const tearDown = async (source: FixtureSource): Promise<void> => {
	await fs.rm(source.docsDir, { recursive: true, force: true });
};

describe('modular bestiary loader (builder)', () => {
	test('loads valid creatures in canonical manifest order, not filesystem order', async () => {
		const source = await makeSource();
		try {
			// Deliberately non-alphabetical: the manifest is the only ordering contract.
			await writeManifest(source, ['z-last.yml', 'a-first.yml']);
			await writeCreatureFile(source, 'z-last.yml', creatureYaml('Zeta', 2));
			await writeCreatureFile(source, 'a-first.yml', creatureYaml('Alfa', 1));

			const creatures = loadBestiaryCreatures({ docsDir: source.docsDir });

			assert.deepEqual(
				creatures.map((creature) => creature.name),
				['Zeta', 'Alfa'],
				'manifest order must be preserved',
			);
			assert.equal(creatures[0].tier, 2);
			assert.equal(creatures[1].tier, 1);
			assert.match(creatures[0].id, /^[0-9a-f]{40}$/, 'mapper id must be the stable sha1');
			assert.equal(
				creatures[0].id,
				loadBestiaryCreatures({ docsDir: source.docsDir })[0].id,
				'ids must be deterministic across loads',
			);
		} finally {
			await tearDown(source);
		}
	});

	test('omits and logs an empty file while valid files keep loading', async () => {
		const source = await makeSource();
		try {
			await writeManifest(source, ['good.yml', 'empty.yml', 'also-good.yml']);
			await writeCreatureFile(source, 'good.yml', creatureYaml('Bueno', 1));
			await writeCreatureFile(source, 'empty.yml', '');
			await writeCreatureFile(source, 'also-good.yml', creatureYaml('Tambien Bueno', 2));
			const { messages, log } = collectLogs();

			const creatures = loadBestiaryCreatures({ docsDir: source.docsDir, log });

			assert.deepEqual(
				creatures.map((creature) => creature.name),
				['Bueno', 'Tambien Bueno'],
				'valid files must survive an empty file',
			);
			assert.ok(
				messages.some((message) => message.includes('empty.yml')),
				`empty file must be logged with its filename, got: ${messages.join(' | ')}`,
			);
		} finally {
			await tearDown(source);
		}
	});

	test('detects invalid wrappers, logs the filename and omits the file', async () => {
		const invalidWrappers: Array<[string, string]> = [
			['no-wrapper.yml', 'unrelated: value\n'],
			['not-an-array.yml', 'creatures: { name: No Array }\n'],
			['empty-array.yml', 'creatures: []\n'],
			['multi-entry.yml', 'creatures:\n  - name: Uno\n  - name: Dos\n'],
		];
		for (const [filename, content] of invalidWrappers) {
			const source = await makeSource();
			try {
				await writeManifest(source, ['good.yml', filename]);
				await writeCreatureFile(source, 'good.yml', creatureYaml('Valido', 1));
				await writeCreatureFile(source, filename, content);
				const { messages, log } = collectLogs();

				const creatures = loadBestiaryCreatures({ docsDir: source.docsDir, log });

				assert.deepEqual(
					creatures.map((creature) => creature.name),
					['Valido'],
					`${filename} must be omitted`,
				);
				assert.ok(
					messages.some((message) => message.includes(filename)),
					`${filename} must be logged with its filename, got: ${messages.join(' | ')}`,
				);
			} finally {
				await tearDown(source);
			}
		}
	});

	test('logs and omits unparseable YAML and manifest-listed files missing on disk', async () => {
		const source = await makeSource();
		try {
			await writeManifest(source, ['good.yml', 'garbage.yml', 'ghost.yml']);
			await writeCreatureFile(source, 'good.yml', creatureYaml('Valido', 1));
			await writeCreatureFile(source, 'garbage.yml', ': : :\n- not: [valid');
			const { messages, log } = collectLogs();

			const creatures = loadBestiaryCreatures({ docsDir: source.docsDir, log });

			assert.deepEqual(
				creatures.map((creature) => creature.name),
				['Valido'],
				'unparseable and missing files must be omitted',
			);
			assert.ok(
				messages.some((message) => message.includes('garbage.yml')),
				`unparseable file must be logged, got: ${messages.join(' | ')}`,
			);
			assert.ok(
				messages.some((message) => message.includes('ghost.yml')),
				`missing file must be logged, got: ${messages.join(' | ')}`,
			);
		} finally {
			await tearDown(source);
		}
	});

	test('isolates mapper failures: a creature without a name is logged and omitted', async () => {
		const source = await makeSource();
		try {
			await writeManifest(source, ['good.yml', 'noname.yml']);
			await writeCreatureFile(source, 'good.yml', creatureYaml('Valido', 1));
			await writeCreatureFile(
				source,
				'noname.yml',
				`creatures:
  - lineage: Sin Nombre
    tier: 1
`,
			);
			const { messages, log } = collectLogs();

			const creatures = loadBestiaryCreatures({ docsDir: source.docsDir, log });

			assert.deepEqual(
				creatures.map((creature) => creature.name),
				['Valido'],
				'mapping failure must not abort the rest',
			);
			assert.ok(
				messages.some((message) => message.includes('noname.yml')),
				`mapper failure must be logged with its filename, got: ${messages.join(' | ')}`,
			);
		} finally {
			await tearDown(source);
		}
	});

	test('a failing manifest yields an empty list and logs the manifest path', async () => {
		const failingManifests: Array<[string, string | null]> = [
			['missing index.json', null],
			['invalid JSON', '{ not json'],
			['shape without files array', JSON.stringify({ entries: [] })],
		];
		for (const [label, manifestContent] of failingManifests) {
			const source = await makeSource();
			try {
				await writeCreatureFile(source, 'good.yml', creatureYaml('Valido', 1));
				if (manifestContent !== null) {
					await fs.writeFile(path.join(source.bestiaryDir, 'index.json'), manifestContent, 'utf-8');
				}
				const { messages, log } = collectLogs();

				const creatures = loadBestiaryCreatures({ docsDir: source.docsDir, log });

				assert.deepEqual(creatures, [], `${label} must yield an empty list`);
				assert.ok(
					messages.some((message) => message.includes('index.json')),
					`${label} must log the manifest path, got: ${messages.join(' | ')}`,
				);
			} finally {
				await tearDown(source);
			}
		}
	});

	test('ignores files not listed in the manifest (canonical source of truth)', async () => {
		const source = await makeSource();
		try {
			await writeManifest(source, ['listed.yml']);
			await writeCreatureFile(source, 'listed.yml', creatureYaml('Listada', 1));
			await writeCreatureFile(source, 'unlisted.yml', creatureYaml('No Listada', 2));

			const creatures = loadBestiaryCreatures({ docsDir: source.docsDir });

			assert.deepEqual(
				creatures.map((creature) => creature.name),
				['Listada'],
				'unlisted files must never enter the canonical load',
			);
		} finally {
			await tearDown(source);
		}
	});

	test('keeps the logical bestiary.yml source label end to end', async () => {
		const source = await makeSource();
		try {
			await writeManifest(source, ['good.yml', 'broken.yml']);
			await writeCreatureFile(source, 'good.yml', creatureYaml('Valido', 3));
			await writeCreatureFile(source, 'broken.yml', 'creatures: []\n');

			const creatures = loadBestiaryCreatures({ docsDir: source.docsDir });
			const index = buildContentIndex({
				playerChapters: [],
				gmChapters: [],
				cardGroups: [],
				itemGroups: [],
				creatureGroups: groupCreaturesByTier(creatures),
				playerDir: 'manual-del-jugador',
				gmDir: 'manual-del-director',
			});

			const creatureEntries = index.entries.filter((entry) => entry.kind === 'creature');
			assert.equal(creatureEntries.length, 1, 'only the valid creature is indexed');
			assert.ok(
				creatureEntries.every((entry) => entry.source === 'bestiary.yml'),
				'creature entries must keep the logical source label',
			);
			assert.equal(creatureEntries[0].canonicalName, 'Valido');
		} finally {
			await tearDown(source);
		}
	});

	test('derived dataset stays a creatures wrapper, deterministic and free of invalid files', async () => {
		const source = await makeSource();
		try {
			await writeManifest(source, ['good.yml', 'empty.yml']);
			await writeCreatureFile(source, 'good.yml', creatureYaml('Valido', 1));
			await writeCreatureFile(source, 'empty.yml', '');

			const dataset = loadBestiaryDatasetYaml({ docsDir: source.docsDir });
			const parsed = yamlLoad(dataset) as { creatures?: unknown[] };

			assert.ok(
				parsed && Array.isArray(parsed.creatures),
				'dataset must keep the creatures wrapper',
			);
			assert.equal(parsed.creatures.length, 1, 'invalid files must not leak into the dataset');
			const record = parsed.creatures[0] as Record<string, unknown>;
			assert.equal(record.name, 'Valido');
			assert.equal(
				'id' in record,
				false,
				'the dataset must stay raw authored data, not mapped records',
			);
			assert.equal(
				loadBestiaryDatasetYaml({ docsDir: source.docsDir }),
				dataset,
				'dataset serialization must be byte-deterministic',
			);
		} finally {
			await tearDown(source);
		}
	});
});
