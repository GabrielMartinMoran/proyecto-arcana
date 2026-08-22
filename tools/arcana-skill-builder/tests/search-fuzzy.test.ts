import { describe, test } from 'node:test';
import assert from 'node:assert/strict';

import {
	acceptsFuzzy,
	buildFuzzyStrength,
	damerauLevenshtein,
	fuzzyMaxDistanceForTerm,
	isFuzzyTermEligible,
	normalizedSimilarity,
} from '../src/scripts/cli/search/fuzzy.js';

describe('Damerau-Levenshtein distance', () => {
	test('a transposition costs one edit', () => {
		assert.equal(damerauLevenshtein('ciclpe', 'ciclope'), 1);
	});

	test('classic Levenshtein cases without transpositions', () => {
		assert.equal(damerauLevenshtein('kitten', 'sitting'), 3);
		assert.equal(damerauLevenshtein('', ''), 0);
		assert.equal(damerauLevenshtein('abc', ''), 3);
	});

	test('identical strings have distance zero', () => {
		assert.equal(damerauLevenshtein('ciclope', 'ciclope'), 0);
	});

	test('normalized similarity is symmetric and bounded', () => {
		assert.equal(normalizedSimilarity('ciclpe', 'ciclope'), 1 - 1 / 7);
		assert.equal(normalizedSimilarity('ciclope', 'ciclope'), 1);
		assert.equal(normalizedSimilarity('', ''), 1);
	});
});

describe('bounded fuzzy acceptance', () => {
	test('accepts a plausible typo for a 4-7 char term at distance 1', () => {
		assert.equal(isFuzzyTermEligible('ciclpe'), true);
		assert.equal(fuzzyMaxDistanceForTerm('ciclpe'), 1);
		assert.equal(acceptsFuzzy('ciclpe', 'ciclope'), true);
	});

	test('rejects terms shorter than 4 characters', () => {
		assert.equal(isFuzzyTermEligible('xy'), false);
		assert.equal(acceptsFuzzy('xy', 'ciclope'), false);
	});

	test('rejects matches below the 0.82 similarity threshold', () => {
		assert.equal(acceptsFuzzy('ciclpe', 'dinosaurio'), false);
	});

	test('long terms allow a slightly larger distance but keep the similarity gate', () => {
		assert.equal(fuzzyMaxDistanceForTerm('hibernacion'), 2);
		// A distance-1 typo on a long term clears the gate.
		const typo = 'hybernacion';
		const distance = damerauLevenshtein('hibernacion', typo);
		assert.equal(distance, 1);
		const similarity = normalizedSimilarity('hibernacion', typo);
		assert.ok(similarity >= 0.82, 'a plausible long-term typo should stay above the gate');
		assert.equal(acceptsFuzzy('hibernacion', typo), true);
		// A distance-2 typo passes the length gate for long terms but fails the
		// similarity gate, so fuzzy stays bounded (no distance-2 rescue from 0.82).
		const farTypo = 'hibernacxom';
		assert.equal(damerauLevenshtein('hibernacion', farTypo), 2);
		assert.equal(acceptsFuzzy('hibernacion', farTypo), false);
	});

	test('fuzzy strength maps the similarity band into the 0.58-0.85 range', () => {
		assert.ok(Math.abs(buildFuzzyStrength(0.82) - 0.58) < 1e-9);
		assert.ok(Math.abs(buildFuzzyStrength(1) - 0.85) < 1e-9);
		const mid = buildFuzzyStrength(0.8571428571428571);
		assert.ok(mid > 0.58 && mid < 0.85);
	});
});
