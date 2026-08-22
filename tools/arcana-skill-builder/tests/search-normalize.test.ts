import { describe, test } from 'node:test';
import assert from 'node:assert/strict';

import { analyzeQuery, fold, tokenize } from '../src/scripts/cli/search/normalize.js';

describe('dual normalization (original vs folded)', () => {
	test('fold removes case, diacritics, punctuation and collapses spaces', () => {
		assert.equal(fold('Cíclope'), 'ciclope');
		assert.equal(fold('¿Qué es Ventaja?'), 'que es ventaja');
		assert.equal(fold('Ayuda, Ventaja y Desventaja'), 'ayuda ventaja y desventaja');
		assert.equal(fold('  Pacto —Supremo '), 'pacto supremo');
		assert.equal(fold('Pacto Supremo'), 'pacto supremo');
	});

	test('fold keeps the original input untouched (display form is preserved separately)', () => {
		const raw = '  Cíclope  ';
		assert.notEqual(fold(raw), raw);
		assert.equal(fold(raw), 'ciclope');
	});

	test('tokenize splits folded text into single tokens', () => {
		assert.deepEqual(tokenize('que es ventaja'), ['que', 'es', 'ventaja']);
		assert.deepEqual(tokenize(''), []);
	});

	test('analyzeQuery strips common Spanish functional words for terms', () => {
		const q = analyzeQuery('¿Qué es Ventaja?');
		assert.equal(q.folded, 'que es ventaja');
		assert.equal(q.phrase, 'ventaja');
		assert.deepEqual(q.terms, ['ventaja']);
	});

	test('analyzeQuery keeps the phrase for accent/punctuation-insensitive matching', () => {
		const q = analyzeQuery('Pacto Supremo');
		assert.equal(q.folded, 'pacto supremo');
		assert.equal(q.phrase, 'pacto supremo');
		assert.deepEqual(q.terms, ['pacto', 'supremo']);
	});

	test('analyzeQuery with only stop words yields no searchable terms', () => {
		const q = analyzeQuery('de la');
		assert.deepEqual(q.terms, []);
		assert.equal(q.phrase, '');
	});

	test('analyzeQuery trims and normalizes mixed queries without aggressive stemming', () => {
		const q = analyzeQuery('listar cartas de Bardo de nivel 2');
		assert.deepEqual(q.terms, ['listar', 'cartas', 'bardo', 'nivel', '2']);
	});
});
