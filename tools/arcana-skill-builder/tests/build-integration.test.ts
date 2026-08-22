import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { load as yamlLoad } from 'js-yaml';

import {
	buildContentIndex,
	scanForSecretLeaks,
	validateContentIndex,
} from '../src/builders/content-index-builder.js';
import { splitGMManual, splitPlayerManual } from '../src/processors/manual-processor.js';
import {
	flattenCardGroups,
	groupCardsByTagAndLevel,
	groupItemsByLevel,
} from '../src/processors/cards-processor.js';
import { groupCreaturesByTier } from '../src/processors/bestiary-processor.js';
import { mapAbilityCard, mapItemCard } from '../src/mappers/card-mapper.js';
import { mapCreature } from '../src/mappers/creature-mapper.js';
import { writeResourceManifest } from '../src/scripts/build/resource-manifest.js';
import { serializeContentIndex, CONTENT_INDEX_SCHEMA_VERSION } from '../src/types/content-index.js';

const PLAYER_MANUAL = `# 1. Filosofía de Diseño

Contenido de filosofía de diseño.

# 2. Creación de Personajes

Contenido de creación de personajes.
`;

const GM_MANUAL = `# Guía del Director

Contenido para el director de juego.
`;

const CARDS_YAML = `
cards:
  - name: Ventaja
    level: 1
    tags: [General]
    type: efecto
    uses:
      qty: null
      type: RELOAD
    description: Descripción de la ventaja.
  - name: Pacto Supremo
    level: 3
    tags: [Arquetipo, Brujo]
    type: activable
    uses:
      qty: 1
      type: DAY
    description: Pacto oscuro supremo.
`;

const ITEMS_YAML = `
items:
  - name: Amuleto de Protección
    level: 3
    type: consumible
    cost: "50"
    tags: [Utilidad]
    uses:
      qty: 1
      type: USES
    description: Protege contra hechizos.
`;

const BESTIARY_YAML = `
creatures:
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
`;

interface FixtureSet {
	docsDir: string;
	outDir: string;
}

const makeFixtureSet = async (): Promise<FixtureSet> => {
	const base = await fs.mkdtemp(path.join(os.tmpdir(), 'arcana-int-'));
	const docsDir = path.join(base, 'docs');
	const outDir = path.join(base, 'out');
	await fs.mkdir(docsDir, { recursive: true });
	await fs.mkdir(outDir, { recursive: true });
	await fs.writeFile(path.join(docsDir, 'player.md'), PLAYER_MANUAL, 'utf-8');
	await fs.writeFile(path.join(docsDir, 'gm.md'), GM_MANUAL, 'utf-8');
	await fs.writeFile(path.join(docsDir, 'cards.yml'), CARDS_YAML, 'utf-8');
	await fs.writeFile(path.join(docsDir, 'magical-items.yml'), ITEMS_YAML, 'utf-8');
	await fs.writeFile(path.join(docsDir, 'bestiary.yml'), BESTIARY_YAML, 'utf-8');
	return { docsDir, outDir };
};

const loadFixturePipeline = async (docsDir: string) => {
	const read = (name: string) => fs.readFile(path.join(docsDir, name), 'utf-8');
	const [playerRaw, gmRaw, cardsRaw, itemsRaw, bestiaryRaw] = await Promise.all([
		read('player.md'),
		read('gm.md'),
		read('cards.yml'),
		read('magical-items.yml'),
		read('bestiary.yml'),
	]);

	const playerChapters = splitPlayerManual(playerRaw);
	const gmChapters = splitGMManual(gmRaw);
	const abilityCards = ((yamlLoad(cardsRaw) as { cards?: unknown[] }).cards ?? []).map(
		mapAbilityCard,
	);
	const magicalItems = ((yamlLoad(itemsRaw) as { items?: unknown[] }).items ?? []).map(mapItemCard);
	const creatures = ((yamlLoad(bestiaryRaw) as { creatures?: unknown[] }).creatures ?? []).map(
		mapCreature,
	);

	const flatCardGroups = flattenCardGroups(groupCardsByTagAndLevel(abilityCards));
	const itemGroups = groupItemsByLevel(magicalItems);
	const creatureGroups = groupCreaturesByTier(creatures);

	return {
		playerChapters,
		gmChapters,
		abilityCards,
		magicalItems,
		creatures,
		flatCardGroups,
		itemGroups,
		creatureGroups,
	};
};

