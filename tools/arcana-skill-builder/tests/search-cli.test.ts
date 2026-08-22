import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import {
	isCardsCliCommand,
	parseSearchCommandArgs,
	printCliUsage,
	runCardsCliCommand,
} from '../src/scripts/cli/index.js';
import { runSearch } from '../src/scripts/cli/commands.js';
import {
	loadContentIndexFile,
	loadContentIndex,
	type ContentIndexFile,
} from '../src/scripts/cli/data-loader.js';
import { buildContentEntryHash, type ContentIndexEntry } from '../src/types/content-index.js';

const makeEntry = (overrides: Partial<ContentIndexEntry>): ContentIndexEntry => {
	const entry = {
		kind: 'card' as const,
		canonicalName: 'X',
		slug: 'x',
		aliases: ['x'],
		tags: [] as string[],
		path: 'references/x.md',
		source: 'cards.yml',
		...overrides,
	};
	const { hash: _hash, ...payload } = entry;
	return { ...entry, hash: buildContentEntryHash(payload) };
};

const fixtureIndex = (): ContentIndexEntry[] => [
	makeEntry({
		kind: 'card',
		canonicalName: 'Pacto Supremo',
		slug: 'pacto-supremo',
		aliases: ['pacto supremo'],
		tags: ['Arcanista', 'Arquetipo', 'Brujo'],
		level: 1,
		path: 'references/cartas-de-habilidades/arquetipos/brujo/arquetipo-nivel-1.yml',
		source: 'cards.yml',
	}),
	makeEntry({
		kind: 'creature',
		canonicalName: 'Cíclope',
		slug: 'ciclope',
		aliases: ['ciclope'],
		tags: [],
		level: 4,
		heading: 'Cíclope',
		anchor: 'cíclope',
		path: 'references/bestiario/rango-4.md',
		source: 'bestiary.yml',
	}),
];

describe('search CLI argument parsing', () => {
	test('parses all supported search flags', () => {
		const { options } = parseSearchCommandArgs([
			'--query',
			'Pacto Supremo',
			'--kind',
			'card',
			'--source',
			'cards.yml',
			'--level',
			'1',
			'--min-level',
			'1',
			'--max-level',
			'2',
			'--tier',
			'4',
			'--tag',
			'Brujo',
			'--type',
			'Utilidad',
			'--lineage',
			'No Muerto',
			'--limit',
			'5',
			'--format',
			'json',
			'--explain',
		]);
		assert.equal(options.query, 'Pacto Supremo');
		assert.equal(options.kind, 'card');
		assert.equal(options.source, 'cards.yml');
		assert.equal(options.level, 1);
		assert.equal(options.minLevel, 1);
		assert.equal(options.maxLevel, 2);
		assert.equal(options.tier, 4);
		assert.deepEqual(options.tagsAll, ['Brujo']);
		assert.deepEqual(options.types, ['Utilidad']);
		assert.equal(options.lineage, 'No Muerto');
		assert.equal(options.limit, 5);
		assert.equal(options.format, 'json');
		assert.equal(options.explain, true);
	});

	test('repeated --level flags accumulate into a multi-level filter', () => {
		const { options } = parseSearchCommandArgs([
			'--query',
			'Bardo',
			'--level',
			'2',
			'--level',
			'3',
		]);
		assert.deepEqual(options.level, [2, 3]);
	});

	test('a single --level keeps its scalar shape for backward compatibility', () => {
		const { options } = parseSearchCommandArgs(['Bardo', '--level', '2']);
		assert.equal(options.level, 2);
	});

	test('invalid --level values fail deterministically with a clear message', () => {
		assert.throws(
			() => parseSearchCommandArgs(['--query', 'x', '--level', 'abc']),
			/no es un número válido/,
		);
		assert.throws(() => parseSearchCommandArgs(['--query', 'x', '--level']), /requiere un valor/);
	});

	test('accepts a positional query when --query is absent', () => {
		const { options } = parseSearchCommandArgs(['Liche', '--format', 'text']);
		assert.equal(options.query, 'Liche');
		assert.equal(options.format, 'text');
	});

	test('rejects an unknown option and a missing value', () => {
		assert.throws(() => parseSearchCommandArgs(['--query', 'x', '--bogus', '1']));
		assert.throws(() => parseSearchCommandArgs(['--query']));
		assert.throws(() => parseSearchCommandArgs(['--format', 'xml']));
		assert.throws(() => parseSearchCommandArgs(['--limit', 'abc']));
	});

	test('search is a recognized command alongside list and detail', () => {
		assert.equal(isCardsCliCommand('search'), true);
		assert.equal(isCardsCliCommand('list'), true);
		assert.equal(isCardsCliCommand('detail'), true);
		assert.equal(isCardsCliCommand('help'), false);
	});

	test('usage text documents search without removing list/detail', () => {
		let output = '';
		const originalWrite = process.stdout.write;
		process.stdout.write = ((chunk: string | Uint8Array) => {
			output += String(chunk);
			return true;
		}) as typeof process.stdout.write;
		try {
			printCliUsage();
		} finally {
			process.stdout.write = originalWrite;
		}
		assert.match(output, /search/);
		assert.match(output, /list/);
		assert.match(output, /detail/);
		assert.match(output, /--query/);
	});
});

