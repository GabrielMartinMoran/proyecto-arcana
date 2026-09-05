import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { load as yamlLoad } from 'js-yaml';

import { buildContentIndex } from '../src/builders/content-index-builder.js';
import { loadBestiaryCreatures } from '../src/loaders/bestiary-loader.js';
import { loadAbilityCards } from '../src/loaders/cards-loader.js';
import { mapItemCard } from '../src/mappers/card-mapper.js';
import { splitGMManual, splitPlayerManual } from '../src/processors/manual-processor.js';
import { groupCreaturesByTier } from '../src/processors/bestiary-processor.js';
import {
	flattenCardGroups,
	groupCardsByTagAndLevel,
	groupItemsByLevel,
} from '../src/processors/cards-processor.js';
import { searchContentIndex } from '../src/scripts/cli/search/engine.js';

const REPO_ROOT = path.resolve(import.meta.dirname, '..', '..', '..');
const DOCS_DIR = path.join(REPO_ROOT, 'static', 'docs');

const smokeAvailable = (): boolean =>
	fs.existsSync(path.join(DOCS_DIR, 'player.md')) &&
	fs.existsSync(path.join(DOCS_DIR, 'gm.md')) &&
	fs.existsSync(path.join(DOCS_DIR, 'cards', 'index.json')) &&
	fs.existsSync(path.join(DOCS_DIR, 'magical-items.yml')) &&
	fs.existsSync(path.join(DOCS_DIR, 'bestiary', 'index.json'));

const loadRealIndex = () => {
	const read = (name: string): string => fs.readFileSync(path.join(DOCS_DIR, name), 'utf-8');
	const playerChapters = splitPlayerManual(read('player.md'));
	const gmChapters = splitGMManual(read('gm.md'));
	const abilityCards = loadAbilityCards();
	const magicalItems = (
		(yamlLoad(read('magical-items.yml')) as { items?: unknown[] }).items ?? []
	).map(mapItemCard);
	const creatures = loadBestiaryCreatures();
	const flatCardGroups = flattenCardGroups(groupCardsByTagAndLevel(abilityCards));
	const itemGroups = groupItemsByLevel(magicalItems);
	const creatureGroups = groupCreaturesByTier(creatures);
	return buildContentIndex({
		playerChapters,
		gmChapters,
		cardGroups: flatCardGroups,
		itemGroups,
		creatureGroups,
		playerDir: 'manual-del-jugador',
		gmDir: 'manual-del-director',
	});
};

