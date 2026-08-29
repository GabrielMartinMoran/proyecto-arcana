import { load as yamlLoad } from 'js-yaml';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { describe, test } from 'node:test';

import {
	buildCardEntry,
	buildContentIndex,
	buildCreatureEntry,
	buildItemEntry,
	buildSectionEntry,
	validateContentIndex,
} from '../src/builders/content-index-builder.js';
import { loadBestiaryCreatures } from '../src/loaders/bestiary-loader.js';
import { mapAbilityCard, mapItemCard } from '../src/mappers/card-mapper.js';
import {
	deriveCreatureAnchors,
	groupCreaturesByTier,
} from '../src/processors/bestiary-processor.js';
import {
	flattenCardGroups,
	groupCardsByTagAndLevel,
	groupItemsByLevel,
} from '../src/processors/cards-processor.js';
import type { Chapter } from '../src/processors/manual-processor.js';
import {
	deriveChapterHeadings,
	splitGMManual,
	splitPlayerManual,
} from '../src/processors/manual-processor.js';
import type { Card } from '../src/types/card.js';
import {
	canonicalSerialize,
	CONTENT_INDEX_SCHEMA_VERSION,
	serializeContentIndex,
} from '../src/types/content-index.js';
import type { Creature } from '../src/types/creature.js';

const REPO_ROOT = path.resolve(import.meta.dirname, '..', '..', '..');
const DOCS_DIR = path.join(REPO_ROOT, 'static', 'docs');

// --- Fixtures that mirror the T5 acceptance sources (real wording) ----------

const makeAfinidadArcana = (): Card =>
	mapAbilityCard({
		name: 'Afinidad Arcana',
		level: 1,
		type: 'efecto',
		tags: ['Arcanista'],
		requirements: 'Estudios Mágicos | Pacto Supremo | Herencia Sobrenatural',
		description:
			'_La magia no es un misterio para ti, sino una herramienta, un pacto o un derecho de nacimiento._<br><br>' +
			'Tienes acceso a la lista de cartas de _Arcanista_ y usas tu Atributo Arcano para los requerimientos y efectos de estas.',
		uses: { qty: 0, type: 'RELOAD' },
	});

const makeArmaEnriquecida = (): Card =>
	mapItemCard({
		name: 'Arma Enriquecida',
		level: 2,
		type: 'efecto',
		tags: ['Arma'],
		requirements: null,
		cost: 600,
		description:
			'Esta propiedad se puede aplicar a cualquier arma. El arma está imbuida y enriquecida ' +
			'mágicamente para golpear con más certeza y hacer más daño. Obtienes un +1 a tus tiradas de ataque y +1 al daño infligido con esta arma.',
		uses: { qty: 0, type: 'RELOAD' },
	});

const chapter9 = (): Chapter => ({
	index: 9,
	title: '9. Progresión del Personaje',
	slug: '09-progresion-del-personaje',
	content: `# 9. Progresión del Personaje

A lo largo de sus aventuras, los personajes acumulan experiencia.

### Adquirir Nueva Carta

Añadir una nueva carta a tu **Colección** expande tu repertorio de habilidades pasivas y activables. El coste depende del poder de la carta, indicado por su Nivel.

| Nivel de la Carta | Coste en PP |
| :---------------- | :---------- |
| Nivel 1           | 3 PP        |
| Nivel 2           | 5 PP        |
| Nivel 3           | 8 PP        |
`,
	filename: '09-progresion-del-personaje.md',
});

const makeLiche = (overrides: Partial<Creature> = {}): Creature => ({
	id: 'id-liche',
	name: 'Liche',
	lineage: 'No Muerto',
	tier: 6,
	attributes: { body: 4, reflexes: 3, mind: 5, instinct: 3, presence: 4 },
	stats: {
		maxHealth: 90,
		evasion: { value: 12, note: null },
		physicalMitigation: { value: 8, note: null },
		magicalMitigation: { value: 12, note: null },
		speed: { value: 6, note: null },
	},
	languages: [],
	attacks: [{ name: 'Toque Helado', bonus: 8, damage: '2d8+4', note: null }],
	traits: [{ name: 'Inmortalidad', detail: 'El Liche regresa a su filacteria mientras exista.' }],
	actions: [
		{ name: 'Dominar No Muertos', detail: 'Controla criaturas no muertas cercanas.', uses: null },
	],
	reactions: [
		{ name: 'Escudo Arcano', detail: 'Reacciona a ataques con un vínculo arcano.', uses: null },
	],
	interactions: [],
	behavior: 'Un Liche evita el combate directo y dirige a sus sirvientes desde la retaguardia.',
	img: null,
	...overrides,
});

// --- T5 contract -------------------------------------------------------------

