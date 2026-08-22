import { describe, test } from 'node:test';
import assert from 'node:assert/strict';

import { buildContentEntryHash, type ContentIndexEntry } from '../src/types/content-index.js';
import { matchEntry } from '../src/scripts/cli/search/matcher.js';
import { SPANISH_LEMMAS, toLemma } from '../src/scripts/cli/search/morphology.js';
import { analyzeQuery } from '../src/scripts/cli/search/normalize.js';

describe('controlled Spanish lemma map (T6 morphology gap)', () => {
	test('maps the imbuir participle and common conjugations to the infinitive', () => {
		for (const form of [
			'imbuir',
			'imbuida',
			'imbuido',
			'imbuidas',
			'imbuidos',
			'imbuye',
			'imbuyen',
			'imbuyes',
			'imbuyo',
		]) {
			assert.equal(toLemma(form), 'imbuir', `${form} -> imbuir`);
		}
	});

	test('maps mágicamente and adjectival forms to the magia lemma', () => {
		for (const form of ['magia', 'magica', 'magico', 'magicas', 'magicos', 'magicamente']) {
			assert.equal(toLemma(form), 'magia', `${form} -> magia`);
		}
	});

	test('keeps mago/magos distinct from magia: the archetype is not the noun', () => {
		// T7 adds the controlled plural (magos->mago), but the archetype lemma
		// must never collapse into the `magia` noun.
		assert.equal(toLemma('mago'), 'mago');
		assert.equal(toLemma('magos'), 'mago');
		assert.notEqual(toLemma('mago'), 'magia');
	});

	test('unknown tokens map to themselves: no aggressive stemming', () => {
		// T7 adds a controlled singular/plural map for frequent domain nouns
		// (armas->arma, cartas->carta, ...); every other word still maps to
		// itself, including short tokens such as `ls`.
		for (const form of ['listar', 'nivel', 'ls', 'pacto', 'supremo', 'elemental']) {
			assert.equal(toLemma(form), form);
		}
	});

	test('prototype properties are never read as lemmas', () => {
		// Real corpus headings such as "Tabla de Constructor" tokenize to
		// `constructor`; a plain-object lookup must not resolve to Object.prototype.
		assert.equal(toLemma('constructor'), 'constructor');
		assert.equal(toLemma('toString'), 'toString');
		assert.equal(toLemma('hasOwnProperty'), 'hasOwnProperty');
	});

	test('every lemma target maps to itself (canonical forms are stable)', () => {
		for (const lemma of Object.values(SPANISH_LEMMAS)) {
			assert.equal(toLemma(lemma), lemma);
		}
	});
});

describe('morphology feeds the content lane deterministically', () => {
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

	test('query "imbuir magia" reaches body "imbuida ... mágicamente" via the content lane', () => {
		const entry = makeEntry({
			canonicalName: 'Arma Enriquecida',
			search: 'El arma está imbuida y enriquecida mágicamente.',
		});
		const match = matchEntry(entry, analyzeQuery('imbuir magia'));
		assert.ok(match.matchedTerms.includes('imbuir'), 'imbuir must resolve through imbuida');
		assert.ok(match.matchedTerms.includes('magia'), 'magia must resolve through mágicamente');
		assert.ok(match.contentMatchedFields.includes('body'), 'evidence must come from the body');
	});

	test('lemma normalization never turns an unknown short token into a substring match', () => {
		const entry = makeEntry({
			canonicalName: 'Bálsamo Natural',
			search: 'Un bálsamo que sella heridas.',
		});
		const match = matchEntry(entry, analyzeQuery('ls'));
		assert.equal(match.matchType, 'none', 'LS must stay a full-token-only match');
	});
});
