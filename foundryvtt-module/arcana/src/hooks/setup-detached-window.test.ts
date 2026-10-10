/**
 * Unit tests for setup-detached-window.ts
 * Covers message forwarding and ESC handling wired to ApplicationV2 detached
 * windows through the v14 openDetachedWindow/closeDetachedWindow hooks.
 */

import { afterEach, describe, expect, it, vi } from 'vitest';
import type { MessageHandler } from '../listeners/message-listener';
import {
	DETACHED_STYLES_ID,
	ensureDetachedStyles,
	setupDetachedWindow,
	unregisterDetachedWindow,
} from './setup-detached-window';

type HookHandler = (...args: any[]) => void;

class FakeWindow {
	private readonly listeners = new Map<string, Set<(event: any) => void>>();

	addEventListener(type: string, listener: (event: any) => void): void {
		const listeners = this.listeners.get(type) ?? new Set();
		listeners.add(listener);
		this.listeners.set(type, listeners);
	}

	removeEventListener(type: string, listener: (event: any) => void): void {
		this.listeners.get(type)?.delete(listener);
	}

	dispatch(type: string, event: any): void {
		for (const listener of this.listeners.get(type) ?? []) listener(event);
	}

	listenerCount(type: string): number {
		return this.listeners.get(type)?.size ?? 0;
	}
}

function captureHooks(): Map<string, HookHandler> {
	const handlers = new Map<string, HookHandler>();
	vi.stubGlobal('Hooks', {
		on: vi.fn((hookName: string, handler: HookHandler) => handlers.set(hookName, handler)),
	});
	return handlers;
}

function asWindow(fakeWindow: FakeWindow): Window {
	return fakeWindow as unknown as Window;
}

