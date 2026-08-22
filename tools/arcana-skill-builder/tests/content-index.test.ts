import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
	buildCardEntry,
	buildChapterEntry,
	buildContentIndex,
	buildCreatureEntry,
	cardGroupRelPath,
	deriveSafeAliases,
	scanForSecretLeaks,
	validateContentIndex,
} from '../src/builders/content-index-builder.js';
import type { CardGroup } from '../src/processors/cards-processor.js';
import type { Chapter } from '../src/processors/manual-processor.js';
import type { Card } from '../src/types/card.js';
import {
	buildContentEntryHash,
	canonicalSerialize,
	CONTENT_INDEX_SCHEMA_VERSION,
	CONTENT_KINDS,
	sortContentIndexEntries,
} from '../src/types/content-index.js';
import type { Creature } from '../src/types/creature.js';

const makeCard = (overrides: Partial<Card> = {}): Card => ({
	id: 'id-ventaja',
	name: 'Ventaja',
	slug: 'ventaja',
	level: 1,
	tags: ['General'],
	requirements: null,
	description: 'Descripción de Ventaja.',
	uses: { qty: null, type: 'RELOAD' },
	type: 'efecto',
	cardType: 'ability',
	...overrides,
});

const makeCreature = (overrides: Partial<Creature> = {}): Creature => ({
	id: 'id-liche',
	name: 'Liche',
	lineage: 'No Muerto',
	tier: 4,
	attributes: { body: 4, reflexes: 3, mind: 5, instinct: 3, presence: 4 },
	stats: {
		maxHealth: 40,
		evasion: { value: 10, note: null },
		physicalMitigation: { value: 6, note: null },
		magicalMitigation: { value: 10, note: null },
		speed: { value: 6, note: null },
	},
	languages: [],
	attacks: [],
	traits: [],
	actions: [],
	reactions: [],
	interactions: [],
	behavior: null,
	img: null,
	...overrides,
});

const makeCardGroup = (overrides: Partial<CardGroup> = {}): CardGroup => ({
	tag: 'Bardo',
	tagSlug: 'bardo',
	level: 2,
	cards: [makeCard({ name: 'Canción de Poder', level: 2 })],
	filename: 'nivel-2.yml',
	isArquetipo: false,
	...overrides,
});

const makeChapter = (overrides: Partial<Chapter> = {}): Chapter => ({
	index: 2,
	title: '2. Creación de Personajes',
	slug: '02-creacion-de-personajes',
	content: '# 2. Creación de Personajes\n\nContenido.',
	filename: '02-creacion-de-personajes.md',
	...overrides,
});

const entry = (_overrides: Partial<ReturnType<typeof buildCardEntry>> = {}) =>
	buildCardEntry(makeCard(), 'references/cartas-de-habilidades/general/nivel-1.yml', 'cards.yml');

test('buildCardEntry exposes the contract fields with a deterministic hash', () => {
	const record = entry();
	assert.equal(record.kind, 'card');
	assert.equal(record.canonicalName, 'Ventaja');
	assert.equal(record.slug, 'ventaja');
	assert.equal(record.id, 'id-ventaja');
	assert.equal(record.level, 1);
	assert.equal(record.path, 'references/cartas-de-habilidades/general/nivel-1.yml');
	assert.equal(record.source, 'cards.yml');
	assert.match(record.hash, /^[0-9a-f]{40}$/);

	// Hash is the sha1 of the canonical payload (excludes the hash field itself).
	const { hash, ...payload } = record;
	assert.equal(hash, buildContentEntryHash(payload));
});

test('deriveSafeAliases returns safe, deterministic, diacritics-free variants', () => {
	assert.deepEqual(deriveSafeAliases('Pacto Supremo'), ['pacto supremo']);
	assert.deepEqual(deriveSafeAliases('Filosofía de Diseño'), ['filosofia de diseno']);
	assert.deepEqual(deriveSafeAliases('Liche'), ['liche']);
	assert.deepEqual(deriveSafeAliases('   '), []);
	assert.deepEqual(deriveSafeAliases(''), []);
});

test('canonicalSerialize is independent of object key order', () => {
	const left = canonicalSerialize({ b: 1, a: { d: 2, c: [3, 4] } });
	const right = canonicalSerialize({ a: { c: [3, 4], d: 2 }, b: 1 });
	assert.equal(left, right);
});

test('content hash is stable for identical payloads and changes when content changes', () => {
	const base = {
		kind: 'card' as const,
		canonicalName: 'Ventaja',
		slug: 'ventaja',
		aliases: ['ventaja'],
		tags: ['General'],
		path: 'references/cartas-de-habilidades/general/nivel-1.yml',
		source: 'cards.yml',
	};
	assert.equal(buildContentEntryHash(base), buildContentEntryHash({ ...base }));
	assert.notEqual(
		buildContentEntryHash(base),
		buildContentEntryHash({ ...base, canonicalName: 'Ventaja Robusta' }),
	);
});

test('sortContentIndexEntries orders by kind, then canonical name, deterministically', () => {
	const ch = buildChapterEntry(makeChapter(), 'manual-del-jugador', 'player.md');
	const card = buildCardEntry(makeCard(), 'x.yml', 'cards.yml');
	const creature = buildCreatureEntry(makeCreature(), 'bestiario.md', 'bestiary.yml');
	const sorted = sortContentIndexEntries([creature, card, ch]);
	assert.deepEqual(
		sorted.map((e) => e.kind),
		['card', 'chapter', 'creature'],
	);
	// Sorting the same input twice yields the same order.
	assert.deepEqual(
		sorted.map((e) => e.slug),
		sortContentIndexEntries([creature, card, ch]).map((e) => e.slug),
	);
});

