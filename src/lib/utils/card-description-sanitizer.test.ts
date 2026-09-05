import { afterEach, describe, expect, it, vi } from 'vitest';
import {
	convertCardDescriptionLineBreaks,
	sanitizeCardDescriptionMarkdown,
	sanitizeCardDescriptionMarkdownInline,
} from './card-description-sanitizer';

const stripTrailingNewline = (html: string) => html.replace(/\n$/, '');

describe('sanitizeCardDescriptionMarkdown', () => {
	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it('FEAT-card-inline-dice @rendering — preserves markdown-visible prose (bold, paragraph)', () => {
		const html = sanitizeCardDescriptionMarkdown('**Potente** y 1d6 de daño');
		expect(html).toContain('<strong>Potente</strong>');
		expect(html).toContain('y 1d6 de daño');
	});

	it('FEAT-card-inline-dice @rendering — keeps allowed safe structural markup like <br>', () => {
		const html = sanitizeCardDescriptionMarkdown('Descarga de Fuego.<br>Causa 1d6 de daño.');
		expect(html).toContain('<br>');
		expect(html).toContain('Causa 1d6 de daño.');
	});

	it('FEAT-card-inline-dice @xss — strips event handler attributes from hostile markup', () => {
		const html = sanitizeCardDescriptionMarkdown('<img src=x onerror=alert(1)> texto');
		expect(html).not.toContain('onerror');
		expect(html).toContain('texto');
	});

	it('FEAT-card-inline-dice @xss — removes script elements entirely', () => {
		const html = sanitizeCardDescriptionMarkdown('A <script>alert(1)</script> B');
		expect(html).not.toContain('<script');
		expect(html).toContain('A');
		expect(html).toContain('B');
	});

	it('FEAT-card-inline-dice @xss — removes dangerous javascript: link protocols', () => {
		const html = sanitizeCardDescriptionMarkdown('[click](javascript:alert(1))');
		expect(html).not.toContain('javascript:');
	});

	it('FEAT-card-inline-dice @xss — stays safe when evaluated without a browser window', () => {
		vi.stubGlobal('window', undefined);

		const html = sanitizeCardDescriptionMarkdown('**hola** <script>alert(1)</script>');

		// Without a DOM the hostile markup is entity-escaped: it can only render as
		// visible text, never as executable elements.
		expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
		expect(html).toContain('&lt;strong&gt;hola&lt;/strong&gt;');
		expect(html).not.toMatch(/<[a-z]+/i);
	});

	it('returns an empty string for an empty description', () => {
		expect(stripTrailingNewline(sanitizeCardDescriptionMarkdown(''))).toBe('');
	});
});

describe('convertCardDescriptionLineBreaks', () => {
	it('FEAT-card-line-breaks @rendering — replaces a single br with one line-break spacer', () => {
		const html = convertCardDescriptionLineBreaks('A<br>B');

		expect(html).toBe('A<span class="line-break"></span>B');
	});

	it('FEAT-card-line-breaks @rendering — replaces two consecutive br with a line-break followed by a line-jump', () => {
		const html = convertCardDescriptionLineBreaks('A<br><br>B');

		expect(html).toBe('A<span class="line-break"></span><span class="line-jump"></span>B');
	});

	it('FEAT-card-line-breaks @rendering — replaces three consecutive br keeping one line-break and adding a line-jump after it', () => {
		const html = convertCardDescriptionLineBreaks('A<br><br><br>B');

		expect(html).toBe(
			'A<span class="line-break"></span><span class="line-jump"></span><span class="line-jump"></span>B',
		);
	});

	it('FEAT-card-line-breaks @rendering — treats runs separated by prose as independent breaks', () => {
		const html = convertCardDescriptionLineBreaks('A<br><br>B<br>C');

		expect(html).toBe(
			'A<span class="line-break"></span><span class="line-jump"></span>B<span class="line-break"></span>C',
		);
	});

	it('FEAT-card-line-breaks @rendering — keeps surrounding markdown output untouched', () => {
		const html = convertCardDescriptionLineBreaks('<p><strong>A</strong><br>B</p>');

		expect(html).toBe('<p><strong>A</strong><span class="line-break"></span>B</p>');
	});

	it('returns the input unchanged when it has no br tags', () => {
		expect(convertCardDescriptionLineBreaks('<p>A</p>')).toBe('<p>A</p>');
	});
});

describe('sanitizeCardDescriptionMarkdownInline', () => {
	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it('FEAT-card-inline-dice @markdown-inline — unwraps a single outer paragraph around inline prose', () => {
		const html = sanitizeCardDescriptionMarkdownInline('**Potente** y 1d6 de daño');

		expect(html).toContain('<strong>Potente</strong>');
		expect(html).toContain('y 1d6 de daño');
		expect(html).not.toContain('<p');
		expect(html).not.toContain('</p>');
	});

	it('FEAT-card-inline-dice @markdown-inline — preserves strong, em, and br inside the unwrapped paragraph', () => {
		const html = sanitizeCardDescriptionMarkdownInline('**Potente** y _em_<br>salto de línea');

		expect(html).toContain('<strong>Potente</strong>');
		expect(html).toContain('<em>em</em>');
		expect(html).toContain('<br>');
		expect(html).toContain('salto de línea');
		expect(html).not.toContain('<p');
	});

	it('FEAT-card-inline-dice @markdown-inline — keeps multi-paragraph block output wrapped', () => {
		const inline = sanitizeCardDescriptionMarkdownInline('Primero.\n\nSegundo.');
		const block = sanitizeCardDescriptionMarkdown('Primero.\n\nSegundo.');

		expect(inline).toBe(block);
		expect(inline).toContain('<p>Primero.</p>');
		expect(inline).toContain('<p>Segundo.</p>');
	});

	it('FEAT-card-inline-dice @markdown-inline — keeps list block output wrapped', () => {
		const inline = sanitizeCardDescriptionMarkdownInline('- item 1\n- item 2');
		const block = sanitizeCardDescriptionMarkdown('- item 1\n- item 2');

		expect(inline).toBe(block);
		expect(inline).toContain('<ul>');
		expect(inline).toContain('<li>item 1</li>');
	});

	it('FEAT-card-inline-dice @xss — sanitizes hostile markup before unwrapping the outer paragraph', () => {
		const html = sanitizeCardDescriptionMarkdownInline('<img src=x onerror=alert(1)> texto');

		expect(html).not.toContain('onerror');
		expect(html).toContain('texto');
		expect(html).not.toContain('<p');
	});

	it('FEAT-card-inline-dice @xss — stays safely escaped without a browser window', () => {
		vi.stubGlobal('window', undefined);

		const html = sanitizeCardDescriptionMarkdownInline('**hola**');

		// Without a DOM the output is entity-escaped: the guard cannot see a real
		// `<p>` wrapper, so it must keep the escaped fallback untouched.
		expect(html).toContain('&lt;p&gt;');
		expect(html).toContain('&lt;strong&gt;hola&lt;/strong&gt;');
		expect(html).not.toMatch(/<[a-z]+/i);
	});
});
