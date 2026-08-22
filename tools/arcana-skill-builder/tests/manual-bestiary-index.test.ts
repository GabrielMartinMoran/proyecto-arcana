import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { load as yamlLoad } from 'js-yaml';

import {
	buildChapterEntry,
	buildContentIndex,
	buildCreatureEntry,
	buildSectionEntry,
	validateContentIndex,
} from '../src/builders/content-index-builder.js';
import { deriveCreatureAnchors } from '../src/processors/bestiary-processor.js';
import { deriveChapterHeadings } from '../src/processors/manual-processor.js';
import { groupCreaturesByTier } from '../src/processors/bestiary-processor.js';
import { splitGMManual, splitPlayerManual } from '../src/processors/manual-processor.js';
import {
	flattenCardGroups,
	groupCardsByTagAndLevel,
	groupItemsByLevel,
} from '../src/processors/cards-processor.js';
import { mapAbilityCard, mapItemCard } from '../src/mappers/card-mapper.js';
import { mapCreature } from '../src/mappers/creature-mapper.js';
import { gfmHeadingAnchor, HeadingIds, headingTextOf } from '../src/utils/anchors.js';
import type { Chapter } from '../src/processors/manual-processor.js';
import type { Card } from '../src/types/card.js';
import { serializeContentIndex, CONTENT_INDEX_SCHEMA_VERSION } from '../src/types/content-index.js';
import type { Creature } from '../src/types/creature.js';

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

const makeChapter = (overrides: Partial<Chapter> = {}): Chapter => ({
	index: 2,
	title: '2. Creación de Personajes',
	slug: '02-creacion-de-personajes',
	content: '# 2. Creación de Personajes\n\nContenido.',
	filename: '02-creacion-de-personajes.md',
	...overrides,
});

const makeSectionChapter = (): Chapter =>
	makeChapter({
		content: `# 2. Creación de Personajes

## Paso 1: Atributos

## Ventaja

## Ventaja

### ¿Qué es Ventaja?

#### **A. Efectos Leves (Coste: 0)**

##### Demasiado profundo para el índice

## Paso 2: Habilidades
`,
	});

describe('gfm heading anchor rule (parity with marked-gfm-heading-id + github-slugger)', () => {
	test('gfmHeadingAnchor reproduces the app ids verified against the real renderer', () => {
		const cases: Array<[string, string]> = [
			['1. Filosofía de Diseño', '1-filosofía-de-diseño'],
			['2.1 Atributos', '21-atributos'],
			['Ventaja', 'ventaja'],
			['¿Qué es Ventaja?', 'qué-es-ventaja'],
			['Ampersand & compañía', 'ampersand--compañía'],
			['Bestiario — Rango 4', 'bestiario--rango-4'],
			['Ayuda, Ventaja y Desventaja', 'ayuda-ventaja-y-desventaja'],
			['2. Somático (El Gesto Arcano)', '2-somático-el-gesto-arcano'],
			[
				'Paso 4: Construir el Encuentro - Compra de Enemigos',
				'paso-4-construir-el-encuentro---compra-de-enemigos',
			],
			['A. Efectos Leves (Coste: 0)', 'a-efectos-leves-coste-0'],
		];
		for (const [heading, expected] of cases) {
			assert.equal(gfmHeadingAnchor(heading), expected, `heading: ${heading}`);
		}
	});

	test('headingTextOf strips inline markdown exactly like the rendered raw text', () => {
		assert.equal(headingTextOf('**A. Efectos Leves (Coste: 0)**'), 'A. Efectos Leves (Coste: 0)');
		assert.equal(headingTextOf('**Bold** y *italica* mixto'), 'Bold y italica mixto');
		assert.equal(headingTextOf('Nombre `con código`'), 'Nombre con código');
		assert.equal(headingTextOf('Link [texto](https://x) final'), 'Link texto final');
		assert.equal(headingTextOf('  **Espaciado**  '), 'Espaciado');
	});

	test('HeadingIds suffixes repeated anchors per document like the app slugger', () => {
		const ids = new HeadingIds();
		assert.equal(ids.anchor('Ventaja'), 'ventaja');
		assert.equal(ids.anchor('Ventaja'), 'ventaja-1');
		assert.equal(ids.anchor('Ventaja'), 'ventaja-2');
	});

	test('HeadingIds treats case-insensitive duplicates as collisions', () => {
		const ids = new HeadingIds();
		assert.equal(ids.anchor('Rasgos'), 'rasgos');
		assert.equal(ids.anchor('rasgos'), 'rasgos-1');
	});

	test('HeadingIds replicates empty-heading occurrence behavior', () => {
		const ids = new HeadingIds();
		assert.equal(ids.anchor('¡¡¡'), '');
		assert.equal(ids.anchor('???'), '-1');
	});
});

