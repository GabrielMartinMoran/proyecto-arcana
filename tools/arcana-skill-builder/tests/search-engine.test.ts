import { describe, test } from 'node:test';
import assert from 'node:assert/strict';

import { buildContentEntryHash, type ContentIndexEntry } from '../src/types/content-index.js';
import { searchContentIndex } from '../src/scripts/cli/search/engine.js';
import type { SearchOptions } from '../src/scripts/cli/search/types.js';

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
	// --- Céfiro archetype (T8b): root + regular cards, realistic v3 paths ---
	makeEntry({
		kind: 'card',
		canonicalName: 'Sintonía Fluida',
		id: 'id-sintonia',
		slug: 'sintonia-fluida',
		aliases: ['sintonia fluida'],
		tags: ['Arquetipo', 'Céfiro', 'Combatiente'],
		level: 1,
		path: 'references/cartas-de-habilidades/arquetipos/cefiro/arquetipo-nivel-1.yml',
		source: 'cards.yml',
	}),
	makeEntry({
		kind: 'card',
		canonicalName: 'Foco del Escaramuzador',
		id: 'id-foco',
		slug: 'foco-del-escaramuzador',
		aliases: ['foco del escaramuzador'],
		tags: ['Céfiro'],
		level: 1,
		path: 'references/cartas-de-habilidades/arquetipos/cefiro/nivel-1.yml',
		source: 'cards.yml',
	}),
	makeEntry({
		kind: 'card',
		canonicalName: 'Precisión Letal',
		id: 'id-precision',
		slug: 'precision-letal',
		aliases: ['precision letal'],
		tags: ['Céfiro'],
		level: 2,
		path: 'references/cartas-de-habilidades/arquetipos/cefiro/nivel-2.yml',
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
		kind: 'item',
		canonicalName: 'Amuleto de Protección',
		id: 'id-amuleto',
		slug: 'amuleto-de-proteccion',
		aliases: ['amuleto de proteccion'],
		tags: ['Utilidad'],
		level: 3,
		path: 'references/objetos-magicos/nivel-3.yml',
		source: 'magical-items.yml',
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
	makeEntry({
		kind: 'creature',
		canonicalName: 'Liche',
		id: 'id-liche',
		slug: 'liche',
		aliases: ['liche'],
		tags: [],
		level: 6,
		heading: 'Liche',
		anchor: 'liche',
		path: 'references/bestiario/rango-6.md',
		source: 'bestiary.yml',
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
		kind: 'section',
		canonicalName: 'Ayuda, Ventaja y Desventaja',
		slug: '03-mecanicas-de-juego-ayuda-ventaja-y-desventaja',
		aliases: ['ayuda ventaja y desventaja'],
		tags: [],
		heading: 'Ayuda, Ventaja y Desventaja',
		anchor: 'ayuda-ventaja-y-desventaja',
		chapter: '3. Mecánicas de Juego',
		path: 'references/manual-del-jugador/03-mecanicas-de-juego.md',
		source: 'player.md',
	}),
];

const search = (options: SearchOptions) => searchContentIndex({ entries: buildIndex() }, options);

// --- Structured v3 fixtures (F2): mixed v3 + legacy entries ------------------

const structuredIndex = (): ContentIndexEntry[] => [
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
		search: 'Tienes acceso a la lista de cartas de Arcanista y usas tu Atributo Arcano.',
	}),
	makeEntry({
		kind: 'card',
		canonicalName: 'Bendición Menor',
		id: 'id-bendicion',
		slug: 'bendicion-menor',
		aliases: ['bendicion menor'],
		tags: ['Clérigo', 'efecto'],
		level: 1,
		path: 'references/cartas-de-habilidades/clerigo/nivel-1.yml',
		source: 'cards.yml',
		structured: { cardType: 'ability', type: 'activable' },
		search: 'Invocas una pequeña luz que protege a un aliado.',
	}),
	makeEntry({
		kind: 'card',
		canonicalName: 'Amuleto de Protección',
		id: 'id-amuleto',
		slug: 'amuleto-de-proteccion',
		aliases: ['amuleto de proteccion'],
		tags: ['Utilidad'],
		level: 3,
		path: 'references/objetos-magicos/nivel-3.yml',
		source: 'magical-items.yml',
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
		anchor: 'ciclope',
		path: 'references/bestiario/rango-4.md',
		source: 'bestiary.yml',
		structured: { lineage: 'Gigante' },
		search: 'Un gigante de un solo ojo que lanza rocas.',
	}),
	makeEntry({
		kind: 'creature',
		canonicalName: 'Liche',
		id: 'id-liche',
		slug: 'liche',
		aliases: ['liche'],
		tags: ['No Muerto'],
		level: 6,
		heading: 'Liche',
		anchor: 'liche',
		path: 'references/bestiario/rango-6.md',
		source: 'bestiary.yml',
	}),
];

