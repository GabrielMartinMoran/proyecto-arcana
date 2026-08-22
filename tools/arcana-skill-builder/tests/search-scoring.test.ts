import { describe, test } from 'node:test';
import assert from 'node:assert/strict';

import { matchEntry } from '../src/scripts/cli/search/matcher.js';
import { analyzeQuery } from '../src/scripts/cli/search/normalize.js';
import {
	compareScoredResults,
	isArchetypeRoot,
	sortScoredResults,
	toScoredResult,
} from '../src/scripts/cli/search/scoring.js';
import type { ContentIndexEntry } from '../src/types/content-index.js';
import { buildContentEntryHash } from '../src/types/content-index.js';

/**
 * T8b archetype-root ranking.
 *
 * The root card of an archetype discipline is identified by a GENERIC rule —
 * the `Arquetipo` tag plus the canonical `arquetipo-nivel-1.yml` path — never by
 * hardcoding an archetype name (`Céfiro`) and never by relying on alphabetical
 * or path order. The rule only affects the ranking of that root within its
 * tied category listing; every card of the set is preserved.
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

const cefiroRoot = (): ContentIndexEntry =>
	makeEntry({
		canonicalName: 'Sintonía Fluida',
		slug: 'sintonia-fluida',
		tags: ['Arquetipo', 'Céfiro', 'Combatiente'],
		level: 1,
		path: 'references/cartas-de-habilidades/arquetipos/cefiro/arquetipo-nivel-1.yml',
	});

const cefiroCard = (overrides: Partial<ContentIndexEntry> = {}): ContentIndexEntry =>
	makeEntry({
		canonicalName: 'Foco del Escaramuzador',
		slug: 'foco-del-escaramuzador',
		tags: ['Céfiro'],
		level: 1,
		path: 'references/cartas-de-habilidades/arquetipos/cefiro/nivel-1.yml',
		...overrides,
	});

describe('archetype root signal (T8b)', () => {
	test('a root card carries the Arquetipo tag and the arquetipo-nivel-1.yml path', () => {
		assert.equal(isArchetypeRoot(cefiroRoot()), true);
		// Generic: the same rule must hold for any other archetype without naming it.
		assert.equal(
			isArchetypeRoot(
				makeEntry({
					canonicalName: 'Sintonía con el Acero',
					tags: ['Arquetipo', 'Coloso', 'Combatiente'],
					path: 'references/cartas-de-habilidades/arquetipos/coloso/arquetipo-nivel-1.yml',
				}),
			),
			true,
		);
	});

	test('path guard: the Arquetipo tag alone is not enough', () => {
		// Same tags, but a regular level file inside the same archetype directory.
		assert.equal(
			isArchetypeRoot(
				makeEntry({
					tags: ['Arquetipo', 'Céfiro', 'Combatiente'],
					path: 'references/cartas-de-habilidades/arquetipos/cefiro/nivel-1.yml',
				}),
			),
			false,
		);
	});

	test('tag guard: the arquetipo-nivel-1.yml path alone is not enough', () => {
		assert.equal(
			isArchetypeRoot(
				makeEntry({
					tags: ['Céfiro', 'Combatiente'],
					path: 'references/cartas-de-habilidades/arquetipos/cefiro/arquetipo-nivel-1.yml',
				}),
			),
			false,
		);
	});

	test('non-card entries are never roots', () => {
		for (const entry of [
			makeEntry({
				kind: 'section',
				canonicalName: 'Beneficio de Arquetipo',
				tags: [],
				path: 'references/manual-del-jugador/03-mecanicas-de-juego.md',
			}),
			makeEntry({
				kind: 'item',
				canonicalName: 'Arma Enriquecida',
				tags: ['Arma'],
				path: 'references/objetos-magicos/nivel-2.yml',
			}),
		]) {
			assert.equal(isArchetypeRoot(entry), false);
		}
	});
});

describe('root-aware ranking (T8b)', () => {
	const query = analyzeQuery('Céfiro');
	const rootScored = toScoredResult(cefiroRoot(), matchEntry(cefiroRoot(), query));
	const cardScored = toScoredResult(cefiroCard(), matchEntry(cefiroCard(), query));

	test('a tied archetype root outranks the rest of its category', () => {
		assert.equal(rootScored.score, cardScored.score, 'category cards tie by design');
		assert.ok(
			compareScoredResults(rootScored, cardScored) < 0,
			'root must sort before a tied category card',
		);
		const sorted = sortScoredResults([cardScored, rootScored]);
		assert.equal(sorted[0].entry.canonicalName, 'Sintonía Fluida');
		assert.equal(sorted[1].entry.canonicalName, 'Foco del Escaramuzador');
	});

	test('score still dominates: an exact identity match beats the root priority', () => {
		// A card literally named after the archetype resolves the query by name
		// (score 75), while the root only matches the shared tag (score 65). The
		// root priority must never override a genuinely stronger match.
		const named = toScoredResult(
			makeEntry({
				canonicalName: 'Céfiro',
				slug: 'cefiro',
				tags: ['Céfiro'],
				path: 'references/cartas-de-habilidades/arquetipos/cefiro/nivel-1.yml',
			}),
			matchEntry(
				makeEntry({
					canonicalName: 'Céfiro',
					slug: 'cefiro',
					tags: ['Céfiro'],
					path: 'references/cartas-de-habilidades/arquetipos/cefiro/nivel-1.yml',
				}),
				query,
			),
		);
		assert.ok(named.score > rootScored.score, 'exact name match must score higher');
		const sorted = sortScoredResults([rootScored, named]);
		assert.equal(sorted[0].entry.canonicalName, 'Céfiro');
		assert.equal(sorted[1].entry.canonicalName, 'Sintonía Fluida');
	});

	test('two roots keep the stable name tie-break', () => {
		// Both roots share the Combatiente tag, so they tie; the comparator must
		// fall back to the deterministic name order without ever being unstable.
		const combatienteQuery = analyzeQuery('Combatiente');
		const colosoRoot = toScoredResult(
			makeEntry({
				canonicalName: 'Sintonía con el Acero',
				tags: ['Arquetipo', 'Coloso', 'Combatiente'],
				path: 'references/cartas-de-habilidades/arquetipos/coloso/arquetipo-nivel-1.yml',
			}),
			matchEntry(
				makeEntry({
					canonicalName: 'Sintonía con el Acero',
					tags: ['Arquetipo', 'Coloso', 'Combatiente'],
					path: 'references/cartas-de-habilidades/arquetipos/coloso/arquetipo-nivel-1.yml',
				}),
				combatienteQuery,
			),
		);
		const cefiroRootCombatiente = toScoredResult(
			cefiroRoot(),
			matchEntry(cefiroRoot(), combatienteQuery),
		);
		assert.equal(colosoRoot.score, cefiroRootCombatiente.score, 'both roots tie on the shared tag');
		const sorted = sortScoredResults([cefiroRootCombatiente, colosoRoot]);
		assert.deepEqual(
			sorted.map((result) => result.entry.canonicalName),
			['Sintonía con el Acero', 'Sintonía Fluida'],
			'equal roots keep the stable alphabetical tie-break',
		);
	});
});