describe('deriveChapterHeadings (manual sections)', () => {
	test('indexes H2-H4 sections with deterministic anchors and stripped titles', () => {
		const chapter = makeSectionChapter();
		const { anchor: chapterAnchor, sections } = deriveChapterHeadings(chapter);

		assert.equal(chapterAnchor, '2-creación-de-personajes');
		assert.deepEqual(
			sections,
			[
				{ level: 2, title: 'Paso 1: Atributos', anchor: 'paso-1-atributos', body: '' },
				{ level: 2, title: 'Ventaja', anchor: 'ventaja', body: '' },
				{ level: 2, title: 'Ventaja', anchor: 'ventaja-1', body: '' },
				{ level: 3, title: '¿Qué es Ventaja?', anchor: 'qué-es-ventaja', body: '' },
				{
					level: 4,
					title: 'A. Efectos Leves (Coste: 0)',
					anchor: 'a-efectos-leves-coste-0',
					// H5 is not an indexed section, so it stays inside the parent body.
					body: '##### Demasiado profundo para el índice',
				},
				{ level: 2, title: 'Paso 2: Habilidades', anchor: 'paso-2-habilidades', body: '' },
			],
			'six H2-H4 sections, H5 excluded, duplicates suffixed, bodies captured',
		);
	});

	test('empty-content chapters yield no sections but keep a stable chapter anchor', () => {
		const { anchor, sections } = deriveChapterHeadings(makeChapter());
		assert.equal(anchor, '2-creación-de-personajes');
		assert.deepEqual(sections, []);
	});
});

describe('deriveCreatureAnchors (bestiary headings)', () => {
	test('maps creature ids to anchors within the tier file, suffixing duplicates', () => {
		const group = {
			tier: 4,
			creatures: [
				makeCreature(),
				makeCreature({ id: 'id-dragon', name: 'Dragón de la Tormenta' }),
				makeCreature({ id: 'id-liche-2', name: 'Liche' }),
			],
			filename: 'rango-4.md',
		};
		const anchors = deriveCreatureAnchors(group);
		assert.equal(anchors.get('id-liche'), 'liche');
		assert.equal(anchors.get('id-dragon'), 'dragón-de-la-tormenta');
		assert.equal(anchors.get('id-liche-2'), 'liche-1');
	});

	test('a single Liche resolves to its own anchor without range knowledge', () => {
		const group = groupCreaturesByTier([makeCreature()])[0];
		const anchors = deriveCreatureAnchors(group);
		assert.equal(anchors.get('id-liche'), 'liche');
	});
});