describe('search smoke over the real corpus (no generation, no network)', () => {
	const skip = smokeAvailable() ? false : 'real static/docs corpus not present';

	test('Pacto Supremo resolves to the canonical slug, not an obsolete one', { skip }, () => {
		const { output, detail } = searchContentIndex(loadRealIndex(), { query: 'Pacto Supremo' });
		assert.equal(output.status, 'found');
		assert.equal(output.results[0].name, 'Pacto Supremo');
		assert.equal(detail[0].slug, 'pacto-supremo');
		assert.notEqual(detail[0].slug, 'arquetipo-brujo-pacto-siniestro');
	});

	test('Cíclope and ciclope resolve to the same creature and source', { skip }, () => {
		const accented = searchContentIndex(loadRealIndex(), { query: 'Cíclope' });
		const plain = searchContentIndex(loadRealIndex(), { query: 'ciclope' });
		assert.equal(accented.output.results[0].name, 'Cíclope');
		assert.match(accented.output.results[0].source, /^references\/bestiario\/rango-\d+\.md#.+/);
		assert.equal(JSON.stringify(accented.output), JSON.stringify(plain.output));
	});

	test('Liche resolves to the bestiary without range knowledge', { skip }, () => {
		const { output } = searchContentIndex(loadRealIndex(), { query: 'Liche' });
		assert.equal(output.status, 'found');
		assert.equal(output.results[0].kind, 'creature');
		assert.equal(output.results[0].name, 'Liche');
		assert.match(output.results[0].source, /^references\/bestiario\/rango-\d+\.md#liche$/);
	});

	test('a prefix query still ranks Pacto Supremo first', { skip }, () => {
		const { output } = searchContentIndex(loadRealIndex(), { query: 'pacto sup' });
		assert.equal(output.results[0].name, 'Pacto Supremo');
	});

	test(
		'PP ranks "Gastar Puntos de Progreso (PP)" first and no PPF entry precedes it',
		{ skip },
		() => {
			// QA contract_violation regression: `pp` raw prefix-matched `ppf` inside
			// PPF section titles ("A. Habilidades de Sabor (Coste: 0 PPF)", "B.
			// Rasgos Tácticos (Coste en PPF)") and those sections ranked above the
			// canonical player section. Acronym tokens match full-token or through
			// the verified glossary expansion only.
			const { output } = searchContentIndex(loadRealIndex(), { query: 'PP' });
			assert.equal(output.status, 'found');
			const names = output.results.map((result) => result.name);
			const gastarIndex = names.indexOf('Gastar Puntos de Progreso (PP)');
			assert.equal(
				gastarIndex,
				0,
				`PP top-1 must be the canonical section, got ${names.join(' | ')}`,
			);
			const ppfBefore = names.slice(0, gastarIndex).some((name) => name.includes('PPF'));
			assert.ok(
				!ppfBefore,
				`no PPF entry may precede the canonical PP section, got ${names.join(' | ')}`,
			);
		},
	);

	test('Gherkin literal "arma reforzada mágicamente" surfaces Arma Enriquecida', { skip }, () => {
		// @arcana-reference @semantic @items: the real item description contains
		// "reforzada" and "mágicamente", so the literal query must reach it through
		// controlled morphology, and no generic "Arma" card may displace it.
		const { output } = searchContentIndex(loadRealIndex(), {
			query: 'arma reforzada mágicamente',
		});
		assert.equal(output.status, 'found');
		assert.equal(
			output.results[0].name,
			'Arma Enriquecida',
			`Arma Enriquecida must rank first, got ${JSON.stringify(output.results.map((r) => r.name))}`,
		);
	});

	test(
		'objects filtered by level and tag return ordered references without full content',
		{ skip },
		() => {
			const index = loadRealIndex();
			const matchingItems = index.entries.filter(
				(e) => e.kind === 'item' && e.level === 3 && e.tags.includes('Utilidad'),
			);
			assert.ok(matchingItems.length > 0, 'real corpus must contain level-3 Utilidad items');
			const probe = matchingItems[0].canonicalName.split(' ')[0].toLocaleLowerCase();
			const { output } = searchContentIndex(index, {
				query: probe,
				kind: 'item',
				level: 3,
				tagsAll: ['Utilidad'],
			});
			assert.equal(output.status, 'found');
			assert.ok(output.results.length > 0);
			assert.ok(output.results.every((r) => r.kind === 'item'));
		},
	);

	test('real corpus: a single --level 2 filter remains compatible', { skip }, () => {
		const index = loadRealIndex();
		const level2Cards = index.entries.filter(
			(e) => e.kind === 'card' && e.tags.includes('Bardo') && e.level === 2,
		);
		assert.ok(level2Cards.length > 0, 'real corpus must contain level-2 Bardo cards');
		const { output, detail } = searchContentIndex(index, {
			query: 'Bardo',
			kind: 'card',
			level: 2,
		});
		assert.equal(output.status, 'found');
		assert.ok(detail.length > 0);
		assert.ok(
			detail.every((d) => d.level === 2),
			'every result must be level 2',
		);
	});

	test('real corpus: repeated --level 2 --level 3 includes only those levels', { skip }, () => {
		const index = loadRealIndex();
		const level2Cards = index.entries.filter(
			(e) => e.kind === 'card' && e.tags.includes('Bardo') && e.level === 2,
		);
		const level3Cards = index.entries.filter(
			(e) => e.kind === 'card' && e.tags.includes('Bardo') && e.level === 3,
		);
		assert.ok(
			level2Cards.length > 0 && level3Cards.length > 0,
			'real corpus must contain Bardo cards at levels 2 and 3',
		);
		const { output, detail } = searchContentIndex(index, {
			query: 'Bardo',
			kind: 'card',
			level: [2, 3],
		});
		assert.equal(output.status, 'found');
		const levels = new Set(detail.map((d) => d.level));
		assert.ok(levels.has(2) && levels.has(3), 'both requested levels must be present');
		assert.ok(
			detail.every((d) => d.level === 2 || d.level === 3),
			'no level outside the requested set may appear',
		);
	});

	test('real corpus: tagsAll with two values requires both tags (AND semantics)', { skip }, () => {
		const index = loadRealIndex();
		const candidates = index.entries.filter(
			(e) => e.kind === 'card' && e.tags.length >= 2 && e.canonicalName.split(' ')[0].length >= 4,
		);
		assert.ok(candidates.length > 0, 'real corpus must contain multi-tag card entries');
		const probe = candidates[0];
		const [tagA, tagB] = probe.tags;
		const query = probe.canonicalName.split(' ')[0];

		const both = searchContentIndex(index, { query, tagsAll: [tagA, tagB] });
		assert.equal(both.output.status, 'found');
		assert.ok(
			both.detail.every((d) => d.tags.includes(tagA) && d.tags.includes(tagB)),
			'every result must carry both requested tags',
		);

		const missingOne = searchContentIndex(index, {
			query,
			tagsAll: [tagA, 'EtiquetaInexistenteXYZ'],
		});
		assert.equal(missingOne.output.status, 'not_found');
		assert.equal(missingOne.output.results.length, 0);
	});

	test('the real query space stays deterministic across runs', { skip }, () => {
		const first = searchContentIndex(loadRealIndex(), { query: 'Mago' });
		const second = searchContentIndex(loadRealIndex(), { query: 'Mago' });
		assert.equal(JSON.stringify(first.output), JSON.stringify(second.output));
	});

	test('real corpus: Céfiro ranks its archetype root Sintonía Fluida first', { skip }, () => {
		const index = loadRealIndex();
		const { output, detail } = searchContentIndex(index, { query: 'Céfiro', limit: 50 });
		assert.equal(output.status, 'found');
		// Generic root rule (Arquetipo tag + arquetipo-nivel-1.yml path) must beat
		// the alphabetical tie: Foco del Escaramuzador would sort first by name.
		assert.equal(
			output.results[0].name,
			'Sintonía Fluida',
			`root must rank first, got ${output.results.map((r) => r.name).join(' | ')}`,
		);
		assert.ok(detail[0].path.endsWith('arquetipo-nivel-1.yml'), detail[0].path);
		assert.ok(detail[0].tags.includes('Arquetipo'), 'root card carries the Arquetipo tag');
		// The whole Céfiro set is preserved in the listing.
		const allCefiro = index.entries.filter((e) => e.kind === 'card' && e.tags.includes('Céfiro'));
		assert.ok(allCefiro.length >= 3, 'real corpus must hold several Céfiro cards');
		assert.equal(
			output.results.length,
			allCefiro.length,
			'every Céfiro card must stay in the listing',
		);
		assert.deepEqual(
			new Set(output.results.map((r) => r.name)),
			new Set(allCefiro.map((e) => e.canonicalName)),
		);
	});

	test(
		'real corpus: the root rule is generic — Coloso ranks Sintonía con el Acero first',
		{ skip },
		() => {
			const index = loadRealIndex();
			const colosoCards = index.entries.filter(
				(e) => e.kind === 'card' && e.tags.includes('Coloso'),
			);
			assert.ok(colosoCards.length >= 3, 'real corpus must hold several Coloso cards');
			const { output, detail } = searchContentIndex(index, { query: 'Coloso', limit: 50 });
			assert.equal(output.status, 'found');
			assert.equal(
				output.results[0].name,
				'Sintonía con el Acero',
				`Coloso root must rank first, got ${output.results.map((r) => r.name).join(' | ')}`,
			);
			assert.ok(detail[0].path.endsWith('arquetipo-nivel-1.yml'), detail[0].path);
			assert.equal(output.results.length, colosoCards.length, 'every Coloso card is kept');
		},
	);

	test(
		'real corpus: queries referenced by the routing evals keep their declared routes',
		{ skip },
		() => {
			const index = loadRealIndex();
			const routes: [string, string, string?][] = [
				['Afinidad Arcana', 'found', 'Afinidad Arcana'],
				['Arma Enriquecida', 'found', 'Arma Enriquecida'],
				['Adquirir Nueva Carta', 'found', 'Adquirir Nueva Carta'],
				['LS', 'not_found'],
				['poder misterioso antiguo prohibido', 'not_found'],
			];
			for (const [query, status, topName] of routes) {
				const { output } = searchContentIndex(index, { query });
				assert.equal(output.status, status, `${query} must route to ${status}`);
				if (topName) {
					assert.equal(output.results[0].name, topName, `${query} top-1`);
				} else if (query === 'LS') {
					assert.equal(output.results.length, 0, 'LS must not invent sources');
				} else {
					assert.ok(
						output.results.length > 0 && output.results.every((r) => r.confidence === 'low'),
						'insufficient-coverage query returns only low-confidence suggestions',
					);
				}
			}
			const cefiro = searchContentIndex(index, { query: 'Céfiro' });
			assert.equal(cefiro.output.status, 'found');
			assert.equal(cefiro.output.results[0].name, 'Sintonía Fluida');
		},
	);

	test(
		'real corpus: --type efecto reaches v3 cards whose tags do not carry "efecto"',
		{ skip },
		() => {
			const index = loadRealIndex();
			const effectCards = index.entries.filter(
				(e) => e.kind === 'card' && e.structured?.type === 'efecto' && !e.tags.includes('efecto'),
			);
			assert.ok(
				effectCards.length > 0,
				'real corpus must contain v3 efecto cards without the efecto tag',
			);
			const probe = effectCards[0].canonicalName;
			const { output } = searchContentIndex(index, { query: probe, types: ['efecto'] });
			assert.equal(output.status, 'found');
			assert.ok(
				output.results.some((r) => r.name === probe),
				`--type efecto must reach ${probe}, got ${output.results.map((r) => r.name).join(' | ')}`,
			);
		},
	);

	test('real corpus: --lineage Gigante finds Cíclope (v3 creature)', { skip }, () => {
		const index = loadRealIndex();
		const { output } = searchContentIndex(index, { query: 'Cíclope', lineage: 'Gigante' });
		assert.equal(output.status, 'found');
		assert.ok(
			output.results.some((r) => r.name === 'Cíclope'),
			`--lineage Gigante must reach Cíclope, got ${output.results.map((r) => r.name).join(' | ')}`,
		);
	});

	test('real corpus: structured mismatch does not fall back to tags', { skip }, () => {
		const index = loadRealIndex();
		const activable = index.entries.find(
			(e) => e.kind === 'card' && e.structured?.type === 'activable',
		);
		assert.ok(activable, 'real corpus must contain an activable v3 card');
		const probe = activable.canonicalName;
		const { output } = searchContentIndex(index, { query: probe, types: ['efecto'] });
		const names = output.results.map((r) => r.name);
		assert.ok(
			!names.includes(probe),
			`${probe} (structured.type=activable) must not match --type efecto, got ${names.join(' | ')}`,
		);
	});
});
