import { describe, it, expect } from 'vitest';
import { buildNpcUrl } from './build-npc-url';

describe('buildNpcUrl', () => {
	it('writes yaml into hash', () => {
		const base = new URL('http://example.com/embedded/npc');
		const result = buildNpcUrl(base, 'new yaml', false);
		expect(result).toBe('http://example.com/embedded/npc#yaml=new+yaml');
	});

	it('includes readonly in hash when true', () => {
		const base = new URL('http://example.com/embedded/npc');
		const result = buildNpcUrl(base, 'data', true);
		expect(result).toBe('http://example.com/embedded/npc#yaml=data&readonly=1');
	});

	it('omits readonly when false', () => {
		const base = new URL('http://example.com/embedded/npc');
		const result = buildNpcUrl(base, 'data', false);
		expect(result).toBe('http://example.com/embedded/npc#yaml=data');
	});

	it('handles empty yaml', () => {
		const base = new URL('http://example.com/embedded/npc');
		const result = buildNpcUrl(base, '', false);
		expect(result).toBe('http://example.com/embedded/npc#yaml=');
	});
});