const structuredSearch = (options: SearchOptions) =>
	searchContentIndex({ entries: structuredIndex() }, options);

describe('global lexical search engine', () => {
	test('exact query resolves Pacto Supremo to its canonical slug', () => {
		const { output } = search({ query: 'Pacto Supremo' });
		assert.equal(output.status, 'found');
		assert.ok(output.results.length >= 1);
		assert.equal(output.results[0].name, 'Pacto Supremo');
		assert.equal(output.results[0].kind, 'card');
		assert.equal(output.results[0].confidence, 'high');
		const detail = search({ query: 'Pacto Supremo' }).detail[0];
		assert.equal(detail.slug, 'pacto-supremo');
		assert.equal(detail.matchType, 'exact');
	});

	test('diacritics: "ciclope" and "Cíclope" resolve to the same entity and output', () => {
		const lower = search({ query: 'ciclope' });
		const accented = search({ query: 'Cíclope' });
		assert.equal(lower.output.status, 'found');
		assert.equal(lower.output.results[0].name, 'Cíclope');
		assert.equal(accented.output.results[0].name, 'Cíclope');
		assert.equal(
			JSON.stringify(lower.output),
			JSON.stringify(accented.output),
			'both queries must produce byte-identical agent output',
		);
		assert.equal(lower.output.results[0].source, 'references/bestiario/rango-4.md#cíclope');
	});

	test('manual section: "qué es Ventaja" finds the Ventaja section first', () => {
		const { output, detail } = search({ query: 'qué es Ventaja' });
		assert.equal(output.status, 'found');
		assert.equal(output.results[0].kind, 'section');
		assert.equal(output.results[0].name, 'Ventaja');
		assert.equal(detail[0].matchType, 'exact');
		assert.equal(
			output.results[0].source,
			'references/manual-del-jugador/02-creacion-de-personajes.md#ventaja',
		);
	});

	test('creature: "Liche" resolves without knowing its range', () => {
		const { output } = search({ query: 'Liche' });
		assert.equal(output.status, 'found');
		assert.equal(output.results[0].kind, 'creature');
		assert.equal(output.results[0].name, 'Liche');
		assert.equal(output.results[0].source, 'references/bestiario/rango-6.md#liche');
	});

	test('prefix query "pacto sup" still ranks Pacto Supremo first', () => {
		const { output, detail } = search({ query: 'pacto sup' });
		assert.equal(output.status, 'found');
		assert.equal(output.results[0].name, 'Pacto Supremo');
		assert.equal(detail[0].matchType, 'prefix');
	});

	test('structured filters are applied before ranking and exclude non-matches', () => {
		const byKindAndTag = search({ query: 'Canción', kind: 'card', tagsAll: ['Bardo'], level: 2 });
		assert.equal(byKindAndTag.output.status, 'found');
		assert.deepEqual(
			byKindAndTag.output.results.map((r) => r.name),
			['Canción de Poder'],
		);

		const bySource = search({ query: 'Liche', source: 'bestiary.yml' });
		assert.equal(bySource.output.results[0].source, 'references/bestiario/rango-6.md#liche');

		const byTier = search({ query: 'Liche', tier: 6 });
		assert.equal(byTier.output.status, 'found');
		assert.equal(byTier.output.results[0].name, 'Liche');

		const excluded = search({ query: 'Pacto', kind: 'item' });
		assert.equal(excluded.output.status, 'not_found');
		assert.equal(excluded.output.results.length, 0);
	});

	test('multi-level filter: level [2, 3] keeps only cards at those levels', () => {
		const { output } = search({ query: 'Bardo', kind: 'card', level: [2, 3] });
		assert.equal(output.status, 'found');
		assert.deepEqual(
			new Set(output.results.map((r) => r.name)),
			new Set(['Canción de Poder', 'Danza de los Cuchillos']),
		);
	});

	test('multi-level filter: level [3] excludes cards at other levels', () => {
		const { output } = search({ query: 'Bardo', kind: 'card', level: [3] });
		assert.equal(output.status, 'found');
		assert.deepEqual(
			output.results.map((r) => r.name),
			['Danza de los Cuchillos'],
		);
	});

	test('single-level filter stays compatible as a scalar', () => {
		const { output } = search({ query: 'Bardo', kind: 'card', level: 2 });
		assert.equal(output.status, 'found');
		assert.deepEqual(
			output.results.map((r) => r.name),
			['Canción de Poder'],
		);
	});

	test('tagsAll requires every requested tag (AND semantics)', () => {
		const both = search({ query: 'Pacto', tagsAll: ['Arcanista', 'Brujo'] });
		assert.equal(both.output.status, 'found');
		assert.deepEqual(
			both.output.results.map((r) => r.name),
			['Pacto Supremo'],
		);

		const missingOne = search({ query: 'Pacto', tagsAll: ['Arcanista', 'Inexistente'] });
		assert.equal(missingOne.output.status, 'not_found');
		assert.equal(missingOne.output.results.length, 0);
	});

	test('types keeps its best-effort (any-tag) semantics while tagsAll is strict', () => {
		const byType = search({ query: 'Pacto', types: ['Arquetipo', 'Inexistente'] });
		assert.equal(byType.output.status, 'found');
		assert.equal(byType.output.results[0].name, 'Pacto Supremo');
	});

	test('type/lineage filters act as best-effort metadata filters (legacy entries fall back to tags)', () => {
		const byTagLikeType = search({ query: 'Amuleto', type: 'Utilidad' });
		assert.equal(byTagLikeType.output.status, 'found');
		assert.equal(byTagLikeType.output.results[0].name, 'Amuleto de Protección');

		// These fixtures carry no structured fields, so lineage falls back to
		// tags; Liche has no tag either, so a lineage filter yields no source.
		const byLineage = search({ query: 'Liche', lineage: 'No Muerto' });
		assert.equal(byLineage.output.status, 'not_found');
	});

	test('controlled fuzzy: "ciclpe" returns Cíclope as a medium-confidence suggestion', () => {
		const { output, detail } = search({ query: 'ciclpe' });
		assert.equal(output.status, 'found');
		assert.equal(output.results[0].name, 'Cíclope');
		assert.equal(output.results[0].confidence, 'medium');
		assert.equal(detail[0].matchType, 'fuzzy');
		assert.ok(detail[0].score < 80, 'fuzzy must not receive high-confidence scoring');
	});

	test('fuzzy is not a first-class matcher: exact query still outranks a fuzzy look-alike', () => {
		const { output } = search({ query: 'Liche' });
		assert.equal(output.results[0].name, 'Liche');
		assert.equal(output.results[0].confidence, 'high');
	});

	test('fuzzy is disabled for short queries', () => {
		const { output } = search({ query: 'zzx' });
		assert.equal(output.status, 'not_found');
	});

	test('ambiguous: "Mago" surfaces the best alternatives from different families', () => {
		const { output } = search({ query: 'Mago' });
		assert.equal(output.status, 'ambiguous');
		assert.ok(output.results.length >= 2 && output.results.length <= 3);
		const kinds = new Set(output.results.map((r) => r.kind));
		assert.ok(kinds.has('card'));
		assert.ok(kinds.has('creature'));
	});

	test('category ties (multiple cards sharing a tag) are a listing, not ambiguity', () => {
		const { output } = search({ query: 'Bardo', kind: 'card' });
		assert.equal(output.status, 'found', 'a tag category queried directly is a listing');
		assert.ok(output.results.length >= 2, 'all ordered references are returned');
		assert.ok(output.results.every((r, i) => r.rank === i + 1));
		assert.deepEqual(
			new Set(output.results.map((r) => r.name).slice(0, 2)),
			new Set(['Canción de Poder', 'Danza de los Cuchillos']),
		);
	});

	test('category query "Céfiro" ranks the archetype root first and keeps every card', () => {
		const { output, detail } = search({ query: 'Céfiro', kind: 'card' });
		assert.equal(output.status, 'found');
		// The root (Sintonía Fluida) is identified by the generic Arquetipo-tag +
		// arquetipo-nivel-1.yml rule, not by alphabetical order (Foco del
		// Escaramuzador would win alphabetically).
		assert.equal(output.results[0].name, 'Sintonía Fluida');
		assert.equal(output.results[0].confidence, 'medium');
		assert.equal(
			detail[0].path,
			'references/cartas-de-habilidades/arquetipos/cefiro/arquetipo-nivel-1.yml',
		);
		// The full listing is preserved: no card of the set is dropped.
		assert.equal(output.results.length, 3);
		assert.deepEqual(
			new Set(output.results.map((r) => r.name)),
			new Set(['Sintonía Fluida', 'Foco del Escaramuzador', 'Precisión Letal']),
		);
		assert.ok(output.results.every((r, i) => r.rank === i + 1));
		assert.match(output.nextAction, /siguiente/);
	});

	test('not_found returns no invented sources', () => {
		const { output } = search({ query: 'zzzzz' });
		assert.equal(output.status, 'not_found');
		assert.equal(output.results.length, 0);
	});

	test('invalid_query for empty or stop-word-only queries', () => {
		assert.equal(search({ query: '' }).output.status, 'invalid_query');
		assert.equal(search({ query: '   ' }).output.status, 'invalid_query');
		assert.equal(search({ query: 'de la' }).output.status, 'invalid_query');
	});

	test('stable ordering: identical input yields byte-identical output and detail', () => {
		const first = search({ query: 'Mago' });
		const second = search({ query: 'Mago' });
		assert.equal(JSON.stringify(first.output), JSON.stringify(second.output));
		assert.equal(JSON.stringify(first.detail), JSON.stringify(second.detail));
	});

	test('agent-facing projection is minimal by default', () => {
		const { output } = search({ query: 'Liche' });
		assert.deepEqual(Object.keys(output).sort(), ['nextAction', 'results', 'status']);
		assert.deepEqual(Object.keys(output.results[0]).sort(), [
			'confidence',
			'kind',
			'name',
			'rank',
			'source',
		]);
	});

	test('explain keeps rich detail for tests and maintenance', () => {
		const { detail } = search({ query: 'Pacto Supremo', explain: true });
		const top = detail[0];
		assert.ok(typeof top.score === 'number');
		assert.ok(top.matchedFields.includes('name'));
		assert.equal(top.slug, 'pacto-supremo');
	});

	test('result ordering keeps all references so the agent can continue with the next one', () => {
		const { output } = search({ query: 'Ventaja' });
		assert.equal(output.status, 'found');
		assert.ok(output.results.length >= 2, 'found query must return ordered alternatives');
		assert.ok(output.results.every((r, i) => r.rank === i + 1));
		assert.match(output.nextAction, /siguiente/);
	});
});

