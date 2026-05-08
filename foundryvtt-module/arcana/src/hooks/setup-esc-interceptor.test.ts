/**
 * Unit tests for setup-esc-interceptor.ts
 * Tests ESC key interception for collapsible windows (V1 + V2)
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { setupEscInterceptor } = await import('./setup-esc-interceptor');

describe('setupEscInterceptor', () => {
	let originalOnDown: ReturnType<typeof vi.fn>;
	let binding: any;
	let mockV2Window: any;

	beforeEach(() => {
		originalOnDown = vi.fn().mockReturnValue(true);
		binding = {
			action: 'core.dismiss',
			onDown: originalOnDown,
		};
		mockV2Window = createV2Window({ zIndex: 10 });

		vi.stubGlobal('game', {
			keybindings: {
				activeKeys: new Map([['Escape', [binding]]]),
			},
		});

		vi.stubGlobal('ui', { windows: {} });
		vi.stubGlobal('foundry', { applications: { instances: new Map() } });
	});

	afterEach(() => {
		vi.unstubAllGlobals();
		vi.clearAllMocks();
	});

	function createV2Window(opts: {
		zIndex: number;
		minimized?: boolean;
		hasFrame?: boolean;
		minimizable?: boolean;
		rendered?: boolean;
	}): any {
		return {
			options: { window: { minimizable: opts.minimizable !== false } },
			hasFrame: opts.hasFrame !== false,
			minimized: opts.minimized === true,
			position: { zIndex: opts.zIndex },
			rendered: opts.rendered !== false,
			close: vi.fn(),
			bringToFront: vi.fn(),
		};
	}

	function createV1Window(opts: {
		zIndex: number;
		minimized?: boolean;
		popOut?: boolean;
		minimizable?: boolean;
	}): any {
		return {
			options: { minimizable: opts.minimizable !== false },
			popOut: opts.popOut !== false,
			_minimized: opts.minimized === true,
			position: { zIndex: opts.zIndex },
			close: vi.fn(),
			bringToTop: vi.fn(),
		};
	}

	function createNonCollapsibleWindow(opts: { zIndex: number }): any {
		return {
			options: {},
			position: { zIndex: opts.zIndex },
			close: vi.fn(),
		};
	}

	it('closes active V2 collapsible window and brings next to front', () => {
		const w1 = createV2Window({ zIndex: 100 });
		const w2 = createV2Window({ zIndex: 90 });
		(foundry.applications as any).instances.set('v2-a', w1);
		(foundry.applications as any).instances.set('v2-b', w2);

		setupEscInterceptor();
		const result = binding.onDown(new KeyboardEvent('keydown', { key: 'Escape' }));

		expect(result).toBe(true);
		expect(w1.close).toHaveBeenCalledOnce();
		expect(w2.close).not.toHaveBeenCalled();
		expect(w2.bringToFront).toHaveBeenCalledOnce();
		expect(originalOnDown).not.toHaveBeenCalled();
	});

	it('skips minimized V2 window', () => {
		const wMin = createV2Window({ zIndex: 100, minimized: true });
		const wOpen = createV2Window({ zIndex: 90 });
		(foundry.applications as any).instances.set('v2-min', wMin);
		(foundry.applications as any).instances.set('v2-open', wOpen);

		setupEscInterceptor();
		const result = binding.onDown(new KeyboardEvent('keydown', { key: 'Escape' }));

		expect(result).toBe(true);
		expect(wMin.close).not.toHaveBeenCalled();
		expect(wOpen.close).toHaveBeenCalledOnce();
		expect(originalOnDown).not.toHaveBeenCalled();
	});

	it('closes active V1 collapsible window and brings next to top', () => {
		const w1 = createV1Window({ zIndex: 100 });
		const w2 = createV1Window({ zIndex: 90 });
		(ui as any).windows = { a: w1, b: w2 };

		setupEscInterceptor();
		const result = binding.onDown(new KeyboardEvent('keydown', { key: 'Escape' }));

		expect(result).toBe(true);
		expect(w1.close).toHaveBeenCalledOnce();
		expect(w2.close).not.toHaveBeenCalled();
		expect(w2.bringToTop).toHaveBeenCalledOnce();
		expect(originalOnDown).not.toHaveBeenCalled();
	});

	it('delegates to original when no collapsible window is open', () => {
		const wNonCollapsible = createNonCollapsibleWindow({ zIndex: 100 });
		(ui as any).windows = { a: wNonCollapsible };

		setupEscInterceptor();
		const result = binding.onDown(new KeyboardEvent('keydown', { key: 'Escape' }));

		expect(result).toBe(true);
		expect(originalOnDown).toHaveBeenCalledOnce();
		expect(wNonCollapsible.close).not.toHaveBeenCalled();
	});

	it('delegates to original when frontmost window is non-collapsible', () => {
		const wCollapsible = createV2Window({ zIndex: 90 });
		const wFrontNonCollapsible = createNonCollapsibleWindow({ zIndex: 100 });
		(foundry.applications as any).instances.set('v2', wCollapsible);
		(ui as any).windows = { front: wFrontNonCollapsible };

		setupEscInterceptor();
		const result = binding.onDown(new KeyboardEvent('keydown', { key: 'Escape' }));

		expect(result).toBe(true);
		expect(originalOnDown).toHaveBeenCalledOnce();
		expect(wCollapsible.close).not.toHaveBeenCalled();
		expect(wFrontNonCollapsible.close).not.toHaveBeenCalled();
	});

	it('brings next window to front after closing active', () => {
		const w1 = createV2Window({ zIndex: 100 });
		const w2 = createV1Window({ zIndex: 95 });
		const w3 = createV2Window({ zIndex: 90 });
		(foundry.applications as any).instances.set('v2-1', w1);
		(ui as any).windows = { v1: w2, v2: w3 };

		setupEscInterceptor();
		binding.onDown(new KeyboardEvent('keydown', { key: 'Escape' }));

		expect(w1.close).toHaveBeenCalledOnce();
		expect(w2.bringToTop).toHaveBeenCalledOnce();
		expect(w3.bringToFront).not.toHaveBeenCalled();
	});

	it('handles mixed V1/V2 stack ordered by z-index', () => {
		const v2High = createV2Window({ zIndex: 150 });
		const v1Mid = createV1Window({ zIndex: 120 });
		const v2Low = createV2Window({ zIndex: 100 });
		(foundry.applications as any).instances.set('v2-high', v2High);
		(ui as any).windows = { v1: v1Mid, v2: v2Low };

		setupEscInterceptor();
		binding.onDown(new KeyboardEvent('keydown', { key: 'Escape' }));

		expect(v2High.close).toHaveBeenCalledOnce();
		expect(v1Mid.bringToTop).toHaveBeenCalledOnce();
		expect(v2Low.bringToFront).not.toHaveBeenCalled();
	});

	it('preserves original handler reference', () => {
		setupEscInterceptor();
		expect(binding.onDown).not.toBe(originalOnDown);
		// Trigger with no windows to ensure original is called
		binding.onDown(new KeyboardEvent('keydown', { key: 'Escape' }));
		expect(originalOnDown).toHaveBeenCalledOnce();
	});

	it('does nothing when Escape binding is missing', () => {
		game.keybindings.activeKeys = new Map();
		expect(() => setupEscInterceptor()).not.toThrow();
	});

	it('does not treat GamePause-like objects as collapsible', () => {
		const pauseBanner = {
			id: 'pause',
			hasFrame: true,
			minimized: false,
			position: { zIndex: 100 },
			minimize: vi.fn(),
			close: vi.fn(),
		};
		// GamePause tiene minimize() en prototype pero NO tiene window.minimizable ni popOut
		vi.stubGlobal('ui', { ...ui, windows: { pause: pauseBanner } });

		const event = new KeyboardEvent('keydown', { key: 'Escape' });
		setupEscInterceptor();
		binding.onDown(event);

		expect(pauseBanner.close).not.toHaveBeenCalled();
		expect(originalOnDown).toHaveBeenCalledWith(event);
	});

	it('closes context menu before any collapsible window', () => {
		const contextClose = vi.fn();
		vi.stubGlobal('ui', {
			...ui,
			windows: { sheet: mockV2Window },
			context: { menu: [{ close: contextClose }], close: contextClose },
		});

		setupEscInterceptor();
		const event = new KeyboardEvent('keydown', { key: 'Escape' });
		binding.onDown(event);

		expect(contextClose).toHaveBeenCalled();
		expect(mockV2Window.close).not.toHaveBeenCalled();
	});

	it('closes active tour before any collapsible window', () => {
		const tourClose = vi.fn();
		vi.stubGlobal('Tour', { tourInProgress: true, close: tourClose });
		vi.stubGlobal('ui', { ...ui, windows: { sheet: mockV2Window } });

		setupEscInterceptor();
		const event = new KeyboardEvent('keydown', { key: 'Escape' });
		binding.onDown(event);

		expect(tourClose).toHaveBeenCalled();
		expect(mockV2Window.close).not.toHaveBeenCalled();
	});

	it('closes active window before releasing canvas selection', () => {
		const releaseAll = vi.fn();
		vi.stubGlobal('canvas', { activeLayer: { controlled: [{}, {}], releaseAll } });
		vi.stubGlobal('ui', { ...ui, windows: { sheet: mockV2Window } });

		setupEscInterceptor();
		const event = new KeyboardEvent('keydown', { key: 'Escape' });
		binding.onDown(event);

		expect(mockV2Window.close).toHaveBeenCalledOnce();
		expect(releaseAll).not.toHaveBeenCalled();
	});

	it('closes collapsible window before canvas when both are active', () => {
		const releaseAll = vi.fn();
		const w1 = createV2Window({ zIndex: 100 });
		vi.stubGlobal('canvas', { activeLayer: { controlled: [{}, {}], releaseAll } });
		vi.stubGlobal('foundry', { applications: { instances: new Map([['v2-a', w1]]) } });
		vi.stubGlobal('ui', { windows: {} });

		setupEscInterceptor();
		const event = new KeyboardEvent('keydown', { key: 'Escape' });
		binding.onDown(event);

		expect(w1.close).toHaveBeenCalledOnce();
		expect(releaseAll).not.toHaveBeenCalled();
	});

	it('releases canvas selection when no collapsible windows are open', () => {
		const releaseAll = vi.fn();
		const wNonCollapsible = createNonCollapsibleWindow({ zIndex: 100 });
		vi.stubGlobal('canvas', { activeLayer: { controlled: [{}, {}], releaseAll } });
		vi.stubGlobal('ui', { windows: { a: wNonCollapsible } });

		setupEscInterceptor();
		const event = new KeyboardEvent('keydown', { key: 'Escape' });
		binding.onDown(event);

		expect(releaseAll).toHaveBeenCalledOnce();
		expect(wNonCollapsible.close).not.toHaveBeenCalled();
	});

	it('dismisses notifications after closing windows', () => {
		const closeAll = vi.fn();
		vi.stubGlobal('ui', {
			...ui,
			windows: { sheet: mockV2Window },
			notifications: { queue: [{ id: 1 }], closeAll },
		});

		setupEscInterceptor();
		const event = new KeyboardEvent('keydown', { key: 'Escape' });
		binding.onDown(event);

		expect(mockV2Window.close).toHaveBeenCalledOnce();
		expect(closeAll).not.toHaveBeenCalled();
	});

	it('dismisses notifications when no windows or canvas are active', () => {
		const closeAll = vi.fn();
		vi.stubGlobal('ui', {
			...ui,
			windows: {},
			notifications: { queue: [{ id: 1 }], closeAll },
		});

		setupEscInterceptor();
		const event = new KeyboardEvent('keydown', { key: 'Escape' });
		binding.onDown(event);

		expect(closeAll).toHaveBeenCalledOnce();
	});

	it('delegates to original handler when no priority items or windows exist', () => {
		vi.stubGlobal('ui', { ...ui, windows: {} });
		// No context, no tour, no canvas, no notifications

		setupEscInterceptor();
		const event = new KeyboardEvent('keydown', { key: 'Escape' });
		const result = binding.onDown(event);

		expect(originalOnDown).toHaveBeenCalledWith(event);
		expect(result).toBe(true);
	});

	it('does not close minimized V2 window when it is the only window left', () => {
		const wMin = createV2Window({ zIndex: 100, minimized: true });
		vi.stubGlobal('foundry', {
			applications: { instances: new Map([['v2-min', wMin]]) },
		});
		vi.stubGlobal('ui', { windows: {} });

		setupEscInterceptor();
		const result = binding.onDown({} as any);

		expect(wMin.close).not.toHaveBeenCalled();
		expect(originalOnDown).not.toHaveBeenCalled();
		expect(result).toBe(true);
	});

	it('does not close minimized V1 window when it is the only window left', () => {
		const wMin = createV1Window({ zIndex: 100, minimized: true });
		vi.stubGlobal('ui', { windows: { min: wMin } });
		vi.stubGlobal('foundry', { applications: { instances: new Map() } });

		setupEscInterceptor();
		const result = binding.onDown({} as any);

		expect(wMin.close).not.toHaveBeenCalled();
		expect(originalOnDown).not.toHaveBeenCalled();
		expect(result).toBe(true);
	});

	it('deselects canvas tokens when only minimized V2 window remains', () => {
		const wMin = createV2Window({ zIndex: 100, minimized: true });
		const releaseAll = vi.fn();
		vi.stubGlobal('foundry', {
			applications: { instances: new Map([['v2-min', wMin]]) },
		});
		vi.stubGlobal('ui', { windows: {} });
		vi.stubGlobal('canvas', { activeLayer: { controlled: [{}, {}], releaseAll } });

		setupEscInterceptor();
		const result = binding.onDown({} as any);

		expect(wMin.close).not.toHaveBeenCalled();
		expect(releaseAll).toHaveBeenCalled();
		expect(originalOnDown).not.toHaveBeenCalled();
		expect(result).toBe(true);
	});

	it('deselects canvas tokens when only minimized V1 window remains', () => {
		const wMin = createV1Window({ zIndex: 100, minimized: true });
		const releaseAll = vi.fn();
		vi.stubGlobal('ui', { windows: { min: wMin } });
		vi.stubGlobal('foundry', { applications: { instances: new Map() } });
		vi.stubGlobal('canvas', { activeLayer: { controlled: [{}], releaseAll } });

		setupEscInterceptor();
		const result = binding.onDown({} as any);

		expect(wMin.close).not.toHaveBeenCalled();
		expect(releaseAll).toHaveBeenCalled();
		expect(originalOnDown).not.toHaveBeenCalled();
		expect(result).toBe(true);
	});

	it('ignores closed V2 instances when selecting active window', () => {
		const closedWindow = createV2Window({
			zIndex: 100,
			rendered: false,
		});
		const openWindow = createV2Window({
			zIndex: 50,
			rendered: true,
		});

		vi.stubGlobal('foundry', {
			applications: {
				instances: new Map([
					['closed', closedWindow],
					['open', openWindow],
				]),
			},
		});
		vi.stubGlobal('ui', { windows: {} });

		setupEscInterceptor();
		const result = binding.onDown({} as any);

		expect(closedWindow.close).not.toHaveBeenCalled();
		expect(openWindow.close).toHaveBeenCalledOnce();
		expect(result).toBe(true);
	});
});
