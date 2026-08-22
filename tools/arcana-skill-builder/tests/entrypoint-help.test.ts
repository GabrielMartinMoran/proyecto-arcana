import { describe, test } from 'node:test';
import assert from 'node:assert/strict';

import { printUsage } from '../src/scripts/cli/entrypoint.js';

const capture = (fn: () => void): string => {
	let output = '';
	const originalWrite = process.stdout.write;
	process.stdout.write = ((chunk: string | Uint8Array) => {
		output += String(chunk);
		return true;
	}) as typeof process.stdout.write;
	try {
		fn();
	} finally {
		process.stdout.write = originalWrite;
	}
	return output;
};

describe('entrypoint help announces search (T4 packaging contract)', () => {
	const help = capture(() => printUsage());

	test('announces search as a top-level command', () => {
		assert.match(help, /search/);
	});

	test('keeps list, detail and help commands (compatibility)', () => {
		assert.match(help, /list/);
		assert.match(help, /detail/);
		assert.match(help, /help/);
	});

	test('documents --query as the main search option', () => {
		assert.match(help, /--query/);
	});

	test('states that search output is compact agent-facing JSON', () => {
		assert.match(help, /compact/i);
		assert.match(help, /JSON|json/);
	});

	test('exposes --explain only for debugging score and match details', () => {
		assert.match(help, /--explain/);
		assert.match(help, /debug|depur/i);
	});
});
