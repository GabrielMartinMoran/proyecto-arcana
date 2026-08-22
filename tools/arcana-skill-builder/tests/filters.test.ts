import { describe, test } from 'node:test';
import assert from 'node:assert/strict';

import { filterContentIndexEntries, matchesStructuredOrTags } from '../src/scripts/cli/filters.js';
import { buildContentEntryHash, type ContentIndexEntry } from '../src/types/content-index.js';

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

describe('structured-or-tag predicate (F2)', () => {
	test('matches a v3 structured.type value even when tags do not carry it', () => {
		const entry = makeEntry({ tags: ['Arcanista'], structured: { type: 'efecto' } });
		assert.equal(matchesStructuredOrTags(entry, ['efecto'], entry.structured?.type), true);
		// Case/diacritics normalization follows the existing fold pattern.
		assert.equal(matchesStructuredOrTags(entry, ['Efecto'], entry.structured?.type), true);
	});

	test('does NOT fall back to tags when structured.type exists but does not match', () => {
		const entry = makeEntry({ tags: ['efecto'], structured: { type: 'activable' } });
		assert.equal(matchesStructuredOrTags(entry, ['efecto'], entry.structured?.type), false);
	});

	test('falls back to legacy tags when structured.type is absent', () => {
		const legacy = makeEntry({ tags: ['Utilidad'] });
		assert.equal(matchesStructuredOrTags(legacy, ['Utilidad'], legacy.structured?.type), true);
		assert.equal(matchesStructuredOrTags(legacy, ['Inexistente'], legacy.structured?.type), false);
	});

	test('keeps best-effort ANY semantics over the wanted list', () => {
		const entry = makeEntry({ tags: ['Bardo'], structured: { type: 'efecto' } });
		assert.equal(
			matchesStructuredOrTags(entry, ['activable', 'efecto'], entry.structured?.type),
			true,
		);
		assert.equal(
			matchesStructuredOrTags(entry, ['activable', 'consumible'], entry.structured?.type),
			false,
		);
	});

	test('lineage: structured value matches and mismatch never falls back to tags', () => {
		const ciclope = makeEntry({
			kind: 'creature',
			tags: ['Gigante'],
			structured: { lineage: 'Gigante' },
		});
		assert.equal(matchesStructuredOrTags(ciclope, ['Gigante'], ciclope.structured?.lineage), true);
		// The tag happens to carry the value too, but the structured field is
		// authoritative: a different requested lineage still must not match.
		assert.equal(matchesStructuredOrTags(ciclope, ['Dragón'], ciclope.structured?.lineage), false);
	});

	test('lineage: absent structured falls back to legacy tags', () => {
		const legacy = makeEntry({ kind: 'creature', tags: ['No Muerto'] });
		assert.equal(matchesStructuredOrTags(legacy, ['No Muerto'], legacy.structured?.lineage), true);
	});

	test('no filter constraint matches every entry', () => {
		const entry = makeEntry({ tags: [], structured: { type: 'efecto' } });
		assert.equal(matchesStructuredOrTags(entry, undefined, entry.structured?.type), true);
		assert.equal(matchesStructuredOrTags(entry, [], entry.structured?.type), true);
	});
});

describe('filterContentIndexEntries with types/lineage (F2)', () => {
	const buildIndex = (): ContentIndexEntry[] => [
		makeEntry({
			canonicalName: 'Afinidad Arcana',
			slug: 'afinidad-arcana',
			tags: ['Arcanista'],
			structured: { cardType: 'ability', type: 'efecto' },
		}),
		makeEntry({
			canonicalName: 'Bendición Menor',
			slug: 'bendicion-menor',
			tags: ['Clérigo', 'efecto'],
			structured: { cardType: 'ability', type: 'activable' },
		}),
		makeEntry({
			canonicalName: 'Amuleto de Protección',
			slug: 'amuleto-de-proteccion',
			tags: ['Utilidad'],
		}),
		makeEntry({
			kind: 'creature',
			canonicalName: 'Cíclope',
			slug: 'ciclope',
			tags: [],
			structured: { lineage: 'Gigante' },
		}),
	];

	test('--type efecto keeps only the v3 entry whose structured.type matches', () => {
		const result = filterContentIndexEntries(buildIndex(), { types: ['efecto'] });
		assert.deepEqual(
			result.map((entry) => entry.slug),
			['afinidad-arcana'],
		);
	});

	test('--lineage Gigante keeps the v3 creature', () => {
		const result = filterContentIndexEntries(buildIndex(), { lineage: 'Gigante' });
		assert.deepEqual(
			result.map((entry) => entry.slug),
			['ciclope'],
		);
	});

	test('legacy entry without structured matches types via tag fallback', () => {
		const result = filterContentIndexEntries(buildIndex(), { types: ['Utilidad'] });
		assert.deepEqual(
			result.map((entry) => entry.slug),
			['amuleto-de-proteccion'],
		);
	});

	test('mismatched structured excludes an entry even when a tag would match', () => {
		// Bendición Menor carries the tag "efecto" but its structured.type is
		// "activable": the v3 field is the source, so it must be excluded.
		const result = filterContentIndexEntries(buildIndex(), { types: ['efecto'] });
		assert.ok(
			!result.some((entry) => entry.slug === 'bendicion-menor'),
			'bendicion-menor must be excluded',
		);
	});
});