describe('structured v3 filters flow through the engine (F2)', () => {
	test('--type efecto finds a v3 card even though its tags do not carry "efecto"', () => {
		const { output } = structuredSearch({ query: 'Afinidad', types: ['efecto'] });
		assert.equal(output.status, 'found');
		assert.deepEqual(
			output.results.map((r) => r.name),
			['Afinidad Arcana'],
		);
	});

	test('--lineage Gigante finds the v3 creature Cíclope', () => {
		const { output } = structuredSearch({ query: 'Cíclope', lineage: 'Gigante' });
		assert.equal(output.status, 'found');
		assert.deepEqual(
			output.results.map((r) => r.name),
			['Cíclope'],
		);
	});

	test('mismatched structured.type does not fall back to tags', () => {
		// Bendición Menor carries the tag "efecto" but its structured.type is
		// "activable": the v3 field is authoritative, so the entry is excluded
		// before ranking even though its text matches the query.
		const { output } = structuredSearch({ query: 'Bendición', types: ['efecto'] });
		assert.equal(output.status, 'not_found');
		assert.equal(output.results.length, 0);
	});

	test('mismatched structured.lineage does not fall back to tags', () => {
		const { output } = structuredSearch({ query: 'Cíclope', lineage: 'Dragón' });
		assert.equal(output.status, 'not_found');
		assert.equal(output.results.length, 0);
	});

	test('legacy entries without structured use the tag fallback for types and lineage', () => {
		const byType = structuredSearch({ query: 'Amuleto', types: ['Utilidad'] });
		assert.deepEqual(
			byType.output.results.map((r) => r.name),
			['Amuleto de Protección'],
		);
		const byLineage = structuredSearch({ query: 'Liche', lineage: 'No Muerto' });
		assert.deepEqual(
			byLineage.output.results.map((r) => r.name),
			['Liche'],
		);
	});

	test('types keeps best-effort ANY semantics over the structured field', () => {
		const { output } = structuredSearch({
			query: 'Afinidad',
			types: ['activable', 'efecto', 'Inexistente'],
		});
		assert.equal(output.status, 'found');
		assert.equal(output.results[0].name, 'Afinidad Arcana');
	});

	test('agent-facing projection stays minimal with structured filters applied', () => {
		const { output } = structuredSearch({ query: 'Cíclope', lineage: 'Gigante' });
		assert.deepEqual(Object.keys(output).sort(), ['nextAction', 'results', 'status']);
		assert.deepEqual(Object.keys(output.results[0]).sort(), [
			'confidence',
			'kind',
			'name',
			'rank',
			'source',
		]);
	});
});
