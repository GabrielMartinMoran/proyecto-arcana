import { describe, test } from 'node:test';
import assert from 'node:assert/strict';

import { buildContentEntryHash, type ContentIndexEntry } from '../src/types/content-index.js';
import { searchContentIndex } from '../src/scripts/cli/search/engine.js';
import { classifyIntention, type SearchIntention } from '../src/scripts/cli/search/intention.js';
import { analyzeQuery } from '../src/scripts/cli/search/normalize.js';
import type { SearchOptions } from '../src/scripts/cli/search/types.js';

/**
 * T7 intention parser.
 *
 * The intention is a query-level label (exact_entity | category_list |
 * semantic_search | manual_rule | ambiguous | insufficient) that the engine
 * computes deterministically from the normalized query plus the ranked
 * results. It is exposed only through the explain detail; the agent-facing
 * `output` projection stays minimal.
 */

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

const buildIndex = (): ContentIndexEntry[] => [
	makeEntry({
		kind: 'card',
		canonicalName: 'Pacto Supremo',
		id: 'id-pacto',
		slug: 'pacto-supremo',
		aliases: ['pacto supremo'],
		tags: ['Arcanista', 'Arquetipo', 'Brujo'],
		level: 1,
		path: 'references/cartas-de-habilidades/arquetipos/brujo/arquetipo-nivel-1.yml',
		source: 'cards.yml',
	}),
	makeEntry({
		kind: 'card',
		canonicalName: 'Canción de Poder',
		id: 'id-cancion',
		slug: 'cancion-de-poder',
		aliases: ['cancion de poder'],
		tags: ['Bardo'],
		level: 2,
		path: 'references/cartas-de-habilidades/bardo/nivel-2.yml',
		source: 'cards.yml',
	}),
	makeEntry({
		kind: 'card',
		canonicalName: 'Danza de los Cuchillos',
		id: 'id-danza',
		slug: 'danza-de-los-cuchillos',
		aliases: ['danza de los cuchillos'],
		tags: ['Bardo'],
		level: 3,
		path: 'references/cartas-de-habilidades/bardo/nivel-3.yml',
		source: 'cards.yml',
	}),
	makeEntry({
		kind: 'card',
		canonicalName: 'Mago',
		id: 'id-mago-card',
		slug: 'mago',
		aliases: ['mago'],
		tags: ['Mago'],
		level: 1,
		path: 'references/cartas-de-habilidades/mago/nivel-1.yml',
		source: 'cards.yml',
	}),
	makeEntry({
		kind: 'creature',
		canonicalName: 'Mago',
		id: 'id-mago-creature',
		slug: 'mago',
		aliases: ['mago'],
		tags: [],
		level: 2,
		heading: 'Mago',
		anchor: 'mago',
		path: 'references/bestiario/rango-2.md',
		source: 'bestiary.yml',
	}),
	makeEntry({
		kind: 'section',
		canonicalName: 'Ventaja',
		slug: '02-creacion-de-personajes-ventaja',
		aliases: ['ventaja'],
		tags: [],
		heading: 'Ventaja',
		anchor: 'ventaja',
		chapter: '2. Creación de Personajes',
		path: 'references/manual-del-jugador/02-creacion-de-personajes.md',
		source: 'player.md',
	}),
	makeEntry({
		kind: 'item',
		canonicalName: 'Arma Enriquecida',
		id: 'id-arma-enriquecida',
		slug: 'arma-enriquecida',
		aliases: ['arma enriquecida'],
		tags: ['Arma'],
		level: 2,
		path: 'references/objetos-magicos/nivel-2.yml',
		source: 'magical-items.yml',
		structured: { cardType: 'item', type: 'efecto', cost: '600' },
		search:
			'El arma está imbuida y enriquecida mágicamente para golpear con más certeza y hacer más daño.',
	}),
	makeEntry({
		kind: 'card',
		canonicalName: 'Afinidad Arcana',
		id: 'id-afinidad',
		slug: 'afinidad-arcana',
		aliases: ['afinidad arcana'],
		tags: ['Arcanista'],
		level: 1,
		path: 'references/cartas-de-habilidades/arcanista/nivel-1.yml',
		source: 'cards.yml',
		structured: { cardType: 'ability', type: 'efecto' },
		search:
			'Tienes acceso a la lista de cartas de Arcanista y usas tu Atributo Arcano para los requerimientos y efectos de estas.',
	}),
	makeEntry({
		kind: 'section',
		canonicalName: 'Adquirir Nueva Carta',
		slug: '09-progresion-adquirir-nueva-carta',
		aliases: ['adquirir nueva carta'],
		tags: [],
		heading: 'Adquirir Nueva Carta',
		anchor: 'adquirir-nueva-carta',
		chapter: '9. Progresión del Personaje',
		path: 'references/manual-del-jugador/09-progresion-del-personaje.md',
		source: 'player.md',
		search:
			'Para adquirir una nueva carta al subir de nivel debes gastar PP; el coste depende del Nivel de la carta.',
	}),
	makeEntry({
		kind: 'creature',
		canonicalName: 'Cíclope',
		id: 'id-ciclope',
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

const search = (options: SearchOptions) => searchContentIndex({ entries: buildIndex() }, options);

const intentionOf = (options: SearchOptions): SearchIntention => {
	const { detail } = search(options);
	return detail[0]?.intention ?? 'insufficient';
};

describe('T7 intention classification (engine detail)', () => {
	test('exact entity queries resolve to exact_entity', () => {
		assert.equal(intentionOf({ query: 'Pacto Supremo' }), 'exact_entity');
		assert.equal(intentionOf({ query: 'Cíclope' }), 'exact_entity');
	});

	test('prefix entity queries resolve to exact_entity', () => {
		assert.equal(intentionOf({ query: 'pacto sup' }), 'exact_entity');
	});

	test('controlled fuzzy typos of an entity resolve to exact_entity', () => {
		assert.equal(intentionOf({ query: 'ciclpe' }), 'exact_entity');
	});

	test('category and listing queries resolve to category_list', () => {
		assert.equal(intentionOf({ query: 'Bardo' }), 'category_list');
		assert.equal(intentionOf({ query: 'Brujo', kind: 'card' }), 'category_list');
	});

	test('body-evidence semantic queries resolve to semantic_search', () => {
		assert.equal(intentionOf({ query: 'cómo imbuir un arma con magia' }), 'semantic_search');
		assert.equal(
			intentionOf({ query: 'atributo de lanzamiento arcanista Mente' }),
			'semantic_search',
		);
	});

	test('manual/rule queries targeting sections resolve to manual_rule', () => {
		assert.equal(intentionOf({ query: 'qué es Ventaja' }), 'manual_rule');
		assert.equal(
			intentionOf({ query: 'cuánto cuesta adquirir una carta al subir de nivel' }),
			'manual_rule',
		);
	});

	test('ambiguous queries resolve to ambiguous', () => {
		assert.equal(intentionOf({ query: 'Mago' }), 'ambiguous');
	});

	test('not found / insufficient queries resolve to insufficient', () => {
		assert.equal(intentionOf({ query: 'Zzznope' }), 'insufficient');
		assert.equal(intentionOf({ query: '' }), 'insufficient');
	});
});

describe('intention exposure', () => {
	test('the explain detail carries intention per result', () => {
		const { detail } = search({ query: 'Pacto Supremo' });
		assert.equal(detail[0].intention, 'exact_entity');
	});

	test('the agent-facing output stays minimal: no intention key', () => {
		const { output } = search({ query: 'Pacto Supremo' });
		assert.deepEqual(Object.keys(output).sort(), ['nextAction', 'results', 'status']);
		assert.ok(!('intention' in output));
		assert.ok(!('intention' in output.results[0]));
	});
});

describe('classifyIntention unit mapping', () => {
	test('status-level mapping: ambiguous/not_found/invalid are direct', () => {
		const empty = { terms: [] as string[], folded: '', phrase: '' };
		const q = analyzeQuery('algo');
		assert.equal(classifyIntention(q, 'ambiguous', []), 'ambiguous');
		assert.equal(classifyIntention(q, 'not_found', []), 'insufficient');
		assert.equal(classifyIntention(q, 'invalid_query', []), 'insufficient');
		assert.equal(classifyIntention(empty, 'found', []), 'insufficient');
	});
});