describe('T5 searchable evidence index (schema v3)', () => {
	test('the contract is explicitly elevated to schema v3', () => {
		assert.equal(CONTENT_INDEX_SCHEMA_VERSION, 3);
		const index = buildContentIndex({
			playerChapters: [],
			gmChapters: [],
			cardGroups: [],
			itemGroups: [],
			creatureGroups: [],
			playerDir: 'manual-del-jugador',
			gmDir: 'manual-del-director',
		});
		assert.equal(index.schemaVersion, 3);
	});

	test('Afinidad Arcana is reachable by its real description and requirements text', () => {
		const card = makeAfinidadArcana();
		const record = buildCardEntry(
			card,
			'references/cartas-de-habilidades/arcanista/nivel-1.yml',
			'cards.yml',
		);

		// T1/T2 identity and filters are preserved on the v3 entry.
		assert.equal(record.kind, 'card');
		assert.equal(record.canonicalName, 'Afinidad Arcana');
		assert.equal(record.path, 'references/cartas-de-habilidades/arcanista/nivel-1.yml');
		assert.equal(record.source, 'cards.yml');

		// v3 structured filter fields come from the authored card data.
		assert.equal(record.structured?.cardType, 'ability');
		assert.equal(record.structured?.type, 'efecto');
		assert.ok(record.structured?.requirements, 'requirements must be present when authored');
		assert.ok(
			record.structured.requirements!.includes('Estudios Mágicos'),
			'the requirement text itself must be indexed',
		);

		// v3 searchable body carries the real description (evidence beyond the word Arcanista).
		assert.ok(record.search, 'card must expose a searchable body');
		assert.ok(record.search!.includes('Atributo Arcano'), 'real description text must be indexed');
		assert.ok(record.search!.includes('magia'), 'description evidence must not depend on the name');
	});

	test('Arma Enriquecida item is reachable by its real description and cost', () => {
		const item = makeArmaEnriquecida();
		const record = buildItemEntry(
			item,
			'references/objetos-magicos/nivel-2.yml',
			'magical-items.yml',
		);

		assert.equal(record.kind, 'item');
		assert.equal(record.canonicalName, 'Arma Enriquecida');
		assert.equal(record.structured?.cardType, 'item');
		assert.equal(record.structured?.type, 'efecto');
		assert.equal(record.structured?.cost, '600', 'numeric cost is serialized deterministically');

		assert.ok(record.search, 'item must expose a searchable body');
		assert.ok(
			record.search!.includes('imbuida y enriquecida'),
			'real item description must be indexed',
		);
		assert.ok(record.search!.includes('cualquier arma'));
	});

	test('Adquirir Nueva Carta section is reachable by its real table body', () => {
		const chapter = chapter9();
		const { sections } = deriveChapterHeadings(chapter);
		assert.ok(sections.length > 0, 'H3 section must be indexed');
		const section = sections.find((s) => s.title === 'Adquirir Nueva Carta');
		assert.ok(section, 'Adquirir Nueva Carta must be a section');

		const record = buildSectionEntry(section!, chapter, 'manual-del-jugador', 'player.md', 0);
		assert.ok(record, 'section entry must exist');
		assert.equal(record.kind, 'section');
		assert.equal(record.canonicalName, 'Adquirir Nueva Carta');
		assert.equal(record.chapter, '9. Progresión del Personaje');

		// The section body includes the cost tables/lists, i.e. the real evidence.
		assert.ok(record.search, 'section must expose its searchable body');
		assert.ok(record.search!.includes('Coste en PP'), 'table header text must be indexed');
		assert.ok(record.search!.includes('Nivel de la Carta'), 'table header text must be indexed');
		assert.ok(record.search!.includes('3 PP'), 'table cell evidence must be indexed');
		assert.ok(record.search!.includes('Colección'));
	});

	test('creature lineage and trait/action/reaction/behavior text are indexed', () => {
		const liche = makeLiche();
		const group = groupCreaturesByTier([liche])[0];
		const anchor = deriveCreatureAnchors(group).get(liche.id);
		const record = buildCreatureEntry(
			liche,
			group.filename === 'rango-6.md'
				? 'references/bestiario/rango-6.md'
				: `references/bestiario/${group.filename}`,
			'bestiary.yml',
			anchor,
		);

		assert.equal(record.kind, 'creature');
		assert.equal(record.structured?.lineage, 'No Muerto');
		assert.equal(record.level, 6, 'rank is preserved as level');

		assert.ok(record.search, 'creature must expose a searchable body');
		assert.ok(record.search!.includes('No Muerto'), 'lineage text is searchable');
		assert.ok(record.search!.includes('Inmortalidad'), 'trait text is searchable');
		assert.ok(record.search!.includes('Dominar No Muertos'), 'action text is searchable');
		assert.ok(record.search!.includes('Reacciona'), 'reaction text is searchable');
		assert.ok(record.search!.includes('evita el combate directo'), 'behavior text is searchable');
	});

	test('identity/filter fields from T1/T2 stay on v3 entries (chapter + creature anchors)', () => {
		const chapter = chapter9();
		const chapterEntry = buildSectionEntry(
			{ level: 3, title: 'Adquirir Nueva Carta', anchor: 'adquirir-nueva-carta', body: 'texto.' },
			chapter,
			'manual-del-jugador',
			'player.md',
			0,
		)!;
		assert.equal(chapterEntry.anchor, 'adquirir-nueva-carta');
		assert.equal(chapterEntry.heading, 'Adquirir Nueva Carta');
		assert.match(chapterEntry.hash, /^[0-9a-f]{40}$/);

		const creatureEntry = buildCreatureEntry(
			makeLiche(),
			'references/bestiario/rango-6.md',
			'bestiary.yml',
			'liche',
		);
		assert.equal(creatureEntry.anchor, 'liche');
		assert.equal(creatureEntry.heading, 'Liche');
		assert.equal(creatureEntry.source, 'bestiary.yml');
	});

	test('hash and serialization include the semantic fields and stay byte-deterministic', () => {
		const base = makeAfinidadArcana();
		const modified = makeAfinidadArcana();
		modified.description = modified.description.replace('Atributo Arcano', 'Atributo Espiritual');

		const recordA = buildCardEntry(base, 'x.yml', 'cards.yml');
		const recordB = buildCardEntry(modified, 'x.yml', 'cards.yml');

		// Semantic content is part of the hashed canonical payload.
		assert.notEqual(
			recordA.hash,
			recordB.hash,
			'changing the searchable body must change the hash',
		);

		// Serialization carries the new fields and sorts keys deterministically.
		const serialized = canonicalSerialize(recordA);
		assert.ok(serialized.includes('"structured"'));
		assert.ok(serialized.includes('"search"'));
		assert.ok(serialized.includes('Atributo Arcano'));

		const rebuilt = buildContentIndex({
			playerChapters: [],
			gmChapters: [],
			cardGroups: [
				{
					tag: 'General',
					tagSlug: 'general',
					level: 1,
					cards: [base],
					filename: 'nivel-1.yml',
					isArquetipo: false,
				},
			],
			itemGroups: [],
			creatureGroups: [],
			playerDir: 'manual-del-jugador',
			gmDir: 'manual-del-director',
		});
		const again = buildContentIndex({
			playerChapters: [],
			gmChapters: [],
			cardGroups: [
				{
					tag: 'General',
					tagSlug: 'general',
					level: 1,
					cards: [base],
					filename: 'nivel-1.yml',
					isArquetipo: false,
				},
			],
			itemGroups: [],
			creatureGroups: [],
			playerDir: 'manual-del-jugador',
			gmDir: 'manual-del-director',
		});
		assert.equal(serializeContentIndex(again), serializeContentIndex(rebuilt));
		assert.ok(!serializeContentIndex(rebuilt).includes('generatedAt'));
		assert.ok(!serializeContentIndex(rebuilt).includes('indexedAt'));
	});

	test('validation accepts the v3 shape and flags invalid structured keys and empty bodies', async () => {
		const card = makeAfinidadArcana();
		const clean = buildCardEntry(
			card,
			'references/cartas-de-habilidades/arcanista/nivel-1.yml',
			'cards.yml',
		);
		const issues = await validateContentIndex({
			schemaVersion: 3,
			entries: [clean],
		});
		assert.deepEqual(issues, []);

		const badKey = {
			...clean,
			slug: 'afinidad-arcana-2',
			structured: { ...clean.structured, invented: 'x' },
		};
		const badBody = { ...clean, slug: 'afinidad-arcana-3', search: '   ' };
		const flagged = await validateContentIndex({
			schemaVersion: 3,
			entries: [badKey, badBody],
		});
		assert.ok(flagged.some((issue) => issue.includes('invalid structured key')));
		assert.ok(flagged.some((issue) => issue.includes('search must be a non-empty string')));
	});
});

