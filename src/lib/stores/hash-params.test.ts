import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { hashParams, createHashParams } from './hash-params.svelte';

describe('hashParams store', () => {
	const originalHash = window.location.hash;

	beforeEach(() => {
		window.location.hash = '';
		// Ensure hashParams reflects the cleared hash
		window.dispatchEvent(new HashChangeEvent('hashchange'));
	});

	afterEach(() => {
		window.location.hash = originalHash;
		window.dispatchEvent(new HashChangeEvent('hashchange'));
	});

	it('returns null for missing key', () => {
		expect(hashParams.get('yaml')).toBeNull();
	});

	it('returns value from current hash after hashchange', () => {
		window.location.hash = '#yaml=hello';
		window.dispatchEvent(new HashChangeEvent('hashchange'));
		expect(hashParams.get('yaml')).toBe('hello');
	});

	it('updates when hashchange fires', () => {
		window.location.hash = '#yaml=world';
		window.dispatchEvent(new HashChangeEvent('hashchange'));
		expect(hashParams.get('yaml')).toBe('world');
	});

	it('has() returns true for existing key', () => {
		window.location.hash = '#yaml=test&readonly=1';
		window.dispatchEvent(new HashChangeEvent('hashchange'));
		expect(hashParams.has('yaml')).toBe(true);
		expect(hashParams.has('readonly')).toBe(true);
		expect(hashParams.has('missing')).toBe(false);
	});

	it('getAll returns all values for a key', () => {
		window.location.hash = '#tag=a&tag=b';
		window.dispatchEvent(new HashChangeEvent('hashchange'));
		expect(hashParams.getAll('tag')).toEqual(['a', 'b']);
	});

	it('param exposes URLSearchParams', () => {
		window.location.hash = '#foo=bar';
		window.dispatchEvent(new HashChangeEvent('hashchange'));
		expect(hashParams.param.get('foo')).toBe('bar');
	});

	it('sync updates params from current window.location.hash', () => {
		window.location.hash = '#sync=test';
		// Without dispatching hashchange, hashParams is stale
		expect(hashParams.get('sync')).toBeNull();
		hashParams.sync();
		expect(hashParams.get('sync')).toBe('test');
	});

	describe('SSR safety', () => {
		it('does not crash when window is undefined', () => {
			const originalWindow = globalThis.window;
			vi.stubGlobal('window', undefined);
			const params = createHashParams();
			expect(params.get('yaml')).toBeNull();
			expect(params.has('yaml')).toBe(false);
			vi.stubGlobal('window', originalWindow);
		});
	});
});
