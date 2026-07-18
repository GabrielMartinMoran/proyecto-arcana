import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('$app/paths', () => ({
	asset: (path: string) => `/base${path}`,
	resolve: (path: string) => path,
}));

describe('doc-service manual navigation', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		globalThis.fetch = vi.fn();
	});

	it('attaches stable gfm heading ids to rendered markdown', async () => {
		const md = '# Sistema\n\n## Creacion\n\nTexto.\n\n# 7. Combate\n';
		globalThis.fetch = vi.fn(async () => ({ text: async () => md }) as Response);

		const { loadMarkdownDocument } = await import('./doc-service');
		const result = await loadMarkdownDocument('/docs/sample.md');

		expect(result.html).toContain('id="sistema"');
		expect(result.html).toContain('id="creacion"');
		expect(result.html).toContain('id="7-combate"');
	});

	it('preserves the numeric prefix in heading slugs', async () => {
		const md = '# 1. Filosofia de Diseno\n\n## 2.1 Atributos\n';
		globalThis.fetch = vi.fn(async () => ({ text: async () => md }) as Response);

		const { loadMarkdownDocument } = await import('./doc-service');
		const result = await loadMarkdownDocument('/docs/sample.md');

		expect(result.html).toContain('id="1-filosofia-de-diseno"');
		expect(result.html).toContain('id="21-atributos"');
	});

	it('suffixes duplicate heading slugs to keep them unique', async () => {
		const md = '# Combate\n\nTexto 1.\n\n# Combate\n\nTexto 2.\n';
		globalThis.fetch = vi.fn(async () => ({ text: async () => md }) as Response);

		const { loadMarkdownDocument } = await import('./doc-service');
		const result = await loadMarkdownDocument('/docs/sample.md');

		expect(result.html).toContain('id="combate"');
		expect(result.html).toContain('id="combate-1"');
		const ids = [...result.html.matchAll(/id="([^"]+)"/g)].map((m) => m[1]);
		expect(new Set(ids).size).toBe(ids.length);
	});

	it('returns heading metadata with level, text and id', async () => {
		const md = '# Sistema\n\nIntro.\n\n# 7. Combate\n\nIntro combate.\n';
		globalThis.fetch = vi.fn(async () => ({ text: async () => md }) as Response);

		const { loadMarkdownDocument } = await import('./doc-service');
		const result = await loadMarkdownDocument('/docs/sample.md');

		expect(result.headings).toEqual([
			{ level: 1, text: 'Sistema', id: 'sistema' },
			{ level: 1, text: '7. Combate', id: '7-combate' },
		]);
	});

	it('does not mutate the global marked parser used by Card and Statblock', async () => {
		const before = (await import('marked')).marked.parse('# global\n\nTexto.\n');
		expect(before).not.toContain('id="global"');

		const md = '# Sistema\n\nTexto.\n';
		globalThis.fetch = vi.fn(async () => ({ text: async () => md }) as Response);
		const { loadMarkdownDocument } = await import('./doc-service');
		await loadMarkdownDocument('/docs/sample.md');

		const after = (await import('marked')).marked.parse('# global\n\nTexto.\n');
		expect(after).not.toContain('id="global"');
		expect(after).toBe(before);
	});

	it('isolates heading state between consecutive loads', async () => {
		const { loadMarkdownDocument } = await import('./doc-service');

		globalThis.fetch = vi.fn(async () => ({ text: async () => '# Uno\n\nTexto.\n' }) as Response);
		const first = await loadMarkdownDocument('/docs/one.md');
		expect(first.headings).toHaveLength(1);

		globalThis.fetch = vi.fn(async () => ({ text: async () => '# Dos\n\nTexto.\n' }) as Response);
		const second = await loadMarkdownDocument('/docs/two.md');
		expect(second.headings).toHaveLength(1);
		expect(second.headings[0].id).toBe('dos');
	});
});
