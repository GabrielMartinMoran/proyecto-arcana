import { test } from 'node:test';
import assert from 'node:assert/strict';

test('isAiExplicitlyEnabled requires an explicit ENABLE_AI=true and no SKIP_AI kill-switch', async () => {
	const { isAiExplicitlyEnabled } = await import('../src/config.js');
	assert.equal(isAiExplicitlyEnabled({}), false);
	assert.equal(isAiExplicitlyEnabled({ ENABLE_AI: 'false' }), false);
	assert.equal(isAiExplicitlyEnabled({ ENABLE_AI: '1' }), false);
	assert.equal(isAiExplicitlyEnabled({ ENABLE_AI: 'true' }), true);
	assert.equal(isAiExplicitlyEnabled({ ENABLE_AI: 'true', SKIP_AI: 'true' }), false);
	assert.equal(isAiExplicitlyEnabled({ ENABLE_AI: 'true', SKIP_AI: 'false' }), true);
});

test('generateSummary returns empty without explicit AI opt-in (no network, no client)', async () => {
	// Normalise env before the summarizer module is loaded so the module-level gate
	// reflects the DEFAULT "opt-in by default" contract.
	delete process.env.OPENAI_API_KEY;
	process.env.ENABLE_AI = '';
	process.env.SKIP_AI = '';
	const { generateSummary } = await import('../src/llm/summarizer.js');
	const result = await generateSummary('Título de prueba', 'contenido de prueba', 'contexto');
	assert.equal(result, '');
});

test('generateSummary with explicit opt-in but no key returns empty without network', async () => {
	// Fresh module instance: ENABLE_AI=true (opt-in) but no API key available.
	// The summarizer must NOT construct a client or reach the network in that case.
	try {
		process.env.ENABLE_AI = 'true';
		process.env.SKIP_AI = '';
		delete process.env.OPENAI_API_KEY;
		const { generateSummary } = await import(
			`../src/llm/summarizer.js?enabled-nokey=${Date.now()}`
		);
		const result = await generateSummary('Título de prueba', 'contenido de prueba', 'contexto');
		assert.equal(result, '');
	} finally {
		delete process.env.OPENAI_API_KEY;
		process.env.ENABLE_AI = '';
	}
});
