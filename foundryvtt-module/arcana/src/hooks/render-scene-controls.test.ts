import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import process from 'node:process';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ORBITAL_ICON_STYLES_ID } from './render-scene-controls';

const mocks = vi.hoisted(() => ({
	render: vi.fn(),
	close: vi.fn(),
}));

vi.mock('../apps/gm-chaos-points', () => {
	const GMChaosPointsApp = vi.fn(function (this: { render: unknown; close: unknown }) {
		this.render = mocks.render;
		this.close = mocks.close;
	});
	(GMChaosPointsApp as unknown as { ID: string }).ID = 'gm-chaos-points';
	return { GMChaosPointsApp };
});

type ControlsModule = typeof import('./render-scene-controls');

describe('FEAT foundry-gm-chaos-points — opening from the scene controls', () => {
	let mod: ControlsModule;

	beforeEach(async () => {
		vi.resetModules();
		vi.clearAllMocks();
		vi.stubGlobal('game', { user: { isGM: true } });
		vi.stubGlobal('foundry', { applications: { instances: new Map() } });

		mod = await import('./render-scene-controls');
	});

	afterEach(() => {
		document.getElementById(ORBITAL_ICON_STYLES_ID)?.remove();
		vi.unstubAllGlobals();
	});

	function makeControls(): { tokens: { tools: Record<string, any> } } {
		return { tokens: { tools: {} } };
	}

	it('adds a GM-visible tool to the token controls', () => {
		const controls = makeControls();

		mod.onGetSceneControlButtons(controls);

		const tool = controls.tokens.tools.chaosPoints;
		expect(tool).toBeDefined();
		expect(tool.name).toBe('chaosPoints');
		expect(tool.title).toBe('Puntos de Caos');
		expect(tool.icon).toBe('arcana-orbital-icon');
		expect(tool.button).toBe(true);
		expect(tool.visible).toBe(true);
		expect(typeof tool.onChange).toBe('function');
	});

	it('hides the tool from non-GM users', () => {
		(game as any).user.isGM = false;
		const controls = makeControls();

		mod.onGetSceneControlButtons(controls);

		expect(controls.tokens.tools.chaosPoints.visible).toBe(false);
	});

	it('opens the window from the tool onChange', () => {
		const controls = makeControls();
		mod.onGetSceneControlButtons(controls);

		controls.tokens.tools.chaosPoints.onChange();

		expect(mocks.render).toHaveBeenCalledWith({ force: true });
	});

	it('closes the window when it is already open', () => {
		(foundry.applications as any).instances.set('gm-chaos-points', { close: mocks.close });

		mod.toggleChaosPointsWindow();

		expect(mocks.close).toHaveBeenCalled();
		expect(mocks.render).not.toHaveBeenCalled();
	});

	it('does nothing when the expected controls shape is absent', () => {
		expect(() => mod.onGetSceneControlButtons(undefined)).not.toThrow();
		expect(() => mod.onGetSceneControlButtons(null)).not.toThrow();
		expect(() => mod.onGetSceneControlButtons({})).not.toThrow();
		expect(() => mod.onGetSceneControlButtons({ tokens: {} })).not.toThrow();
		expect(() => mod.onGetSceneControlButtons({ tokens: { tools: null } })).not.toThrow();
	});
});

describe('FEAT foundry-gm-chaos-points-icon — Orbital icon for the chaos control', () => {
	let mod: ControlsModule;

	beforeEach(async () => {
		vi.resetModules();
		vi.clearAllMocks();
		vi.stubGlobal('game', { user: { isGM: true } });
		vi.stubGlobal('foundry', { applications: { instances: new Map() } });

		mod = await import('./render-scene-controls');
	});

	afterEach(() => {
		document.getElementById(mod.ORBITAL_ICON_STYLES_ID)?.remove();
		vi.unstubAllGlobals();
	});

	function makeControls(): { tokens: { tools: Record<string, any> } } {
		return { tokens: { tools: {} } };
	}

	it('exposes the custom icon class and applies it to the tool', () => {
		expect(mod.CHAOS_POINTS_TOOL_ICON).toBe('arcana-orbital-icon');

		const controls = makeControls();
		mod.onGetSceneControlButtons(controls);

		expect(controls.tokens.tools.chaosPoints.icon).toBe('arcana-orbital-icon');
	});

	it('injects the orbital stylesheet once with the bundled module asset URL', () => {
		mod.ensureOrbitalIconStyles();
		mod.ensureOrbitalIconStyles();

		const styles = document.head.querySelectorAll(`#${mod.ORBITAL_ICON_STYLES_ID}`);
		expect(styles).toHaveLength(1);

		const css = (styles[0] as HTMLStyleElement).textContent ?? '';
		expect(css).toContain('.arcana-orbital-icon');
		expect(css).toContain(
			'background: url("systems/arcana/assets/icons/orbital.svg") no-repeat center / 60% auto',
		);
		expect(css).toContain('i.arcana-orbital-icon');
	});

	it('injects the stylesheet when the scene controls hook runs', () => {
		mod.onGetSceneControlButtons(makeControls());

		expect(document.getElementById(mod.ORBITAL_ICON_STYLES_ID)).not.toBeNull();
	});

	it('ships the bundled Orbital asset as a 512 viewBox SVG', () => {
		const asset = readFileSync(resolve(process.cwd(), 'assets/icons/orbital.svg'), 'utf8');

		expect(asset.startsWith('<svg')).toBe(true);
		expect(asset).toContain('viewBox="0 0 512 512"');
		expect(asset).toContain('fill="#fff"');
	});

	it('credits the Orbital icon to Lorc under CC BY 3.0', () => {
		const credits = readFileSync(resolve(process.cwd(), 'CREDITS.md'), 'utf8');

		expect(credits).toContain('assets/icons/orbital.svg');
		expect(credits).toContain('Lorc');
		expect(credits).toContain('game-icons.net');
		expect(credits).toContain('CC BY 3.0');
	});
});