describe('search command execution', () => {
	test('runSearch emits minimal agent-facing JSON by default', () => {
		const json = runSearch(
			{ query: 'Cíclope', format: 'json' },
			{ loadIndex: () => ({ schemaVersion: 3, entries: fixtureIndex() }) },
		);
		const output = JSON.parse(json);
		assert.equal(output.status, 'found');
		assert.equal(output.results[0].name, 'Cíclope');
		assert.equal(output.results[0].source, 'references/bestiario/rango-4.md#cíclope');
		assert.deepEqual(Object.keys(output).sort(), ['nextAction', 'results', 'status']);
	});

	test('runSearch JSON with --explain includes score/match fields and echoes the query', () => {
		const json = runSearch(
			{ query: 'Cíclope', format: 'json', explain: true },
			{ loadIndex: () => ({ schemaVersion: 3, entries: fixtureIndex() }) },
		);
		const parsed = JSON.parse(json);
		assert.equal(parsed.query, 'Cíclope');
		assert.ok(typeof parsed.results[0].score === 'number');
		assert.equal(parsed.results[0].matchType, 'exact');
		assert.ok(Array.isArray(parsed.results[0].matchedFields));
	});

	test('runSearch text format renders ranked lines and a next action', () => {
		const text = runSearch(
			{ query: 'Cíclope', format: 'text' },
			{ loadIndex: () => ({ schemaVersion: 3, entries: fixtureIndex() }) },
		);
		assert.match(text, /Cíclope/);
		assert.match(text, /rango-4\.md#cíclope/);
		assert.match(text, /nextAction|próxima|Próxima|siguiente/i);
	});

	test('runSearch returns an invalid_query state with no crash', () => {
		const json = runSearch(
			{ query: '', format: 'json' },
			{ loadIndex: () => ({ schemaVersion: 3, entries: fixtureIndex() }) },
		);
		const parsed = JSON.parse(json);
		assert.equal(parsed.status, 'invalid_query');
	});

	test('runSearch --type filters v3 structured.type and falls back to tags for legacy entries', () => {
		const loadIndex = () => ({
			schemaVersion: 3,
			entries: [
				makeEntry({
					canonicalName: 'Afinidad Arcana',
					slug: 'afinidad-arcana',
					tags: ['Arcanista'],
					structured: { cardType: 'ability', type: 'efecto' },
				}),
				makeEntry({
					canonicalName: 'Amuleto de Protección',
					slug: 'amuleto-de-proteccion',
					tags: ['Utilidad'],
				}),
			],
		});

		const byStructuredType = JSON.parse(
			runSearch({ query: 'Afinidad', types: ['efecto'], format: 'json' }, { loadIndex }),
		);
		assert.deepEqual(
			byStructuredType.results.map((r: { name: string }) => r.name),
			['Afinidad Arcana'],
		);

		const byLegacyTag = JSON.parse(
			runSearch({ query: 'Amuleto', types: ['Utilidad'], format: 'json' }, { loadIndex }),
		);
		assert.deepEqual(
			byLegacyTag.results.map((r: { name: string }) => r.name),
			['Amuleto de Protección'],
		);
	});

	test('runSearch --lineage filters v3 structured.lineage', () => {
		const loadIndex = () => ({
			schemaVersion: 3,
			entries: [
				makeEntry({
					kind: 'creature',
					canonicalName: 'Cíclope',
					slug: 'ciclope',
					tags: [],
					structured: { lineage: 'Gigante' },
				}),
			],
		});

		const byLineage = JSON.parse(
			runSearch({ query: 'Cíclope', lineage: 'Gigante', format: 'json' }, { loadIndex }),
		);
		assert.deepEqual(
			byLineage.results.map((r: { name: string }) => r.name),
			['Cíclope'],
		);

		const mismatched = JSON.parse(
			runSearch({ query: 'Cíclope', lineage: 'Dragón', format: 'json' }, { loadIndex }),
		);
		assert.equal(mismatched.status, 'not_found');
	});

	test('T7 intention is exposed only behind --explain; plain output stays minimal', () => {
		const plain = runSearch(
			{ query: 'Cíclope', format: 'json' },
			{ loadIndex: () => ({ schemaVersion: 3, entries: fixtureIndex() }) },
		);
		const plainParsed = JSON.parse(plain);
		assert.ok(!('intention' in plainParsed), 'top-level output must not expose intention');
		assert.ok(!('intention' in plainParsed.results[0]), 'results must not expose intention');

		const explained = runSearch(
			{ query: 'Cíclope', format: 'json', explain: true },
			{ loadIndex: () => ({ schemaVersion: 3, entries: fixtureIndex() }) },
		);
		const explainedParsed = JSON.parse(explained);
		assert.equal(explainedParsed.results[0].intention, 'exact_entity');
	});
});

describe('content index loader', () => {
	test('loads a valid content-index.json via ARCANA_INDEX_PATH', async () => {
		const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'arcana-cli-'));
		const indexPath = path.join(tmpDir, 'content-index.json');
		const entries = fixtureIndex();
		fs.writeFileSync(indexPath, JSON.stringify({ schemaVersion: 3, entries }, null, 2), 'utf-8');
		try {
			const loaded: ContentIndexFile = loadContentIndexFile(indexPath);
			assert.equal(loaded.index.schemaVersion, 3);
			assert.equal(loaded.index.entries.length, 2);
		} finally {
			fs.rmSync(tmpDir, { recursive: true, force: true });
		}
	});

	test('loadContentIndex resolves an absolute path without env', () => {
		const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'arcana-cli-'));
		const indexPath = path.join(tmpDir, 'content-index.json');
		fs.writeFileSync(
			indexPath,
			JSON.stringify({ schemaVersion: 3, entries: fixtureIndex() }),
			'utf-8',
		);
		try {
			const previous = process.env.ARCANA_INDEX_PATH;
			process.env.ARCANA_INDEX_PATH = indexPath;
			try {
				const index = loadContentIndex();
				assert.equal(index.entries.length, 2);
			} finally {
				if (previous === undefined) delete process.env.ARCANA_INDEX_PATH;
				else process.env.ARCANA_INDEX_PATH = previous;
			}
		} finally {
			fs.rmSync(tmpDir, { recursive: true, force: true });
		}
	});

	test('loadContentIndexFile throws when the index file does not exist', () => {
		assert.throws(() => {
			loadContentIndexFile('/nonexistent/content-index.json');
		});
	});
});

describe('list/detail compatibility is preserved', () => {
	const captureOutput = async (command: string, args: string[]): Promise<string> => {
		let output = '';
		const originalWrite = process.stdout.write;
		process.stdout.write = ((chunk: string | Uint8Array) => {
			output += String(chunk);
			return true;
		}) as typeof process.stdout.write;
		try {
			await runCardsCliCommand(command, args);
		} finally {
			process.stdout.write = originalWrite;
		}
		return output;
	};

	test('list still runs, reads the real dataset and reports cards', async () => {
		const output = await captureOutput('list', ['--kind', 'ability', '--name', 'pacto']);
		assert.match(output, /Pacto Supremo/);
	});

	test('detail still runs and renders the requested card', async () => {
		const output = await captureOutput('detail', ['--no-tags', '--', 'Pacto Supremo']);
		assert.match(output, /Pacto Supremo/);
	});

	test('search --help prints the search usage without erroring', async () => {
		const output = await captureOutput('search', ['--help']);
		assert.match(output, /search/);
		assert.match(output, /--query/);
	});
});