describe('content index T2 entries', () => {
	test('buildChapterEntry attaches the deterministic H1 anchor', () => {
		const entry = buildChapterEntry(makeChapter(), 'manual-del-jugador', 'player.md');
		assert.equal(entry.kind, 'chapter');
		assert.equal(entry.heading, '2. Creación de Personajes');
		assert.equal(entry.anchor, '2-creación-de-personajes');
		assert.equal(entry.path, 'references/manual-del-jugador/02-creacion-de-personajes.md');
	});

	test('buildSectionEntry exposes chapter, heading, anchor and stable unique slug', () => {
		const chapter = makeSectionChapter();
		const { sections } = deriveChapterHeadings(chapter);
		const ventaja = sections.find((s) => s.title === 'Ventaja' && s.anchor === 'ventaja')!;

		const record = buildSectionEntry(ventaja, chapter, 'manual-del-jugador', 'player.md', 0);
		assert.ok(record, 'Ventaja must produce a section entry');
		assert.equal(record.kind, 'section');
		assert.equal(record.canonicalName, 'Ventaja');
		assert.equal(record.slug, '02-creacion-de-personajes-ventaja');
		assert.deepEqual(record.aliases, ['ventaja']);
		assert.equal(record.chapter, '2. Creación de Personajes');
		assert.equal(record.heading, 'Ventaja');
		assert.equal(record.anchor, 'ventaja');
		assert.equal(record.path, 'references/manual-del-jugador/02-creacion-de-personajes.md');
		assert.equal(record.source, 'player.md');
		assert.match(record.hash, /^[0-9a-f]{40}$/);
	});

	test('duplicate section headings get distinct stable slugs in the same chapter', () => {
		const chapter = makeSectionChapter();
		const { sections } = deriveChapterHeadings(chapter);
		const second = sections.find((s) => s.anchor === 'ventaja-1')!;
		const record = buildSectionEntry(second, chapter, 'manual-del-jugador', 'player.md', 1);
		assert.equal(record.slug, '02-creacion-de-personajes-ventaja-1');
		assert.equal(record.anchor, 'ventaja-1');
	});

	test('identical section titles in different chapters keep distinct slugs', () => {
		const a = buildSectionEntry(
			{ level: 2, title: 'Ventaja', anchor: 'ventaja', body: '' },
			makeChapter({ slug: '02-creacion-de-personajes' }),
			'manual-del-jugador',
			'player.md',
			0,
		);
		const b = buildSectionEntry(
			{ level: 2, title: 'Ventaja', anchor: 'ventaja', body: '' },
			makeChapter({
				index: 3,
				title: '3. Mecánicas de Juego',
				slug: '03-mecanicas-de-juego',
				filename: '03-mecanicas-de-juego.md',
			}),
			'manual-del-jugador',
			'player.md',
			0,
		);
		assert.notEqual(a.slug, b.slug);
	});

	test('section slugs collapse hyphen runs to satisfy the single-hyphen contract', () => {
		const record = buildSectionEntry(
			{
				level: 2,
				title: 'Paso 4: Construir el Encuentro - Compra de Enemigos',
				anchor: 'paso-4-construir-el-encuentro---compra-de-enemigos',
			},
			makeChapter({ slug: '05-disenar-criaturas-y-encuentros' }),
			'manual-del-director',
			'gm.md',
			0,
		);
		assert.ok(record);
		assert.equal(
			record.slug,
			'05-disenar-criaturas-y-encuentros-paso-4-construir-el-encuentro-compra-de-enemigos',
		);
		assert.ok(/^[a-z0-9]+(-[a-z0-9]+)*$/.test(record.slug));
		// The anchor keeps the app's real "---" while the slug stays path-safe.
		assert.equal(record.anchor, 'paso-4-construir-el-encuentro---compra-de-enemigos');
	});

	test('buildCreatureEntry carries id, tier, heading and anchor for Liche', () => {
		const record = buildCreatureEntry(
			makeCreature(),
			'references/bestiario/rango-4.md',
			'bestiary.yml',
			'liche',
		);
		assert.equal(record.kind, 'creature');
		assert.equal(record.canonicalName, 'Liche');
		assert.equal(record.id, 'id-liche');
		assert.equal(record.level, 4);
		assert.equal(record.path, 'references/bestiario/rango-4.md');
		assert.equal(record.heading, 'Liche');
		assert.equal(record.anchor, 'liche');
		assert.deepEqual(record.aliases, ['liche']);
	});
});