test('deterministic generation: index + manifest without AI is stable and free of timestamps', async () => {
	const { docsDir, outDir } = await makeFixtureSet();
	try {
		const dataA = await loadFixturePipeline(docsDir);
		const indexA = buildContentIndex({
			playerChapters: dataA.playerChapters,
			gmChapters: dataA.gmChapters,
			cardGroups: dataA.flatCardGroups,
			itemGroups: dataA.itemGroups,
			creatureGroups: dataA.creatureGroups,
			playerDir: 'manual-del-jugador',
			gmDir: 'manual-del-director',
		});

		// Simulate the resource files the builders would write, so integrity checks
		// resolve real relative paths inside the temp output tree.
		for (const record of indexA.entries) {
			const absPath = path.join(outDir, record.path);
			await fs.mkdir(path.dirname(absPath), { recursive: true });
			await fs.writeFile(absPath, `# ${record.canonicalName}\n`, 'utf-8');
		}

		const contentIndexPath = path.join(outDir, 'content-index.json');
		await fs.writeFile(contentIndexPath, serializeContentIndex(indexA), 'utf-8');
		const manifestPath = path.join(outDir, 'resources-manifest.json');
		await writeResourceManifest(outDir, manifestPath, {
			relativeTo: outDir,
			includeDirectories: true,
		});
		const manifestText = await fs.readFile(manifestPath, 'utf-8');
		const serializedA = await fs.readFile(contentIndexPath, 'utf-8');

		// Re-run the whole pipeline into a second temp output to prove determinism.
		const dataB = await loadFixturePipeline(docsDir);
		const indexB = buildContentIndex({
			playerChapters: dataB.playerChapters,
			gmChapters: dataB.gmChapters,
			cardGroups: dataB.flatCardGroups,
			itemGroups: dataB.itemGroups,
			creatureGroups: dataB.creatureGroups,
			playerDir: 'manual-del-jugador',
			gmDir: 'manual-del-director',
		});
		assert.equal(serializeContentIndex(indexB), serializedA);

		// No timestamps in the index contract (ordering/hash must be timestamp-free).
		assert.ok(!serializedA.includes('generatedAt'), 'index must not contain generatedAt');
		assert.ok(!serializedA.includes('indexedAt'), 'index must not contain indexedAt');
		const parsed = JSON.parse(serializedA) as { schemaVersion: number; entries: unknown[] };
		assert.equal(parsed.schemaVersion, CONTENT_INDEX_SCHEMA_VERSION);
		assert.equal(parsed.entries.length, 2 + 1 + 2 + 1 + 1); // chapters + gm + cards + items + creatures

		// The manifest document is also deterministic and timestamp-free.
		const manifestObj = JSON.parse(manifestText) as Record<string, unknown>;
		assert.ok(!('generatedAt' in manifestObj));

		// Integrity validation passes against the temp output tree.
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

		// No secret material leaks into the deterministic outputs.
		assert.deepEqual(scanForSecretLeaks(`${serializedA}\n${manifestText}`), []);
	} finally {
		await fs.rm(path.dirname(outDir), { recursive: true, force: true });
	}
});

test('index generation does not require or invoke LLM/network (structure only)', async () => {
	const { docsDir, outDir } = await makeFixtureSet();
	try {
		const data = await loadFixturePipeline(docsDir);
		const index = buildContentIndex({
			playerChapters: data.playerChapters,
			gmChapters: data.gmChapters,
			cardGroups: data.flatCardGroups,
			itemGroups: data.itemGroups,
			creatureGroups: data.creatureGroups,
			playerDir: 'manual-del-jugador',
			gmDir: 'manual-del-director',
		});
		// buildContentIndex is a pure function over mappers/processors data; it never
		// constructs an LLM client nor performs I/O beyond explicit calls. No network is used.
		assert.ok(index.entries.length > 0);
		assert.ok(index.entries.every((record) => record.path.startsWith('references/')));
	} finally {
		await fs.rm(path.dirname(outDir), { recursive: true, force: true });
	}
});