describe('setupDetachedWindow', () => {
	afterEach(() => {
		unregisterDetachedWindow('sheet-1');
		unregisterDetachedWindow('sheet-2');
		document.getElementById(DETACHED_STYLES_ID)?.remove();
		vi.unstubAllGlobals();
		vi.clearAllMocks();
	});

	it('FEAT foundry-sheet-detach — openDetachedWindow forwards web-to-Foundry messages exactly once', () => {
		const hooks = captureHooks();
		const handler = vi.fn().mockResolvedValue(undefined);
		const detachedWindow = new FakeWindow();

		setupDetachedWindow(handler as unknown as MessageHandler);
		hooks.get('openDetachedWindow')?.('sheet-1', asWindow(detachedWindow));
		detachedWindow.dispatch('message', { data: { type: 'PRECALCULATED_ROLL' } });

		expect(handler).toHaveBeenCalledTimes(1);
	});

	it('FEAT foundry-sheet-detach — closeDetachedWindow removes the forwarded handler and avoids double processing', () => {
		const hooks = captureHooks();
		const handler = vi.fn().mockResolvedValue(undefined);
		const detachedWindow = new FakeWindow();

		setupDetachedWindow(handler as unknown as MessageHandler);
		hooks.get('openDetachedWindow')?.('sheet-1', asWindow(detachedWindow));
		detachedWindow.dispatch('message', { data: { type: 'PRECALCULATED_ROLL' } });
		hooks.get('closeDetachedWindow')?.('sheet-1');
		detachedWindow.dispatch('message', { data: { type: 'PRECALCULATED_ROLL' } });

		expect(handler).toHaveBeenCalledTimes(1);
		expect(detachedWindow.listenerCount('message')).toBe(0);
	});

	it('FEAT foundry-sheet-detach — re-registering the same detached window keeps a single listener', () => {
		const hooks = captureHooks();
		const handler = vi.fn().mockResolvedValue(undefined);
		const detachedWindow = new FakeWindow();

		setupDetachedWindow(handler as unknown as MessageHandler);
		hooks.get('openDetachedWindow')?.('sheet-1', asWindow(detachedWindow));
		hooks.get('openDetachedWindow')?.('sheet-1', asWindow(detachedWindow));
		detachedWindow.dispatch('message', { data: { type: 'PRECALCULATED_ROLL' } });

		expect(detachedWindow.listenerCount('message')).toBe(1);
		expect(handler).toHaveBeenCalledTimes(1);
	});

	it('FEAT foundry-sheet-detach — Escape closes only the detached window application', () => {
		const hooks = captureHooks();
		const closeTarget = vi.fn();
		const closeOther = vi.fn();
		vi.stubGlobal('foundry', {
			applications: {
				instances: new Map([
					['sheet-1', { close: closeTarget }],
					['sheet-2', { close: closeOther }],
				]),
			},
		});

		setupDetachedWindow(vi.fn());

		const targetWindow = new FakeWindow();
		const otherWindow = new FakeWindow();
		hooks.get('openDetachedWindow')?.('sheet-1', asWindow(targetWindow));
		hooks.get('openDetachedWindow')?.('sheet-2', asWindow(otherWindow));

		const escapeEvent = { key: 'Escape', preventDefault: vi.fn(), stopPropagation: vi.fn() };
		targetWindow.dispatch('keydown', escapeEvent);

		expect(closeTarget).toHaveBeenCalledTimes(1);
		expect(closeOther).not.toHaveBeenCalled();
		expect(escapeEvent.preventDefault).toHaveBeenCalledTimes(1);
		expect(escapeEvent.stopPropagation).toHaveBeenCalledTimes(1);
	});

	it('FEAT foundry-sheet-detach — Escape is ignored for other keys and after the window closes', () => {
		const hooks = captureHooks();
		const closeTarget = vi.fn();
		vi.stubGlobal('foundry', {
			applications: { instances: new Map([['sheet-1', { close: closeTarget }]]) },
		});

		setupDetachedWindow(vi.fn());

		const detachedWindow = new FakeWindow();
		hooks.get('openDetachedWindow')?.('sheet-1', asWindow(detachedWindow));

		detachedWindow.dispatch('keydown', {
			key: 'a',
			preventDefault: vi.fn(),
			stopPropagation: vi.fn(),
		});
		expect(closeTarget).not.toHaveBeenCalled();

		hooks.get('closeDetachedWindow')?.('sheet-1');
		detachedWindow.dispatch('keydown', {
			key: 'Escape',
			preventDefault: vi.fn(),
			stopPropagation: vi.fn(),
		});

		expect(closeTarget).not.toHaveBeenCalled();
		expect(detachedWindow.listenerCount('keydown')).toBe(0);
	});

	describe('detached full-bleed stylesheet', () => {
		it('FEAT foundry-sheet-detach — injects a single stylesheet with the full-bleed and re-attach rules', () => {
			ensureDetachedStyles();
			ensureDetachedStyles();

			const styles = document.head.querySelectorAll(`#${DETACHED_STYLES_ID}`);
			expect(styles).toHaveLength(1);

			const css = (styles[0] as HTMLStyleElement).textContent ?? '';
			expect(css).toContain('body.detached .application.arcana');
			expect(css).toContain('left: 0 !important');
			expect(css).toContain('top: 0 !important');
			expect(css).toContain('width: 100% !important');
			expect(css).toContain('height: 100% !important');
			expect(css).toContain('max-width: none !important');
			expect(css).toContain('max-height: none !important');
			expect(css).toContain('body.detached .application.arcana .window-header');
			expect(css).toContain('display: none');
			expect(css).toContain('body.detached .application.arcana .window-content');
			expect(css).toContain('padding: 0');
			expect(css).toContain('border: none');
			expect(css).toContain('border-radius: 0');
			expect(css).toContain('box-shadow: none');
			expect(css).toContain('.arcana-detach-return');
			expect(css).toContain('opacity: 0.35');
			expect(css).toMatch(/\.arcana-detach-return:hover\s*\{[^}]*opacity: 1/);
		});

		it('FEAT foundry-sheet-detach — keeps a single stylesheet and does not overwrite an existing one', () => {
			const existing = document.createElement('style');
			existing.id = DETACHED_STYLES_ID;
			existing.textContent = '/* existing */';
			document.head.append(existing);

			ensureDetachedStyles();

			expect(document.head.querySelectorAll(`#${DETACHED_STYLES_ID}`)).toHaveLength(1);
			expect(existing.textContent).toBe('/* existing */');
		});

		it('FEAT foundry-sheet-detach — setupDetachedWindow injects the stylesheet copied to each detached window', () => {
			captureHooks();

			setupDetachedWindow();

			expect(document.getElementById(DETACHED_STYLES_ID)).not.toBeNull();
		});
	});
});
