import { fireEvent, render, screen, waitFor, within } from '@testing-library/svelte';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { MarkdownDocument, MarkdownHeading } from '$lib/services/doc-service';

const mocks = vi.hoisted(() => ({
	loadMarkdownDocument: vi.fn(),
}));

vi.mock('$lib/services/doc-service', () => ({
	loadMarkdownDocument: mocks.loadMarkdownDocument,
}));

const SAMPLE_HEADINGS: MarkdownHeading[] = [
	{ level: 1, text: 'Sistema de Rol ARCANA', id: 'sistema-de-rol-arcana' },
	{ level: 1, text: '1. Filosofia', id: '1-filosofia' },
	{ level: 1, text: '7. Combate', id: '7-combate' },
];

const SAMPLE_HTML = `
<h1 id="sistema-de-rol-arcana">Sistema de Rol ARCANA</h1>
<h1 id="1-filosofia">1. Filosofia</h1>
<h1 id="7-combate">7. Combate</h1>
<p>Contenido.</p>
`.trim();

const sampleDoc: MarkdownDocument = { html: SAMPLE_HTML, headings: SAMPLE_HEADINGS };

describe('MarkdownDoc — manual navigation behaviour', () => {
	let matchMediaMock: ReturnType<typeof vi.fn>;
	let scrollIntoViewSpy: ReturnType<typeof vi.fn>;
	let initialHash: string;

	beforeEach(() => {
		mocks.loadMarkdownDocument.mockReset();
		mocks.loadMarkdownDocument.mockResolvedValue(sampleDoc);

		matchMediaMock = vi.fn((query: string) => ({
			matches: false,
			media: query,
			addEventListener: vi.fn(),
			removeEventListener: vi.fn(),
			addListener: vi.fn(),
			removeListener: vi.fn(),
			dispatchEvent: vi.fn(),
			onchange: null,
		}));
		vi.stubGlobal('matchMedia', matchMediaMock);

		scrollIntoViewSpy = vi.fn();
		if (!('scrollIntoView' in Element.prototype)) {
			Object.defineProperty(Element.prototype, 'scrollIntoView', {
				configurable: true,
				writable: true,
				value: scrollIntoViewSpy,
			});
		} else {
			(Element.prototype as HTMLElement).scrollIntoView = scrollIntoViewSpy;
		}

		initialHash = window.location.hash;
		window.history.replaceState(null, '', window.location.pathname);
	});

	afterEach(() => {
		vi.unstubAllGlobals();
		if (initialHash) {
			window.history.replaceState(null, '', initialHash);
		} else {
			window.history.replaceState(null, '', window.location.pathname);
		}
	});

	describe('rendered IDs (preserved)', () => {
		it('emits native hash hrefs pointing to the rendered heading ids', async () => {
			render((await import('./MarkdownDoc.svelte')).default, {
				props: { src: '/docs/sample.md', manualNavTitle: 'Índice del manual' },
			});

			await waitFor(() => expect(screen.getByText('Contenido.')).toBeInTheDocument());
			const html = document.querySelector('.markdown-doc')?.innerHTML ?? '';
			expect(html).toContain('id="1-filosofia"');
			expect(html).toContain('id="7-combate"');
		});

		it('applies scroll-margin-top equal to top bar height + spacing-md to every heading', async () => {
			const { readFile } = await import('node:fs/promises');
			const source = await readFile('./src/lib/components/MarkdownDoc.svelte', 'utf-8');
			expect(source).toMatch(
				/scroll-margin-top:\s*calc\(var\(--top-bar-height\)\s*\+\s*var\(--spacing-md\)\)/,
			);
		});
	});

	describe('hash restore (preserved)', () => {
		it('does not restore hash scroll when no hash is present', async () => {
			render((await import('./MarkdownDoc.svelte')).default, {
				props: { src: '/docs/sample.md', manualNavTitle: 'Índice del manual' },
			});

			await waitFor(() => expect(screen.getByText('Contenido.')).toBeInTheDocument());
			// Wait an extra tick to give async restore a chance.
			await new Promise((resolve) => setTimeout(resolve, 30));
			expect(scrollIntoViewSpy).not.toHaveBeenCalled();
		});

		it('restores the current hash via element.scrollIntoView({ behavior: "auto", block: "start" }) after async load', async () => {
			window.history.replaceState(null, '', '#7-combate');

			render((await import('./MarkdownDoc.svelte')).default, {
				props: { src: '/docs/sample.md', manualNavTitle: 'Índice del manual' },
			});

			await waitFor(() => expect(screen.getByText('Contenido.')).toBeInTheDocument());
			await waitFor(() => expect(scrollIntoViewSpy).toHaveBeenCalled());

			expect(scrollIntoViewSpy).toHaveBeenCalledWith({ behavior: 'auto', block: 'start' });
			const target = document.getElementById('7-combate') as HTMLElement;
			expect(target).not.toBeNull();
			const callOnTarget = scrollIntoViewSpy.mock.instances.includes(target);
			expect(callOnTarget).toBe(true);
		});

		it('does not use smooth scroll behavior when restoring hash', async () => {
			window.history.replaceState(null, '', '#1-filosofia');

			render((await import('./MarkdownDoc.svelte')).default, {
				props: { src: '/docs/sample.md', manualNavTitle: 'Índice del manual' },
			});

			await waitFor(() => expect(screen.getByText('Contenido.')).toBeInTheDocument());
			await waitFor(() => expect(scrollIntoViewSpy).toHaveBeenCalled());

			const smoothCalls = scrollIntoViewSpy.mock.calls.filter(
				(call) => call[0] && (call[0] as { behavior?: string }).behavior === 'smooth',
			);
			expect(smoothCalls).toHaveLength(0);
		});
	});

	describe('in-flow index absence (new)', () => {
		it('does not render any in-flow labelled Índice del manual nav above the markdown when manualNavTitle is set', async () => {
			render((await import('./MarkdownDoc.svelte')).default, {
				props: { src: '/docs/sample.md', manualNavTitle: 'Índice del manual' },
			});

			await waitFor(() => expect(screen.getByText('Contenido.')).toBeInTheDocument());
			expect(screen.queryByRole('navigation', { name: 'Índice del manual' })).toBeNull();
			expect(document.querySelector('details.manual-index')).toBeNull();
		});

		it('does not import or render the ManualIndex component (single FAB is the only nav affordance)', async () => {
			const { readFile } = await import('node:fs/promises');
			const source = await readFile('./src/lib/components/MarkdownDoc.svelte', 'utf-8');
			expect(source).not.toMatch(/ManualIndex\.svelte|import\s+ManualIndex\b/);
		});
	});

	describe('FAB-only navigation', () => {
		it('renders the Índice FAB trigger when manualNavTitle is provided', async () => {
			render((await import('./MarkdownDoc.svelte')).default, {
				props: { src: '/docs/sample.md', manualNavTitle: 'Índice del manual' },
			});

			await waitFor(() =>
				expect(screen.getByRole('button', { name: 'Índice' })).toBeInTheDocument(),
			);
		});

		it('omits the FAB when manualNavTitle is not provided', async () => {
			render((await import('./MarkdownDoc.svelte')).default, {
				props: { src: '/docs/sample.md' },
			});

			await waitFor(() => expect(screen.getByText('Contenido.')).toBeInTheDocument());
			expect(screen.queryByRole('button', { name: 'Índice' })).toBeNull();
		});

		it('opens a semantic nav (not a dialog) when the FAB is clicked, and the nav contains the H1 fragment links', async () => {
			render((await import('./MarkdownDoc.svelte')).default, {
				props: { src: '/docs/sample.md', manualNavTitle: 'Índice del manual' },
			});

			const trigger = await screen.findByRole('button', { name: 'Índice' });
			await fireEvent.click(trigger);
			const nav = await screen.findByRole('navigation', { name: 'Índice' });
			expect(nav.getAttribute('role')).not.toBe('dialog');
			expect(nav.id).toBe('manual-index-popover');
			const links = within(nav).getAllByRole('link');
			const hrefs = links.map((link) => link.getAttribute('href'));
			expect(hrefs).toEqual(['#1-filosofia', '#7-combate']);
		});

		it('closes the FAB popover when a link is clicked', async () => {
			render((await import('./MarkdownDoc.svelte')).default, {
				props: { src: '/docs/sample.md', manualNavTitle: 'Índice del manual' },
			});

			const trigger = await screen.findByRole('button', { name: 'Índice' });
			await fireEvent.click(trigger);
			const nav = await screen.findByRole('navigation', { name: 'Índice' });
			const link = within(nav).getAllByRole('link')[0];
			await fireEvent.click(link);
			await waitFor(() => expect(screen.queryByRole('navigation', { name: 'Índice' })).toBeNull());
		});
	});
});
