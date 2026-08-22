import { describe, test } from 'node:test';
import assert from 'node:assert/strict';

import { buildContentEntryHash, type ContentIndexEntry } from '../src/types/content-index.js';
import { searchContentIndex } from '../src/scripts/cli/search/engine.js';
import type { SearchOptions } from '../src/scripts/cli/search/types.js';

/**
 * T6 evidence-aware deterministic ranking.
 *
 * These fixtures mirror the real ARCANA wording (v3 `search`/`structured`
 * evidence) so the unit tests assert the semantic acceptance without touching
 * static/docs (read-only real-corpus coverage lives in search-real-corpus.test.ts).
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
	// --- Cards ---
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
		structured: {
			cardType: 'ability',
			type: 'efecto',
			requirements: 'Estudios Mágicos | Pacto Supremo | Herencia Sobrenatural',
		},
		search:
			'_La magia no es un misterio para ti, sino una herramienta, un pacto o un derecho de nacimiento._' +
			'Tienes acceso a la lista de cartas de _Arcanista_ y usas tu Atributo Arcano para los requerimientos y efectos de estas.',
	}),
	makeEntry({
		kind: 'card',
		canonicalName: 'Arma del Pacto',
		id: 'id-arma-pacto',
		slug: 'arma-del-pacto',
		aliases: ['arma del pacto'],
		tags: ['Brujo'],
		level: 1,
		path: 'references/cartas-de-habilidades/brujo/nivel-1.yml',
		source: 'cards.yml',
		structured: { cardType: 'ability', type: 'efecto', requirements: 'Pacto Supremo' },
		search:
			'_Materializas un arma forjada con energía inestable, atada eternamente a tu voluntad._',
	}),
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
		structured: { cardType: 'ability', type: 'efecto' },
		search: 'Firmas un pacto que te concede acceso a la lista de conjuros de tu patrón.',
	}),
	// A card whose name/body share the generic term "pacto" but do NOT resolve
	// the second query term. Its body must not double-count the identity term.
	makeEntry({
		kind: 'card',
		canonicalName: 'Pacto Oscuro',
		id: 'id-pacto-oscuro',
		slug: 'pacto-oscuro',
		aliases: ['pacto oscuro'],
		tags: [],
		level: 1,
		path: 'references/cartas-de-habilidades/brujo/nivel-1.yml',
		source: 'cards.yml',
		structured: { cardType: 'ability', type: 'efecto' },
		search: 'Un pacto oscuro sellado con sangre que corrompe al portador.',
	}),
	// A generic card that shares only the word "Arma" at the name level.
	makeEntry({
		kind: 'card',
		canonicalName: 'Golpe Brutal',
		id: 'id-golpe',
		slug: 'golpe-brutal',
		aliases: ['golpe brutal'],
		tags: ['Arma'],
		level: 1,
		path: 'references/cartas-de-habilidades/guerrero/nivel-1.yml',
		source: 'cards.yml',
		structured: { cardType: 'ability', type: 'efecto' },
		search: 'Canalizas toda tu fuerza en un golpe devastador.',
	}),
	// --- Items ---
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
			'Esta propiedad se puede aplicar a cualquier arma. El arma está imbuida y enriquecida ' +
			'mágicamente para golpear con más certeza y hacer más daño. Obtienes un +1 a tus tiradas ' +
			'de ataque y +1 al daño infligido con esta arma.',
	}),
	// Short-token false positive probes: name/tags contain the substring "ls".
	makeEntry({
		kind: 'item',
		canonicalName: 'Bálsamo Natural',
		id: 'id-balsamo',
		slug: 'balsamo-natural',
		aliases: ['balsamo natural'],
		tags: ['Utilidad'],
		level: 1,
		path: 'references/objetos-magicos/nivel-1.yml',
		source: 'magical-items.yml',
		search: 'Un bálsamo que sella heridas superficiales y calma el dolor.',
	}),
	// --- Creatures ---
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
		search: 'Un gigante de un solo ojo que aplasta a sus enemigos con su fuerza bruta.',
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
		search: 'Un no muerto de inmenso poder arcano que regresa desde su filacteria.',
	}),
	// --- Manual sections ---
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
			'Añadir una nueva carta a tu **Colección** expande tu repertorio de habilidades pasivas y activables. ' +
			'El coste depende del poder de la carta, indicado por su Nivel.\n\n' +
			'| Nivel de la Carta | Coste en PP |\n' +
			'| Nivel 1 | 3 PP |\n| Nivel 2 | 5 PP |\n| Nivel 3 | 8 PP |',
	}),
	makeEntry({
		kind: 'section',
		canonicalName: 'Gastar Puntos de Progreso (PP)',
		slug: '10-downtime-gastar-puntos-de-progreso',
		aliases: ['gastar puntos de progreso pp'],
		tags: [],
		heading: 'Gastar Puntos de Progreso (PP)',
		anchor: 'gastar-puntos-de-progreso-pp',
		chapter: '10. Tiempo Entre Aventuras',
		path: 'references/manual-del-jugador/10-tiempo-entre-aventuras.md',
		source: 'player.md',
		search:
			'Es durante estos períodos que podés gastar tus PP acumulados para comprar nuevas cartas para tu ' +
			'**Colección** o para **mejorar un Atributo**.',
	}),
];

const search = (options: SearchOptions) => searchContentIndex({ entries: buildIndex() }, options);

const topNames = (options: SearchOptions): string[] =>
	search(options).output.results.map((r) => r.name);

describe('T6 content lane: semantic evidence ranking', () => {
	test('"cómo imbuir un arma con magia" ranks Arma Enriquecida by body evidence', () => {
		// Literal Gherkin query (@arcana-reference @semantic @items). The query
		// verb "imbuir" only reaches the index through the participle "imbuida",
		// and "magia" through the adverb "mágicamente": this is the T6 morphology
		// gap that the former `arma imbuida imbuir magia` test used to hide.
		const { output, detail } = search({ query: 'cómo imbuir un arma con magia' });
		assert.equal(output.status, 'found');
		assert.equal(output.results[0].name, 'Arma Enriquecida');
		assert.notEqual(output.results[0].name, 'Arma del Pacto');
		// Evidence must come from the content lane (body), not generic name only:
		// "imbuir" and "magia" can only be matched through the v3 body text after
		// controlled morphological normalization (imbuida / mágicamente).
		assert.notEqual(detail[0].lane, 'identity', 'top result must use content evidence');
		assert.ok(
			detail[0].matchedTerms.includes('imbuir'),
			'query verb "imbuir" must be matched via body evidence',
		);
		assert.ok(
			detail[0].matchedTerms.includes('magia'),
			'query noun "magia" must be matched via body evidence',
		);
		assert.ok(detail[0].coverage >= 0.5, 'multi-term query needs at least half coverage');
		// The generic name-only card (Golpe Brutal) must not displace the evidence.
		assert.ok(
			output.results.every((r, i) => i === 0 || r.name !== 'Golpe Brutal'),
			'generic word-match cards stay below the evidence-leading result',
		);
	});

	test('"atributo de lanzamiento arcanista Mente" puts Afinidad Arcana in the top-k', () => {
		const { output } = search({ query: 'atributo de lanzamiento arcanista Mente' });
		assert.equal(output.status, 'found');
		const names = output.results.slice(0, 3).map((r) => r.name);
		assert.ok(names.includes('Afinidad Arcana'), `Afinidad Arcana must be in top-k, got ${names}`);
		// Must not rely solely on the tag "Arcanista": body evidence counts too.
		const detail = search({ query: 'atributo de lanzamiento arcanista Mente' }).detail;
		const afinidad = detail.find((r) => r.name === 'Afinidad Arcana');
		assert.ok(afinidad, 'Afinidad detail present');
		assert.ok(
			afinidad!.matchedTerms.includes('atributo'),
			'body term "atributo" must be matched via content evidence',
		);
	});

	test('cost/progression query puts Adquirir Nueva Carta in the top-k', () => {
		const { output } = search({ query: 'cuánto cuesta adquirir una carta al subir de nivel' });
		assert.equal(output.status, 'found');
		const names = output.results.slice(0, 3).map((r) => r.name);
		assert.ok(
			names.includes('Adquirir Nueva Carta'),
			`Adquirir Nueva Carta must be in top-k, got ${names}`,
		);
	});

	test('low coverage: a 4-term query matching one generic term is not reliably found', () => {
		const { output, detail } = search({ query: 'arma fuego sombra rayo' });
		// Only "arma" matches (1/4), and only via generic name/tag — coverage gate must
		// keep this from being a reliable found.
		assert.equal(output.status, 'not_found', '1/4 generic coverage must not be found');
		// Useful suggestions are retained as low-confidence results, not discarded.
		assert.ok(output.results.length >= 1, 'suggestions must still be returned');
		assert.ok(
			output.results.every((r) => r.confidence === 'low'),
			'below-coverage suggestions must be low confidence only',
		);
		assert.ok(
			detail.every((r) => r.coverage < 0.5),
			'all top-k results stay below coverage',
		);
	});

	test('a body re-mentioning an identity term does not overtake the full-identity match', () => {
		const { output, detail } = search({ query: 'pacto sup' });
		assert.equal(output.status, 'found');
		assert.equal(output.results[0].name, 'Pacto Supremo');
		// Pacto Oscuro shares "pacto" (identity + body) but does not resolve "sup":
		// its body evidence must not double-count the already-resolved term.
		const oscuro = detail.find((r) => r.name === 'Pacto Oscuro');
		assert.ok(oscuro, 'Pacto Oscuro must still be returned as a candidate');
		assert.ok(oscuro!.unmatchedTerms.includes('sup'), '"sup" stays unmatched for Pacto Oscuro');
	});

	test('exact entity matches remain rank 1 with high confidence', () => {
		for (const name of ['Pacto Supremo', 'Liche', 'Cíclope']) {
			// Build a focused single-entry index to avoid ambiguity noise.
			const solo = searchContentIndex(
				{ entries: [buildIndex().find((e) => e.canonicalName === name)!] },
				{ query: name },
			);
			assert.equal(solo.output.status, 'found', `${name} must be found`);
			assert.equal(solo.output.results[0].name, name);
			assert.equal(solo.output.results[0].confidence, 'high', `${name} must be high confidence`);
		}
	});

	test('controlled typo "Cíclope" still resolves via fuzzy at medium confidence', () => {
		const solo = searchContentIndex(
			{ entries: [buildIndex().find((e) => e.canonicalName === 'Cíclope')!] },
			{ query: 'ciclpe' },
		);
		assert.equal(solo.output.status, 'found');
		assert.equal(solo.output.results[0].name, 'Cíclope');
		assert.equal(solo.output.results[0].confidence, 'medium');
	});

	test('category listing (filtered tag) is preserved as a found listing', () => {
		const { output } = search({ query: 'Brujo', kind: 'card' });
		assert.equal(output.status, 'found');
		assert.ok(output.results.length >= 2);
		assert.deepEqual(
			new Set(output.results.map((r) => r.name)),
			new Set(['Arma del Pacto', 'Pacto Supremo']),
		);
	});

	test('LS does not substring-match inside bálsamo/bolsa/pulso words', () => {
		const { output } = search({ query: 'LS' });
		assert.equal(output.status, 'not_found');
		assert.equal(output.results.length, 0);
		const names = topNames({ query: 'Bálsamo' });
		// Sanity: the balsam item itself is still reachable through its own terms.
		assert.ok(names.includes('Bálsamo Natural'));
	});

	test('explain exposes coverage, unmatchedTerms, lane and matchedTerms; plain output stays minimal', () => {
		const detail = search({ query: 'cómo imbuir un arma con magia', explain: true }).detail;
		const top = detail[0];
		assert.ok(typeof top.coverage === 'number');
		assert.ok(Array.isArray(top.unmatchedTerms));
		assert.ok(typeof top.lane === 'string');
		assert.ok(Array.isArray(top.matchedTerms));

		const plain = search({ query: 'cómo imbuir un arma con magia' });
		assert.deepEqual(Object.keys(plain.output).sort(), ['nextAction', 'results', 'status']);
		assert.deepEqual(Object.keys(plain.output.results[0]).sort(), [
			'confidence',
			'kind',
			'name',
			'rank',
			'source',
		]);
	});

	test('deterministic byte-to-byte ranking across runs', () => {
		const first = search({ query: 'cómo imbuir un arma con magia' });
		const second = search({ query: 'cómo imbuir un arma con magia' });
		assert.equal(JSON.stringify(first.output), JSON.stringify(second.output));
		assert.equal(JSON.stringify(first.detail), JSON.stringify(second.detail));
	});
});
