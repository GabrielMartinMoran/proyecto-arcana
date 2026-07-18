import { fireEvent, render, screen, waitFor, within } from '@testing-library/svelte';
import { readFile } from 'node:fs/promises';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import ManualIndexFab from './ManualIndexFab.svelte';
import type { MarkdownHeading } from '$lib/services/doc-service';

const SAMPLE_HEADINGS: MarkdownHeading[] = [
	{ level: 1, text: 'Sistema de Rol ARCANA', id: 'sistema-de-rol-arcana' },
	{ level: 1, text: '1. Filosofía', id: '1-filosofía' },
	{ level: 1, text: '7. Combate', id: '7-combate' },
];

const FAB_SOURCE = './src/lib/components/ManualIndexFab.svelte';

const loadFabSource = async () => readFile(FAB_SOURCE, 'utf-8');

describe('ManualIndexFab — upper-right semantic nav popover', () => {
	let matchMediaMock: ReturnType<typeof vi.fn>;

	beforeEach(() => {
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
	});

	afterEach(() => {
		vi.unstubAllGlobals();
	});

	describe('trigger button', () => {
		it('renders nothing when there are no indexable headings', () => {
			const { container } = render(ManualIndexFab, {
				props: { headings: [], title: 'Índice' },
			});
			expect(container.querySelector('button')).toBeNull();
		});

		it('renders a single trigger button with class manual-fab and accessible name "Índice"', () => {
			render(ManualIndexFab, { props: { headings: SAMPLE_HEADINGS, title: 'Índice' } });
			const trigger = screen.getByRole('button', { name: 'Índice' });
			expect(trigger).toBeInTheDocument();
			expect(trigger.className).toContain('manual-fab');
		});

		it('exposes aria-expanded reflecting popover open/close state', async () => {
			render(ManualIndexFab, { props: { headings: SAMPLE_HEADINGS, title: 'Índice' } });
			const trigger = screen.getByRole('button', { name: 'Índice' });
			expect(trigger).toHaveAttribute('aria-expanded', 'false');
			await fireEvent.click(trigger);
			expect(trigger).toHaveAttribute('aria-expanded', 'true');
			await fireEvent.click(trigger);
			expect(trigger).toHaveAttribute('aria-expanded', 'false');
		});

		it('exposes aria-controls targeting the popover id', () => {
			render(ManualIndexFab, { props: { headings: SAMPLE_HEADINGS, title: 'Índice' } });
			const trigger = screen.getByRole('button', { name: 'Índice' });
			expect(trigger).toHaveAttribute('aria-controls', 'manual-index-popover');
		});

		it('does not use aria-haspopup="dialog" (popover is a semantic nav, not a dialog)', () => {
			render(ManualIndexFab, { props: { headings: SAMPLE_HEADINGS, title: 'Índice' } });
			const trigger = screen.getByRole('button', { name: 'Índice' });
			expect(trigger.getAttribute('aria-haspopup')).not.toBe('dialog');
		});
	});

	describe('trigger content (decorative emoji + visible label)', () => {
		it('renders the 📑 emoji wrapped in <span aria-hidden="true"> visually', () => {
			const { container } = render(ManualIndexFab, {
				props: { headings: SAMPLE_HEADINGS, title: 'Índice' },
			});
			const hidden = container.querySelector('span[aria-hidden="true"]');
			expect(hidden).not.toBeNull();
			expect(hidden?.textContent?.trim()).toBe('📑');
		});

		it('renders the visible "Índice" text alongside the decorative emoji', () => {
			const { container } = render(ManualIndexFab, {
				props: { headings: SAMPLE_HEADINGS, title: 'Índice' },
			});
			const trigger = container.querySelector('button.manual-fab');
			const text = trigger?.textContent?.replace(/\s+/g, ' ').trim();
			expect(text).toContain('📑');
			expect(text).toContain('Índice');
		});

		it('keeps the decorative emoji aria-hidden in the source so screen readers ignore it', async () => {
			const source = await loadFabSource();
			expect(source).toMatch(/<span\s+aria-hidden="true">📑<\/span>/);
		});
	});

	describe('popover semantics', () => {
		it('opens a semantic <nav id="manual-index-popover" aria-label="Índice">, not a dialog', async () => {
			render(ManualIndexFab, { props: { headings: SAMPLE_HEADINGS, title: 'Índice' } });
			const trigger = screen.getByRole('button', { name: 'Índice' });
			await fireEvent.click(trigger);
			const popover = await screen.findByRole('navigation', { name: 'Índice' });
			expect(popover).toBeInTheDocument();
			expect(popover.id).toBe('manual-index-popover');
			expect(popover.getAttribute('role')).not.toBe('dialog');
		});

		it('exposes the same native hash hrefs derived from H1 ids, excluding the first title H1', async () => {
			render(ManualIndexFab, { props: { headings: SAMPLE_HEADINGS, title: 'Índice' } });
			const trigger = screen.getByRole('button', { name: 'Índice' });
			await fireEvent.click(trigger);
			const popover = await screen.findByRole('navigation', { name: 'Índice' });
			const links = within(popover).getAllByRole('link');
			const hrefs = links.map((link) => link.getAttribute('href'));
			expect(hrefs).toEqual(['#1-filosofía', '#7-combate']);
			for (const link of links) {
				expect(link.getAttribute('href')?.startsWith('#')).toBe(true);
			}
		});

		it('keeps the manual-index-popover id wired via the <nav> element in source', async () => {
			const source = await loadFabSource();
			const navOpen = source.match(/<nav\b[^>]*>/);
			expect(navOpen).not.toBeNull();
			const attrs = navOpen?.[0] ?? '';
			expect(attrs).toMatch(/\bid=\{POPOVER_ID\}/);
			expect(attrs).toMatch(/\baria-label=\{title\}/);
		});
	});

	describe('interaction: Escape / outside / link activation', () => {
		it('closes on Escape and restores focus to the trigger', async () => {
			render(ManualIndexFab, { props: { headings: SAMPLE_HEADINGS, title: 'Índice' } });
			const trigger = screen.getByRole('button', { name: 'Índice' });
			await fireEvent.click(trigger);
			await screen.findByRole('navigation', { name: 'Índice' });
			await fireEvent.keyDown(document.body, { key: 'Escape' });
			await waitFor(() => expect(screen.queryByRole('navigation', { name: 'Índice' })).toBeNull());
			expect(trigger).toHaveFocus();
			expect(trigger).toHaveAttribute('aria-expanded', 'false');
		});

		it('closes on outside mousedown and restores focus to the trigger', async () => {
			render(ManualIndexFab, { props: { headings: SAMPLE_HEADINGS, title: 'Índice' } });
			const trigger = screen.getByRole('button', { name: 'Índice' });
			await fireEvent.click(trigger);
			await screen.findByRole('navigation', { name: 'Índice' });
			await fireEvent.mouseDown(document.body);
			await waitFor(() => expect(screen.queryByRole('navigation', { name: 'Índice' })).toBeNull());
			expect(trigger).toHaveFocus();
			expect(trigger).toHaveAttribute('aria-expanded', 'false');
		});

		it('closes on link activation and does not restore focus to the trigger (native fragment follows)', async () => {
			render(ManualIndexFab, { props: { headings: SAMPLE_HEADINGS, title: 'Índice' } });
			const trigger = screen.getByRole('button', { name: 'Índice' });
			await fireEvent.click(trigger);
			const popover = await screen.findByRole('navigation', { name: 'Índice' });
			const link = within(popover).getAllByRole('link')[0];
			await fireEvent.click(link);
			await waitFor(() => expect(screen.queryByRole('navigation', { name: 'Índice' })).toBeNull());
			expect(document.activeElement).not.toBe(trigger);
		});

		it('does not move focus into the popover when it opens (no programmatic focus on open)', async () => {
			render(ManualIndexFab, { props: { headings: SAMPLE_HEADINGS, title: 'Índice' } });
			const trigger = screen.getByRole('button', { name: 'Índice' });
			trigger.focus();
			await fireEvent.click(trigger);
			const popover = await screen.findByRole('navigation', { name: 'Índice' });
			expect(popover.contains(document.activeElement)).toBe(false);
		});
	});

	describe('CSS positioning source assertions', () => {
		it('declares z-index 1002 and a 44px touch target in source', async () => {
			const source = await loadFabSource();
			expect(source).toMatch(/z-index:\s*1002/);
			expect(source).toMatch(/min-width:\s*44px/);
			expect(source).toMatch(/min-height:\s*44px/);
		});

		it('pins the FAB top to var(--spacing-md) on desktop >1280', async () => {
			const source = await loadFabSource();
			const desktopBlock =
				source.match(/@media\s+\(min-width:\s*1281px\)\s*\{[\s\S]*?\}\s*\}/)?.[0] ?? '';
			expect(desktopBlock).toContain('min-width: 1281px');
			expect(desktopBlock).toMatch(/\.manual-fab\s*\{[^}]*top:\s*var\(--spacing-md\)/);
		});

		it('pins the FAB right to calc(var(--dice-panel-width) + var(--spacing-md)) on desktop >1280', async () => {
			const source = await loadFabSource();
			const desktopBlock =
				source.match(/@media\s+\(min-width:\s*1281px\)\s*\{[\s\S]*?\}\s*\}/)?.[0] ?? '';
			expect(desktopBlock).toMatch(
				/right:\s*calc\(var\(--dice-panel-width\)\s*\+\s*var\(--spacing-md\)\)/,
			);
		});

		it('pins the FAB top to calc(var(--top-bar-height) + var(--spacing-md)) and right to var(--spacing-md) on narrow <=1280', async () => {
			const source = await loadFabSource();
			const baseFabBlock = source.match(/\.manual-fab\s*\{([\s\S]*?)\}/)?.[1] ?? '';
			expect(baseFabBlock).toMatch(
				/top:\s*calc\(var\(--top-bar-height\)\s*\+\s*var\(--spacing-md\)\)/,
			);
			expect(baseFabBlock).toMatch(/right:\s*var\(--spacing-md\)/);
		});

		it('declares no left anchor on the FAB in any breakpoint', async () => {
			const source = await loadFabSource();
			const fabBaseBlock = source.match(/\.manual-fab\s*\{([\s\S]*?)\}/)?.[1] ?? '';
			expect(fabBaseBlock).not.toMatch(/\bleft\s*:/);
			const desktopBlock =
				source.match(/@media\s+\(min-width:\s*1281px\)\s*\{[\s\S]*?\}\s*\}/)?.[0] ?? '';
			const desktopFab = desktopBlock.match(/\.manual-fab\s*\{([\s\S]*?)\}/)?.[1] ?? '';
			expect(desktopFab).not.toMatch(/\bleft\s*:/);
		});

		it('opens the popover directly below the trigger: top calc(var(--spacing-md) + 52px) and right to calc(var(--dice-panel-width) + var(--spacing-md)) on desktop >1280', async () => {
			const source = await loadFabSource();
			const desktopBlock =
				source.match(/@media\s+\(min-width:\s*1281px\)\s*\{[\s\S]*?\}\s*\}/)?.[0] ?? '';
			expect(desktopBlock).toMatch(
				/\.manual-fab__popover\s*\{[^}]*top:\s*calc\(var\(--spacing-md\)\s*\+\s*52px\)/,
			);
			expect(desktopBlock).toMatch(
				/right:\s*calc\(var\(--dice-panel-width\)\s*\+\s*var\(--spacing-md\)\)/,
			);
		});

		it('opens the popover directly below the trigger: top calc(var(--top-bar-height) + var(--spacing-md) + 52px) and right to var(--spacing-md) on narrow <=1280', async () => {
			const source = await loadFabSource();
			const basePopoverBlock = source.match(/\.manual-fab__popover\s*\{([\s\S]*?)\}/)?.[1] ?? '';
			expect(basePopoverBlock).toMatch(
				/top:\s*calc\(var\(--top-bar-height\)\s*\+\s*var\(--spacing-md\)\s*\+\s*52px\)/,
			);
			expect(basePopoverBlock).toMatch(/right:\s*var\(--spacing-md\)/);
		});

		it('declares no left anchor on the popover in any breakpoint', async () => {
			const source = await loadFabSource();
			const popoverBaseBlock = source.match(/\.manual-fab__popover\s*\{([\s\S]*?)\}/)?.[1] ?? '';
			expect(popoverBaseBlock).not.toMatch(/\bleft\s*:/);
			const desktopBlock =
				source.match(/@media\s+\(min-width:\s*1281px\)\s*\{[\s\S]*?\}\s*\}/)?.[0] ?? '';
			const desktopPopover =
				desktopBlock.match(/\.manual-fab__popover\s*\{([\s\S]*?)\}/)?.[1] ?? '';
			expect(desktopPopover).not.toMatch(/\bleft\s*:/);
		});

		it('caps the popover height at 60vh and uses viewport-safe width in source', async () => {
			const source = await loadFabSource();
			expect(source).toMatch(/max-height:\s*60vh/);
		});
	});

	describe('link color (app-style non-blue link)', () => {
		it('uses var(--text-primary) for .manual-fab__link color, not var(--brand-link)', async () => {
			const source = await loadFabSource();
			const linkBlock = source.match(/\.manual-fab__link\s*\{([\s\S]*?)\}/)?.[1] ?? '';
			expect(linkBlock).toMatch(/color:\s*var\(--text-primary\)/);
			expect(linkBlock).not.toMatch(/var\(--brand-link\)/);
		});

		it('declares &:visited with var(--text-primary) on .manual-fab__link', async () => {
			const source = await loadFabSource();
			// Match the nested &:visited rule inside the .manual-fab__link block.
			expect(source).toMatch(
				/\.manual-fab__link\s*\{[\s\S]*?&:visited\s*\{[\s\S]*?color:\s*var\(--text-primary\)[\s\S]*?\}[\s\S]*?\}/,
			);
		});

		it('retains hover/focus background and underline on .manual-fab__link', async () => {
			const source = await loadFabSource();
			expect(source).toMatch(
				/\.manual-fab__link:hover,\s*\.manual-fab__link:focus-visible\s*\{[\s\S]*?background:\s*var\(--disabled-bg\)[\s\S]*?text-decoration:\s*underline[\s\S]*?\}/,
			);
		});
	});
});