test('cardGroupRelPath mirrors the arquetipo output convention', () => {
	const plain = makeCardGroup({ tag: 'Bardo', tagSlug: 'bardo', isArquetipo: false });
	assert.equal(
		cardGroupRelPath(plain, new Set()),
		'references/cartas-de-habilidades/bardo/nivel-2.yml',
	);

	const arquetipo = makeCardGroup({
		tag: 'Bardo',
		tagSlug: 'bardo',
		isArquetipo: true,
		filename: 'nivel-2.yml',
	});
	// An arquetipo group's own tagSlug is always part of the family set in the
	// real pipeline, so it is routed under arquetipos/.
	assert.equal(
		cardGroupRelPath(arquetipo, new Set(['bardo'])),
		'references/cartas-de-habilidades/arquetipos/bardo/arquetipo-nivel-2.yml',
	);
	// A non-arquetipo group whose tagSlug matches an arquetipo family is also
	// routed under arquetipos/ (mirrors the resource builder convention).
	const shared = makeCardGroup({ tag: 'Bardo', tagSlug: 'bardo', isArquetipo: false });
	assert.equal(
		cardGroupRelPath(shared, new Set(['bardo'])),
		'references/cartas-de-habilidades/arquetipos/bardo/nivel-2.yml',
	);
});

test('buildContentIndex produces expected counts and kinds without inventing entries', () => {
	const playerChapters = [
		makeChapter({ slug: '01-filosofia-de-diseno', filename: '01-filosofia-de-diseno.md' }),
		makeChapter({
			title: '2. Creación de Personajes',
			slug: '02-creacion-de-personajes',
			filename: '02-creacion-de-personajes.md',
			content: '# 2. Creación de Personajes\n\n## Ventaja\n\nContenido.',
		}),
	];
	const index = buildContentIndex({
		playerChapters,
		gmChapters: [makeChapter({ title: 'Guía del Director' })],
		cardGroups: [makeCardGroup({ cards: [makeCard()] })],
		itemGroups: [
			{
				level: 3,
				cards: [makeCard({ name: 'Amuleto de Protección', level: 3 })],
				filename: 'nivel-3.yml',
			},
		],
		creatureGroups: [{ tier: 4, creatures: [makeCreature()], filename: 'rango-4.md' }],
		playerDir: 'manual-del-jugador',
		gmDir: 'manual-del-director',
	});

	assert.equal(index.schemaVersion, CONTENT_INDEX_SCHEMA_VERSION);
	// 2 player + 1 gm + 1 section + 1 card + 1 item + 1 creature = 7 entries
	assert.equal(index.entries.length, 7);
	const kinds = new Set(index.entries.map((e) => e.kind));
	for (const kind of CONTENT_KINDS) assert.ok(kinds.has(kind));

	// Every entry carries a hash and a non-empty path.
	for (const record of index.entries) {
		assert.match(record.hash, /^[0-9a-f]{40}$/);
		assert.ok(record.path.length > 0);
	}
});

test('validateContentIndex flags structural, slug, path and hash issues', async () => {
	const good = entry();
	const ok = await validateContentIndex({
		schemaVersion: CONTENT_INDEX_SCHEMA_VERSION,
		entries: [good],
	});
	assert.deepEqual(ok, []);

	const badSlug = { ...good, slug: 'Pacto Supremo' };
	const badPath = { ...good, slug: 'otra', path: '../outside.md' };
	const badHash = {
		...good,
		slug: 'tercera',
		path: 'references/cartas-de-habilidades/general/otro-nivel.yml',
		hash: '0000000000000000000000000000000000000000',
	};
	const issues = await validateContentIndex({
		schemaVersion: CONTENT_INDEX_SCHEMA_VERSION,
		entries: [badSlug, badPath, good, badHash],
	});

	assert.ok(issues.some((issue) => issue.includes('invalid slug')));
	assert.ok(issues.some((issue) => issue.includes('invalid path')));
	assert.ok(issues.some((issue) => issue.includes('hash does not match')));
	// Good entry (index 2) is clean and produces no issue.
	assert.ok(!issues.some((issue) => issue.includes('entries[2]')));
});

test('validateContentIndex detects duplicates and missing referenced paths', async () => {
	const duplicate = entry();
	const issues = await validateContentIndex(
		{
			schemaVersion: CONTENT_INDEX_SCHEMA_VERSION,
			entries: [duplicate, { ...entry(), id: 'other' }],
		},
		{ pathExists: () => false },
	);
	assert.ok(issues.some((issue) => issue.includes('duplicate kind:slug')));
	assert.ok(issues.some((issue) => issue.includes('referenced path does not exist')));
});

test('validateContentIndex accepts when all referenced paths exist', async () => {
	const issues = await validateContentIndex(
		{
			schemaVersion: CONTENT_INDEX_SCHEMA_VERSION,
			entries: [entry()],
		},
		{ pathExists: (p) => p.endsWith('nivel-1.yml') },
	);
	assert.deepEqual(issues, []);
});

test('scanForSecretLeaks flags secret material in output but not clean serialization', () => {
	assert.ok(scanForSecretLeaks('const key = "sk-proj-1234567890abcdefghij";').length > 0);
	assert.ok(
		scanForSecretLeaks('OPENAI_API_KEY=sk-1234567890abcdefghij1234567890abcdefghij').length > 0,
	);
	assert.deepEqual(scanForSecretLeaks(canonicalSerialize(entry())), []);
});
