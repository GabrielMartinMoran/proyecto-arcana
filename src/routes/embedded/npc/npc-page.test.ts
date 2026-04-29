import { describe, it, expect } from 'vitest';
import { getYamlFromUrl, buildNpcUrl } from './+page.svelte';

describe('getYamlFromUrl', () => {
	it('returns hash yaml when present', () => {
		const url = new URL('http://example.com/embedded/npc#yaml=hello%20world');
		const result = getYamlFromUrl(url);
		expect(result.yaml).toBe('hello world');
		expect(result.source).toBe('hash');
		expect(result.readonly).toBe(false);
	});

	it('returns query yaml when hash is absent', () => {
		const url = new URL('http://example.com/embedded/npc?yaml=query%20value');
		const result = getYamlFromUrl(url);
		expect(result.yaml).toBe('query value');
		expect(result.source).toBe('query');
		expect(result.readonly).toBe(false);
	});

	it('prefers hash over query', () => {
		const url = new URL('http://example.com/embedded/npc?yaml=old#yaml=new');
		const result = getYamlFromUrl(url);
		expect(result.yaml).toBe('new');
		expect(result.source).toBe('hash');
	});

	it('returns null when neither is present', () => {
		const url = new URL('http://example.com/embedded/npc');
		const result = getYamlFromUrl(url);
		expect(result.yaml).toBeNull();
		expect(result.source).toBeNull();
		expect(result.readonly).toBe(false);
	});

	it('reads readonly from hash first', () => {
		const url = new URL('http://example.com/embedded/npc#yaml=a&readonly=1');
		const result = getYamlFromUrl(url);
		expect(result.readonly).toBe(true);
	});

	it('falls back to query readonly when hash lacks it', () => {
		const url = new URL('http://example.com/embedded/npc?yaml=a&readonly=1');
		const result = getYamlFromUrl(url);
		expect(result.readonly).toBe(true);
	});

	it('ignores query readonly when hash has yaml even if hash lacks readonly', () => {
		const url = new URL('http://example.com/embedded/npc?yaml=a&readonly=1#yaml=b');
		const result = getYamlFromUrl(url);
		expect(result.yaml).toBe('b');
		expect(result.readonly).toBe(false);
	});
});

describe('buildNpcUrl', () => {
	it('writes yaml into hash and clears query params', () => {
		const base = new URL('http://example.com/embedded/npc?yaml=old&readonly=1&foo=bar');
		const result = buildNpcUrl(base, 'new yaml', false);
		expect(result).toBe('http://example.com/embedded/npc?foo=bar#yaml=new+yaml');
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

	it('preserves other search params', () => {
		const base = new URL('http://example.com/embedded/npc?foo=bar');
		const result = buildNpcUrl(base, 'data', false);
		expect(result).toBe('http://example.com/embedded/npc?foo=bar#yaml=data');
	});

	it('handles empty yaml', () => {
		const base = new URL('http://example.com/embedded/npc');
		const result = buildNpcUrl(base, '', false);
		expect(result).toBe('http://example.com/embedded/npc#yaml=');
	});
});
