/**
 * Unit tests for pause-indicator.ts
 * Covers the idempotent stylesheet injection that replaces Foundry's full-width
 * pause banner with a compact capsule, including the CSS contract with the core
 * selectors and its interaction with foreign stylesheets.
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import process from 'node:process';
import { afterEach, describe, expect, it } from 'vitest';
import { PAUSE_STYLES_ID, ensurePauseStyles, setupPauseIndicator } from './pause-indicator';

function readJson(relativePath: string): any {
	return JSON.parse(readFileSync(resolve(process.cwd(), relativePath), 'utf8'));
}

describe('pauseIndicator', () => {
	afterEach(() => {
		document.getElementById(PAUSE_STYLES_ID)?.remove();
		document.querySelectorAll('style[data-test]').forEach((style) => style.remove());
	});

	/** Selector of the base rule block, isolated so assertions never reach the child rules. */
	const BASE_RULE = /#pause\s*\{([^}]*)\}/;

	function injectedCss(): string {
		const styles = document.head.querySelectorAll(`#${PAUSE_STYLES_ID}`);
		expect(styles).toHaveLength(1);
		return (styles[0] as HTMLStyleElement).textContent ?? '';
	}

	it('FEAT foundry-pause-indicator — injects the stylesheet exactly once when set up twice', () => {
		setupPauseIndicator();
		setupPauseIndicator();

		const css = injectedCss();
		expect(css).toContain('#pause');
		expect(css).toContain('#pause.paused');
		expect(css).toContain('#pause img');
		expect(css).toContain('#pause figcaption');
	});

	it('FEAT foundry-pause-indicator — keeps a pre-existing stylesheet with the same id untouched', () => {
		const existing = document.createElement('style');
		existing.id = PAUSE_STYLES_ID;
		existing.textContent = '/* existing */';
		document.head.append(existing);

		ensurePauseStyles();

		expect(document.head.querySelectorAll(`#${PAUSE_STYLES_ID}`)).toHaveLength(1);
		expect(existing.textContent).toBe('/* existing */');
	});

	it('FEAT foundry-pause-indicator — leaves unrelated stylesheets alone', () => {
		const foreign = document.createElement('style');
		foreign.id = 'unrelated-styles';
		foreign.setAttribute('data-test', 'foreign');
		foreign.textContent = '.unrelated { color: red; }';
		document.head.append(foreign);
		const before = document.head.querySelectorAll('style').length;

		setupPauseIndicator();

		const stillThere = document.getElementById('unrelated-styles') as HTMLStyleElement | null;
		expect(stillThere).not.toBeNull();
		expect(stillThere?.textContent).toBe('.unrelated { color: red; }');
		expect(document.head.querySelectorAll('style')).toHaveLength(before + 1);
	});

	it('FEAT foundry-pause-indicator — preserves the core display toggle on the base selector', () => {
		setupPauseIndicator();

		const base = BASE_RULE.exec(injectedCss());
		expect(base).not.toBeNull();
		expect(base?.[1]).not.toContain('display');
	});

	it('FEAT foundry-pause-indicator — styles a non-interactive capsule with a masked glyph', () => {
		setupPauseIndicator();

		const css = injectedCss();
		const base = BASE_RULE.exec(css)?.[1] ?? '';
		expect(base).toContain('pointer-events: none');
		expect(base).toContain('bottom: 108px');
		expect(base).toContain('transform: translateX(-50%)');
		expect(base).toContain('border-radius: 4px');
		expect(base).toContain('--arcana-pause-glyph: url("data:image/svg+xml');
		expect(base).not.toContain('!important');

		expect(css).toMatch(/#pause::before\s*\{[^}]*mask: var\(--arcana-pause-glyph\)/);
		expect(css).toMatch(/#pause img\s*\{\s*display: none/);
		expect(css).toMatch(/#pause\.paused\s*\{\s*animation: none/);
		expect(css).toMatch(/#pause figcaption\s*\{[^}]*text-transform: uppercase/);
		expect(css).toMatch(/#pause figcaption\s*\{[^}]*letter-spacing: \.12em/);
		expect(css).not.toContain('!important');
	});

	it('FEAT foundry-pause-indicator — uses the flat core panel chip instead of a blurred pill', () => {
		setupPauseIndicator();

		const base = BASE_RULE.exec(injectedCss())?.[1] ?? '';
		expect(base).toContain('gap: 8px');
		expect(base).toContain('padding: 7px 12px');
		expect(base).toContain('border: 1px solid rgba(255, 255, 255, .14)');
		expect(base).toContain('background: rgba(0, 0, 0, .55)');
		expect(base).toContain('box-shadow: 0 0 6px rgba(0, 0, 0, .5)');
		expect(base).not.toContain('backdrop-filter');
		expect(base).not.toContain('saturate');
		expect(base).not.toContain('font-family');
	});

	it('FEAT foundry-pause-indicator — does nothing when the document has no head', () => {
		expect(() => ensurePauseStyles(null as unknown as Document)).not.toThrow();
	});
});

describe('pauseIndicator language contract', () => {
	it('FEAT foundry-pause-indicator — declares the English and Spanish language files', () => {
		for (const manifestPath of ['module.json', 'system.json']) {
			const manifest = readJson(manifestPath);
			const languages: any[] = manifest.languages ?? [];

			expect(languages, manifestPath).toEqual(
				expect.arrayContaining([
					expect.objectContaining({ lang: 'en', path: 'lang/en.json' }),
					expect.objectContaining({ lang: 'es', path: 'lang/es.json' }),
				]),
			);
		}
	});

	it('FEAT foundry-pause-indicator — defines the core pause key as a single word per language', () => {
		for (const path of ['lang/en.json', 'lang/es.json']) {
			const paused = readJson(path)?.GAME?.Paused;

			expect(typeof paused).toBe('string');
			expect(paused.trim()).toMatch(/^\p{L}+$/u);
		}
	});

	it('FEAT foundry-pause-indicator — ships the language files with the build', () => {
		const build = readFileSync(resolve(process.cwd(), 'build.mjs'), 'utf8');

		expect(build).toContain("'lang'");
	});
});