describe('buildContentIndex T2 integration', () => {
	const buildT2Fixture = () =>
		buildContentIndex({
			playerChapters: [makeSectionChapter()],
			gmChapters: [
				makeChapter({
					index: 1,
					title: 'Guía de Diseño de Conjuros y Habilidades',
					slug: '01-guia-de-diseno-de-conjuros-y-habilidades',
					filename: '01-guia-de-diseno-de-conjuros-y-habilidades.md',
					content: `# Guía de Diseño de Conjuros y Habilidades\n\n## El Triángulo del Balance\n\n### Paso 1: Establecer el Daño Base por Nivel\n`,
				}),
			],
			cardGroups: [
				{
					tag: 'General',
					tagSlug: 'general',
					level: 1,
					cards: [makeCard()],
					filename: 'nivel-1.yml',
					isArquetipo: false,
				},
			],
			itemGroups: [
				{
					level: 3,
					cards: [makeCard({ id: 'id-amuleto', name: 'Amuleto de Protección', level: 3 })],
					filename: 'nivel-3.yml',
				},
			],
			creatureGroups: [{ tier: 4, creatures: [makeCreature()], filename: 'rango-4.md' }],
			playerDir: 'manual-del-jugador',
			gmDir: 'manual-del-director',
		});

	test('"Ventaja" resolves to its section without knowing its chapter', () => {
		const index = buildT2Fixture();
		const section = index.entries.find(
			(e) => e.kind === 'section' && e.canonicalName === 'Ventaja',
		);
		assert.ok(section, 'Ventaja section entry must exist in the index');
		assert.equal(section.chapter, '2. Creación de Personajes');
		assert.equal(section.path, 'references/manual-del-jugador/02-creacion-de-personajes.md');
		assert.equal(section.heading, 'Ventaja');
		assert.equal(section.anchor, 'ventaja');
		assert.deepEqual(section.aliases, ['ventaja']);
	});

	test('"Liche" resolves to its range and path without knowing the tier', () => {
		const index = buildT2Fixture();
		const creature = index.entries.find(
			(e) => e.kind === 'creature' && e.canonicalName === 'Liche',
		);
		assert.ok(creature, 'Liche creature entry must exist in the index');
		assert.equal(creature.level, 4);
		assert.equal(creature.id, 'id-liche');
		assert.equal(creature.path, 'references/bestiario/rango-4.md');
		assert.equal(creature.heading, 'Liche');
		assert.equal(creature.anchor, 'liche');
		assert.deepEqual(creature.aliases, ['liche']);
	});

	test('gm sections are indexed so the GM manual is reachable by topic', () => {
		const index = buildT2Fixture();
		const triangel = index.entries.find(
			(e) => e.kind === 'section' && e.canonicalName === 'El Triángulo del Balance',
		);
		assert.ok(triangel);
		assert.equal(triangel.chapter, 'Guía de Diseño de Conjuros y Habilidades');
		assert.equal(triangel.source, 'gm.md');
		assert.equal(triangel.anchor, 'el-triángulo-del-balance');
	});

	test('T1 card/item entries keep their shape (no anchor/chapter fields)', () => {
		const index = buildT2Fixture();
		const card = index.entries.find((e) => e.kind === 'card')!;
		const item = index.entries.find((e) => e.kind === 'item')!;
		assert.equal('anchor' in card, false);
		assert.equal('chapter' in card, false);
		assert.equal('anchor' in item, false);
		assert.equal('chapter' in item, false);
	});

	test('generation is deterministic: same input, byte-identical serialization', () => {
		const first = serializeContentIndex(buildT2Fixture());
		const second = serializeContentIndex(buildT2Fixture());
		assert.equal(first, second);
		assert.ok(!first.includes('generatedAt'));
	});

	test('the whole T2 index validates cleanly', async () => {
		const index = buildT2Fixture();
		const issues = await validateContentIndex(index);
		assert.deepEqual(issues, []);
	});
});

