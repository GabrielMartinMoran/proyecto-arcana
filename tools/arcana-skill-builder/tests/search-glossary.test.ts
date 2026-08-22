import { describe, test } from 'node:test';
import assert from 'node:assert/strict';

import { buildContentEntryHash, type ContentIndexEntry } from '../src/types/content-index.js';
import { searchContentIndex } from '../src/scripts/cli/search/engine.js';
import { acronymExpansionTerms, isAmbiguousAcronym } from '../src/scripts/cli/search/glossary.js';
import { toLemma } from '../src/scripts/cli/search/morphology.js';
import type { SearchOptions } from '../src/scripts/cli/search/types.js';

/**
 * T7 canonical acronym glossary + bounded normalization variants.
 *
 * Acronyms (PP, PPF, LS) are only interpreted through a corpus-verified
 * glossary: PP expands to "puntos de progreso", PPF is deliberately ambiguous,
 * and LS has no entry (never invented, never expanded). Normalization adds the
 * bounded variants costo/coste, gasto/gastar and controlled singular/plural
 * without aggressive stemming or collisions (mago stays distinct from magia).
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
			'Es durante estos períodos que podés gastar tus PP acumulados para comprar nuevas cartas.',
	}),
	makeEntry({
		kind: 'section',
		canonicalName: 'Puntos de Perfil (PPF)',
		slug: '08-parte-2-puntos-de-perfil',
		aliases: ['puntos de perfil ppf'],
		tags: [],
		heading: 'Puntos de Perfil (PPF)',
		anchor: 'puntos-de-perfil-ppf',
		chapter: '8. Diseño Avanzado de Criaturas',
		path: 'references/manual-del-director/08-parte-2-diseno-avanzado-de-criaturas.md',
		source: 'gm.md',
		search:
			'Cada Rango de Monstruo tiene un presupuesto de PPF para comprar estadísticas y rasgos.',
	}),
	// QA regression: a PPF section whose title starts with "A." (mirrors the
	// real corpus "A. Habilidades de Sabor (Coste: 0 PPF)"). Under the old raw
	// prefix rule, `pp` matched the `ppf` token inside its title and the
	// alphabetical tie-break pushed it above the canonical PP section.
	makeEntry({
		kind: 'section',
		canonicalName: 'A. Habilidades de Sabor (Coste: 0 PPF)',
		slug: '08-parte-2-a-habilidades-de-sabor-coste-0-ppf',
		aliases: ['a habilidades de sabor coste 0 ppf'],
		tags: [],
		heading: 'A. Habilidades de Sabor (Coste: 0 PPF)',
		anchor: 'a-habilidades-de-sabor-coste-0-ppf',
		chapter: '8. Diseño Avanzado de Criaturas',
		path: 'references/manual-del-director/08-parte-2-diseno-avanzado-de-criaturas.md',
		source: 'gm.md',
		search: 'Permite comprar rasgos que se activan fuera de combate con PPF.',
	}),
	// GM-side canonical expansion: "Otorgar Puntos de Progreso (PP)" is the
	// director-facing twin of the player section. It carries the same canonical
	// expansion evidence, so the deterministic tie-break (not ambiguity) must
	// keep the player section "Gastar Puntos de Progreso (PP)" at rank 1.
	makeEntry({
		kind: 'chapter',
		canonicalName: 'Otorgar Puntos de Progreso (PP)',
		slug: '02-otorgar-puntos-de-progreso-pp',
		aliases: ['otorgar puntos de progreso pp'],
		tags: [],
		heading: 'Otorgar Puntos de Progreso (PP)',
		anchor: 'otorgar-puntos-de-progreso-pp',
		path: 'references/manual-del-director/02-otorgar-puntos-de-progreso-pp.md',
		source: 'gm.md',
	}),
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
			'El coste depende del poder de la carta, indicado por su Nivel. Para adquirir una nueva carta al subir de nivel debes gastar PP.',
	}),
];

const search = (options: SearchOptions) => searchContentIndex({ entries: buildIndex() }, options);

describe('canonical acronym glossary (T7)', () => {
	test('PP expands to the verified "puntos de progreso"', () => {
		assert.deepEqual(acronymExpansionTerms('pp'), ['puntos', 'progreso']);
	});

	test('PPF is marked ambiguous and never collapsed into a single route', () => {
		assert.equal(isAmbiguousAcronym('ppf'), true);
		assert.deepEqual(acronymExpansionTerms('ppf'), []);
	});

	test('LS has no glossary entry: never invented, never expanded', () => {
		assert.equal(isAmbiguousAcronym('ls'), false);
		assert.deepEqual(acronymExpansionTerms('ls'), []);
	});
});

describe('bounded normalization variants (T7)', () => {
	test('costo/coste collapse into one lemma', () => {
		for (const form of ['coste', 'costo', 'costes', 'costos']) {
			assert.equal(toLemma(form), 'coste', `${form} -> coste`);
		}
	});

	test('gasto/gastar collapse into one lemma', () => {
		for (const form of ['gastar', 'gasto', 'gastos', 'gastas', 'gastado', 'gastada']) {
			assert.equal(toLemma(form), 'gastar', `${form} -> gastar`);
		}
	});

	test('controlled singular/plural collapse for frequent domain nouns', () => {
		assert.equal(toLemma('cartas'), 'carta');
		assert.equal(toLemma('objetos'), 'objeto');
		assert.equal(toLemma('criaturas'), 'criatura');
		assert.equal(toLemma('armas'), 'arma');
		assert.equal(toLemma('niveles'), 'nivel');
		assert.equal(toLemma('puntos'), 'punto');
		assert.equal(toLemma('magos'), 'mago');
		assert.equal(toLemma('brujos'), 'brujo');
		assert.equal(toLemma('bardos'), 'bardo');
		assert.equal(toLemma('conjuros'), 'conjuro');
		assert.equal(toLemma('reglas'), 'regla');
	});

	test('mago stays distinct from magia: the archetype is not the noun', () => {
		assert.equal(toLemma('mago'), 'mago');
		assert.equal(toLemma('magos'), 'mago');
		assert.notEqual(toLemma('mago'), 'magia');
		assert.equal(toLemma('magia'), 'magia');
	});

	test('unrelated tokens still map to themselves: no aggressive stemming', () => {
		for (const form of ['listar', 'nivel', 'ls', 'pacto', 'supremo', 'imbuir']) {
			assert.equal(toLemma(form), form);
		}
	});
});

describe('engine behavior: acronyms and variants (T7)', () => {
	test('LS stays not_found with no false positives', () => {
		const { output } = search({ query: 'LS' });
		assert.equal(output.status, 'not_found');
		assert.equal(output.results.length, 0);
	});

	test('PPF routes to ambiguous regardless of filters', () => {
		assert.equal(search({ query: 'PPF' }).output.status, 'ambiguous');
		assert.equal(search({ query: 'PPF', source: 'gm.md' }).output.status, 'ambiguous');
	});

	test('PP resolves through its verified expansion', () => {
		const { output } = search({ query: 'PP' });
		assert.equal(output.status, 'found');
		assert.ok(
			output.results.some((result) => result.name.includes('Puntos de Progreso')),
			`PP must reach the Puntos de Progreso section, got ${output.results.map((r) => r.name).join(', ')}`,
		);
	});

	test('PP ranks "Gastar Puntos de Progreso (PP)" first and no PPF entry precedes it', () => {
		// QA contract_violation regression: `pp` used to raw prefix-match the
		// `ppf` token inside PPF section titles, and the alphabetical tie-break
		// placed those sections above the canonical PP section.
		const { output } = search({ query: 'PP' });
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
	});

	test('PP expansion stays deterministic: the GM "Otorgar" twin does not turn PP ambiguous', () => {
		// Both "Gastar Puntos de Progreso (PP)" (player) and "Otorgar Puntos de
		// Progreso (PP)" (gm) carry the canonical expansion phrase; the stable
		// tie-break resolves the ranking without changing the status.
		const { output, detail } = search({ query: 'PP', explain: true });
		assert.equal(output.status, 'found');
		assert.equal(output.results[0].name, 'Gastar Puntos de Progreso (PP)');
		const names = output.results.map((result) => result.name);
		const otorgarIndex = names.indexOf('Otorgar Puntos de Progreso (PP)');
		assert.ok(otorgarIndex === 1, `GM twin expected at rank 2, got ${names.join(' | ')}`);
		assert.equal(detail[0].matchType, 'expansion');
	});

	test('costo and coste produce byte-equivalent results', () => {
		const costo = search({ query: 'costo' });
		const coste = search({ query: 'coste' });
		assert.equal(costo.output.status, coste.output.status);
		assert.deepEqual(
			costo.output.results.map((r) => r.name),
			coste.output.results.map((r) => r.name),
		);
	});

	test('gasto and gastar produce byte-equivalent results', () => {
		const gasto = search({ query: 'gasto' });
		const gastar = search({ query: 'gastar' });
		assert.equal(gasto.output.status, gastar.output.status);
		assert.deepEqual(
			gasto.output.results.map((r) => r.name),
			gastar.output.results.map((r) => r.name),
		);
	});
});