// --- T5 real corpus reachability (static/docs, read-only) --------------------

describe('T5 real corpus reachability (static/docs)', () => {
	const skip = [
		'player.md',
		'gm.md',
		'cards.yml',
		'magical-items.yml',
		'bestiary/index.json',
	].every((file) => fs.existsSync(path.join(DOCS_DIR, file)))
		? false
		: 'real static/docs corpus not present';

	const loadRealIndex = () => {
		const read = (name: string): string => fs.readFileSync(path.join(DOCS_DIR, name), 'utf-8');
		const playerChapters = splitPlayerManual(read('player.md'));
		const gmChapters = splitGMManual(read('gm.md'));
		const abilityCards = ((yamlLoad(read('cards.yml')) as { cards?: unknown[] }).cards ?? []).map(
			mapAbilityCard,
		);
		const magicalItems = (
			(yamlLoad(read('magical-items.yml')) as { items?: unknown[] }).items ?? []
		).map(mapItemCard);
		const creatures = loadBestiaryCreatures();
		return buildContentIndex({
			playerChapters,
			gmChapters,
			cardGroups: flattenCardGroups(groupCardsByTagAndLevel(abilityCards)),
			itemGroups: groupItemsByLevel(magicalItems),
			creatureGroups: groupCreaturesByTier(creatures),
			playerDir: 'manual-del-jugador',
			gmDir: 'manual-del-director',
		});
	};

	test('schema v3 includes the documented 23-creature bestiary expansion', { skip }, () => {
		const index = loadRealIndex();
		assert.equal(index.schemaVersion, 3);
		// T2 corpus: 317 cards + 68 items + 66 creatures + 142 sections + 22 chapters.
		assert.equal(index.entries.length, 615);
		const cards = index.entries.filter((e) => e.kind === 'card').length;
		const items = index.entries.filter((e) => e.kind === 'item').length;
		const creatures = index.entries.filter((e) => e.kind === 'creature').length;
		const sections = index.entries.filter((e) => e.kind === 'section').length;
		const chapters = index.entries.filter((e) => e.kind === 'chapter').length;
		assert.deepEqual(
			{ cards, items, creatures, sections, chapters },
			{
				cards: 317,
				items: 68,
				creatures: 66,
				sections: 142,
				chapters: 22,
			},
		);
	});

	test('Afinidad Arcana (real) is reachable by its description evidence', { skip }, () => {
		const index = loadRealIndex();
		const entry = index.entries.find(
			(e) => e.kind === 'card' && e.canonicalName === 'Afinidad Arcana',
		);
		assert.ok(entry, 'Afinidad Arcana must be an index entry');
		assert.ok(entry.search, 'entry must carry searchable body');
		assert.ok(entry.search!.includes('Atributo Arcano'));
		assert.ok(entry.search!.includes('usas tu Atributo Arcano para los requerimientos'));
		assert.equal(entry.structured?.cardType, 'ability');
		assert.equal(entry.structured?.type, 'efecto');
		assert.ok(entry.structured?.requirements?.includes('Estudios Mágicos'));
	});

	test('Arma Enriquecida (real) is reachable by its item description and cost', { skip }, () => {
		const index = loadRealIndex();
		const entry = index.entries.find(
			(e) => e.kind === 'item' && e.canonicalName === 'Arma Enriquecida',
		);
		assert.ok(entry, 'Arma Enriquecida must be an index entry');
		assert.ok(entry.search, 'item must carry searchable body');
		assert.ok(entry.search!.includes('imbuida'));
		assert.ok(entry.search!.includes('mágicamente'));
		assert.equal(entry.structured?.cost, '600');
		assert.equal(entry.structured?.cardType, 'item');
	});

	test('Adquirir Nueva Carta (real) section carries its cost table evidence', { skip }, () => {
		const index = loadRealIndex();
		const entry = index.entries.find(
			(e) => e.kind === 'section' && e.canonicalName === 'Adquirir Nueva Carta',
		);
		assert.ok(entry, 'Adquirir Nueva Carta must be an index section');
		assert.equal(entry.chapter, '9. Progresión del Personaje');
		assert.ok(entry.search, 'section must carry its searchable body');
		assert.ok(entry.search!.includes('Coste en PP'));
		assert.ok(entry.search!.includes('Nivel de la Carta'));
		assert.ok(entry.search!.includes('3 PP'));
		assert.ok(entry.search!.includes('depende del poder de la carta'));
	});

	test('Arsenal Versátil (real) is reachable in creature design rules', { skip }, () => {
		const index = loadRealIndex();
		const entry = index.entries.find(
			(e) => e.kind === 'section' && e.canonicalName === 'Regla de Diseño: Arsenal Versátil',
		);
		assert.ok(entry, 'Arsenal Versátil must be an indexed GM section');
		assert.equal(
			entry.path,
			'references/manual-del-director/08-parte-2-diseno-avanzado-de-criaturas.md',
		);
		assert.equal(entry.anchor, 'regla-de-diseño-arsenal-versátil');
		assert.equal(entry.chapter, 'Parte 2: Diseño Avanzado de Criaturas');
		assert.ok(entry.search?.includes('aporta versatilidad'));
		assert.ok(entry.search?.includes('independiente'));
	});

	test('real corpus stays deterministic and validates cleanly as v3', { skip }, async () => {
		const first = serializeContentIndex(loadRealIndex());
		const second = serializeContentIndex(loadRealIndex());
		assert.equal(first, second);
		const issues = await validateContentIndex(loadRealIndex());
		assert.deepEqual(issues, []);
	});
});