describe('T2 build pipeline integration against written resources', () => {
	const DOCS = {
		player: `# 1. Filosofía de Diseño

Contenido.

# 2. Creación de Personajes

## Paso 1: Atributos

## Ventaja

## Ventaja
`,
		gm: `# Guía para el Director de Juego

## Otorgar Puntos de Progreso (PP)

### ¿Cuándo Otorgar PP?
`,
		cards: `cards:
  - name: Ventaja
    level: 1
    tags: [General]
    type: efecto
    uses: { qty: null, type: RELOAD }
    description: Descripción de la ventaja.
`,
		items: `items:
  - name: Amuleto de Protección
    level: 3
    type: consumible
    cost: "50"
    tags: [Utilidad]
    uses: { qty: 1, type: USES }
    description: Protege contra hechizos.
`,
		bestiary: `creatures:
  - name: Liche
    tier: 4
    lineage: No Muerto
    attributes: { body: 4, reflexes: 3, mind: 5, instinct: 3, presence: 4 }
    stats:
      maxHealth: 40
      evasion: { value: 10, note: null }
      physicalMitigation: { value: 6, note: null }
      magicalMitigation: { value: 10, note: null }
      speed: { value: 6, note: null }
    languages: []
    attacks: []
    traits: []
    actions: []
    reactions: []
    interactions: []
    behavior: null
    img: null
`,
	};

	const loadFixture = async (docsDir: string) => {
		const read = (name: string) => fs.readFile(path.join(docsDir, name), 'utf-8');
		const [playerRaw, gmRaw, cardsRaw, itemsRaw, bestiaryRaw] = await Promise.all([
			read('player.md'),
			read('gm.md'),
			read('cards.yml'),
			read('magical-items.yml'),
			read('bestiary.yml'),
		]);
		return {
			playerChapters: splitPlayerManual(playerRaw),
			gmChapters: splitGMManual(gmRaw),
			abilityCards: ((yamlLoad(cardsRaw) as { cards?: unknown[] }).cards ?? []).map(mapAbilityCard),
			magicalItems: ((yamlLoad(itemsRaw) as { items?: unknown[] }).items ?? []).map(mapItemCard),
			creatures: ((yamlLoad(bestiaryRaw) as { creatures?: unknown[] }).creatures ?? []).map(
				mapCreature,
			),
		};
	};

	test('index built from real loaders is deterministic and validates against written files', async () => {
		const base = await fs.mkdtemp(path.join(os.tmpdir(), 'arcana-t2-'));
		const docsDir = path.join(base, 'docs');
		const outDir = path.join(base, 'out');
		await fs.mkdir(docsDir, { recursive: true });
		await fs.mkdir(outDir, { recursive: true });

		const buildOnce = async () => {
			const data = await loadFixture(docsDir);
			const flatCardGroups = flattenCardGroups(groupCardsByTagAndLevel(data.abilityCards));
			const itemGroups = groupItemsByLevel(data.magicalItems);
			const creatureGroups = groupCreaturesByTier(data.creatures);
			return buildContentIndex({
				playerChapters: data.playerChapters,
				gmChapters: data.gmChapters,
				cardGroups: flatCardGroups,
				itemGroups,
				creatureGroups,
				playerDir: 'manual-del-jugador',
				gmDir: 'manual-del-director',
			});
		};

		try {
			await Promise.all(
				Object.entries(DOCS).map(([name, content]) =>
					fs.writeFile(
						path.join(
							docsDir,
							name === 'player'
								? 'player.md'
								: name === 'gm'
									? 'gm.md'
									: name === 'cards'
										? 'cards.yml'
										: name === 'items'
											? 'magical-items.yml'
											: 'bestiary.yml',
						),
						content,
						'utf-8',
					),
				),
			);

			const indexA = await buildOnce();
			// Simulate the resource files the builders would write so integrity checks
			// resolve real relative paths inside the temp output tree.
			for (const record of indexA.entries) {
				const absPath = path.join(outDir, record.path);
				await fs.mkdir(path.dirname(absPath), { recursive: true });
				await fs.writeFile(absPath, `# ${record.heading ?? record.canonicalName}\n`, 'utf-8');
			}
			const serializedA = serializeContentIndex(indexA);

			const indexB = await buildOnce();
			assert.equal(
				serializeContentIndex(indexB),
				serializedA,
				'same source must produce the same index',
			);

			const parsed = JSON.parse(serializedA) as {
				schemaVersion: number;
				entries: Array<Record<string, unknown>>;
			};
			assert.equal(parsed.schemaVersion, CONTENT_INDEX_SCHEMA_VERSION);
			// 2 player chapters + 3 player sections + 1 gm chapter + 2 gm sections + 1 card + 1 item + 1 creature
			assert.equal(parsed.entries.length, 2 + 3 + 1 + 2 + 1 + 1 + 1);

			const issues = await validateContentIndex(indexA, {
				pathExists: async (relPath) => {
					try {
						return (await fs.stat(path.join(outDir, relPath))).isFile();
					} catch {
						return false;
					}
				},
			});
			assert.deepEqual(issues, []);
		} finally {
			await fs.rm(base, { recursive: true, force: true });
		}
	});
});
