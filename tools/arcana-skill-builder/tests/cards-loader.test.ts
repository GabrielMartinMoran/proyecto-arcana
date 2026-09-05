import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { load as yamlLoad } from 'js-yaml';

import { buildContentIndex } from '../src/builders/content-index-builder.js';
import { loadAbilityCards, loadCardsDatasetYaml } from '../src/loaders/cards-loader.js';
import { flattenCardGroups, groupCardsByTagAndLevel } from '../src/processors/cards-processor.js';

/**
 * Fixture-driven coverage for the modular cards loader (builder side).
 *
 * The real corpus lives in `static/docs/cards/`; every test here builds an
 * isolated temp source tree so failures are deterministic and never depend on
 * the repository state.
 */

interface FixtureSource {
	docsDir: string;
	cardsDir: string;
}

const cardYaml = (name: string, tag: string): string => `
cards:
  - name: ${name}
    level: 1
    type: activable
    tags: [${tag}]
    requirements: null
    description: Descripción de ${name}.
    uses: { type: RELOAD, qty: 3 }
`;

const makeSource = async (): Promise<FixtureSource> => {
	const docsDir = await fs.mkdtemp(path.join(os.tmpdir(), 'arcana-cards-loader-'));
	const cardsDir = path.join(docsDir, 'cards');
	await fs.mkdir(cardsDir, { recursive: true });
	return { docsDir, cardsDir };
};

const writeManifest = async (source: FixtureSource, files: string[]): Promise<void> => {
	await fs.writeFile(
		path.join(source.cardsDir, 'index.json'),
		JSON.stringify({ files }, null, '\t'),
		'utf-8',
	);
};

const writeCardsFile = async (
	source: FixtureSource,
	filename: string,
	content: string,
): Promise<void> => {
	await fs.writeFile(path.join(source.cardsDir, filename), content, 'utf-8');
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

describe('modular cards loader (builder)', () => {
	test('loads valid cards in canonical manifest order, not filesystem order', async () => {
		const source = await makeSource();
		try {
			await writeManifest(source, ['z-last.yml', 'a-first.yml']);
			await writeCardsFile(source, 'z-last.yml', cardYaml('Zeta', 'Mago'));
			await writeCardsFile(source, 'a-first.yml', cardYaml('Alfa', 'Bardo'));

			const cards = loadAbilityCards({ docsDir: source.docsDir });

			assert.deepEqual(
				cards.map((card) => card.name),
				['Zeta', 'Alfa'],
				'manifest order must be preserved',
			);
			assert.match(cards[0].id, /^[0-9a-f]{40}$/, 'mapper id must be the stable sha1');
			assert.equal(cards[0].cardType, 'ability');
		} finally {
			await tearDown(source);
		}
	});

	test('omits and logs invalid files while valid files keep loading', async () => {
		const cases: Array<[string, string]> = [
			['empty.yml', ''],
			['garbage.yml', ': : :\n- not: [valid'],
			['no-wrapper.yml', 'unrelated: value\n'],
			['empty-array.yml', 'cards: []\n'],
			['noname.yml', 'cards:\n  - level: 1\n    tags: [Mago]\n'],
		];
		for (const [filename, content] of cases) {
			const source = await makeSource();
			try {
				await writeManifest(source, ['good.yml', filename]);
				await writeCardsFile(source, 'good.yml', cardYaml('Valido', 'Mago'));
				await writeCardsFile(source, filename, content);
				const { messages, log } = collectLogs();

				const cards = loadAbilityCards({ docsDir: source.docsDir, log });

				assert.deepEqual(
					cards.map((card) => card.name),
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

	test('a failing manifest yields an empty list and logs the manifest path', async () => {
		const failingManifests: Array<[string, string | null]> = [
			['missing index.json', null],
			['invalid JSON', '{ not json'],
			['shape without files array', JSON.stringify({ entries: [] })],
		];
		for (const [label, manifestContent] of failingManifests) {
			const source = await makeSource();
			try {
				await writeCardsFile(source, 'good.yml', cardYaml('Valido', 'Mago'));
				if (manifestContent !== null) {
					await fs.writeFile(path.join(source.cardsDir, 'index.json'), manifestContent, 'utf-8');
				}
				const { messages, log } = collectLogs();

				const cards = loadAbilityCards({ docsDir: source.docsDir, log });

				assert.deepEqual(cards, [], `${label} must yield an empty list`);
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
			await writeCardsFile(source, 'listed.yml', cardYaml('Listada', 'Mago'));
			await writeCardsFile(source, 'unlisted.yml', cardYaml('No Listada', 'Bardo'));

			const cards = loadAbilityCards({ docsDir: source.docsDir });

			assert.deepEqual(
				cards.map((card) => card.name),
				['Listada'],
				'unlisted files must never enter the canonical load',
			);
		} finally {
			await tearDown(source);
		}
	});

	test('keeps the logical cards.yml source label end to end', async () => {
		const source = await makeSource();
		try {
			await writeManifest(source, ['good.yml', 'broken.yml']);
			await writeCardsFile(source, 'good.yml', cardYaml('Valido', 'Mago'));
			await writeCardsFile(source, 'broken.yml', 'cards: []\n');

			const cards = loadAbilityCards({ docsDir: source.docsDir });
			const index = buildContentIndex({
				playerChapters: [],
				gmChapters: [],
				cardGroups: flattenCardGroups(groupCardsByTagAndLevel(cards)),
				itemGroups: [],
				creatureGroups: [],
				playerDir: 'manual-del-jugador',
				gmDir: 'manual-del-director',
			});

			const cardEntries = index.entries.filter((entry) => entry.kind === 'card');
			assert.equal(cardEntries.length, 1, 'only the valid card is indexed');
			assert.ok(
				cardEntries.every((entry) => entry.source === 'cards.yml'),
				'card entries must keep the logical source label',
			);
			assert.equal(cardEntries[0].canonicalName, 'Valido');
		} finally {
			await tearDown(source);
		}
	});

	test('derived dataset stays a cards wrapper, deterministic and free of invalid files', async () => {
		const source = await makeSource();
		try {
			await writeManifest(source, ['good.yml', 'empty.yml']);
			await writeCardsFile(source, 'good.yml', cardYaml('Valido', 'Mago'));
			await writeCardsFile(source, 'empty.yml', '');

			const dataset = loadCardsDatasetYaml({ docsDir: source.docsDir });
			const parsed = yamlLoad(dataset) as { cards?: unknown[] };

			assert.ok(parsed && Array.isArray(parsed.cards), 'dataset must keep the cards wrapper');
			assert.equal(parsed.cards.length, 1, 'invalid files must not leak into the dataset');
			const record = parsed.cards[0] as Record<string, unknown>;
			assert.equal(record.name, 'Valido');
			assert.equal(
				'id' in record,
				false,
				'the dataset must stay raw authored data, not mapped records',
			);
			assert.equal(
				loadCardsDatasetYaml({ docsDir: source.docsDir }),
				dataset,
				'dataset serialization must be byte-deterministic',
			);
		} finally {
			await tearDown(source);
		}
	});
});
