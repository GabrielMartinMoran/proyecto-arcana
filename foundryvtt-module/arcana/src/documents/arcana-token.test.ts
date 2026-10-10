/**
 * Unit tests for arcana-token.ts
 *
 * Covers the pure temporary-HP overlay geometry and the `_drawBar` override
 * that appends the cyan segment to the health bar. PIXI is not available in
 * jsdom, so all the math lives in `computeTemporaryHpOverlay` and the override
 * is exercised with a Graphics mock.
 */

import { afterEach, beforeEach, describe, expect, it, vi, type MockInstance } from 'vitest';

class MockTokenBase {
	document: any = null;

	get actor(): any {
		return this.document?.actor ?? null;
	}

	_drawBar(_index: number, _bar: unknown, _data: unknown): boolean {
		return true;
	}

	_getAnimationData(): Record<string, any> {
		return { x: 0, y: 0, bar1: { value: 6, max: 12 }, bar2: { value: 0, max: 0 } };
	}

	_getAnimationDuration(_from: unknown, _to: unknown, _options?: unknown): number {
		return 0;
	}
}

// arcana-token.ts imports isHealthBarAttribute from arcana-actor.ts, whose
// ArcanaActor class extends the global Actor at module load.
vi.stubGlobal('Actor', class {});
vi.stubGlobal('foundry', { canvas: { placeables: { Token: MockTokenBase } } });
vi.stubGlobal('canvas', { dimensions: { uiScale: 1 } });

const { ArcanaToken, TEMP_HP_COLOR, computeTempAnimationDuration, computeTemporaryHpOverlay } =
	await import('./arcana-token');

const HEALTH_BAR_DATA = {
	type: 'bar',
	attribute: 'health',
	value: 6,
	max: 12,
	editable: true,
};

const BASE_OVERLAY_INPUT = {
	max: 12,
	temp: 3,
	barWidth: 96,
	barHeight: 8,
	uiScale: 1,
};

function createBarMock(): Record<string, any> {
	const bar: Record<string, any> = {};
	bar.beginFill = vi.fn(() => bar);
	bar.lineStyle = vi.fn(() => bar);
	bar.drawRoundedRect = vi.fn(() => bar);
	bar.endFill = vi.fn(() => bar);
	return bar;
}

function createToken({
	temp = 0,
	height = 1,
	barWidth = 96,
	hasActor = true,
	attribute = 'system.health',
	includeTemp = true,
}: {
	temp?: number;
	height?: number;
	barWidth?: number;
	hasActor?: boolean;
	attribute?: string;
	includeTemp?: boolean;
} = {}): any {
	const health = includeTemp ? { value: 6, max: 12, temp } : { value: 6, max: 12 };
	const token = new (ArcanaToken as any)();
	token.document = {
		getSize: () => ({ width: barWidth, height: 96 }),
		height,
		bar1: { attribute, value: 6, max: 12 },
		bar2: { attribute: null, value: null, max: null },
		actor: hasActor ? { system: { health } } : null,
	};
	return token;
}

describe('computeTemporaryHpOverlay', () => {
	it('should return null when temporary HP is zero', () => {
		expect(computeTemporaryHpOverlay({ ...BASE_OVERLAY_INPUT, temp: 0 })).toBeNull();
	});

	it('should return null when maximum health is zero', () => {
		expect(computeTemporaryHpOverlay({ ...BASE_OVERLAY_INPUT, max: 0 })).toBeNull();
	});

	it.each([
		['negative temp', { temp: -3 }],
		['NaN temp', { temp: Number.NaN }],
		['negative max', { max: -12 }],
		['NaN max', { max: Number.NaN }],
		['zero bar width', { barWidth: 0 }],
		['negative bar height', { barHeight: -8 }],
		['NaN bar height', { barHeight: Number.NaN }],
	])('should return null for %s', (_label, overrides) => {
		expect(computeTemporaryHpOverlay({ ...BASE_OVERLAY_INPUT, ...overrides })).toBeNull();
	});

	it('should span the temporary fraction of the bar with the core inset', () => {
		expect(computeTemporaryHpOverlay(BASE_OVERLAY_INPUT)).toEqual({
			x: 1,
			y: 1,
			width: 22,
			height: 6,
			radius: 2,
		});
	});

	it('should keep the temporary proportion when temporary HP exceeds current health', () => {
		// 5/12 of a 96px bar, inset by 1px on each side: 40 - 2
		expect(computeTemporaryHpOverlay({ ...BASE_OVERLAY_INPUT, temp: 5 })).toEqual({
			x: 1,
			y: 1,
			width: 38,
			height: 6,
			radius: 2,
		});
	});

	it('should not overflow the bar when temporary HP exceeds maximum health', () => {
		expect(computeTemporaryHpOverlay({ ...BASE_OVERLAY_INPUT, temp: 30 })).toEqual({
			x: 1,
			y: 1,
			width: 94,
			height: 6,
			radius: 2,
		});
	});

	it('should keep the temporary fraction when temp + value exceed maximum health', () => {
		// The overlay geometry only depends on temp/max; value must not widen it.
		expect(computeTemporaryHpOverlay({ ...BASE_OVERLAY_INPUT, temp: 5, max: 12 })).toEqual({
			x: 1,
			y: 1,
			width: 38,
			height: 6,
			radius: 2,
		});
	});

	it('should preserve fractional proportions', () => {
		expect(computeTemporaryHpOverlay({ ...BASE_OVERLAY_INPUT, temp: 1.5 })).toEqual({
			x: 1,
			y: 1,
			width: 10,
			height: 6,
			radius: 2,
		});
	});

	it('should ignore the inset when uiScale is zero', () => {
		expect(computeTemporaryHpOverlay({ ...BASE_OVERLAY_INPUT, uiScale: 0 })).toEqual({
			x: 0,
			y: 0,
			width: 24,
			height: 8,
			radius: 0,
		});
	});

	it.each([
		['NaN', Number.NaN],
		['negative', -1],
	])('should treat a %s uiScale as zero', (_label, uiScale) => {
		expect(computeTemporaryHpOverlay({ ...BASE_OVERLAY_INPUT, uiScale })).toEqual({
			x: 0,
			y: 0,
			width: 24,
			height: 8,
			radius: 0,
		});
	});

	it('should return null when the inset leaves no drawable area', () => {
		expect(
			computeTemporaryHpOverlay({ ...BASE_OVERLAY_INPUT, temp: 0.01, max: 100, barWidth: 8 }),
		).toBeNull();
	});
});

describe('computeTempAnimationDuration', () => {
	it.each([
		['an increase', 0, 3, 12, 375],
		['a decrease', 6, 1, 12, 625],
		['fractional temporary HP', 0.5, 2, 6, 375],
		['a full bar change', 0, 12, 12, 1500],
	])('should scale 1500ms per full bar for %s', (_label, fromTemp, toTemp, max, expected) => {
		expect(computeTempAnimationDuration(fromTemp, toTemp, max)).toBe(expected);
	});

	it.each([
		['no change', 3, 3, 12],
		['a zero maximum', 0, 3, 0],
		['a negative maximum', 0, 3, -12],
		['a NaN previous temporary HP', Number.NaN, 3, 12],
		['a NaN next temporary HP', 0, Number.NaN, 12],
		['a NaN maximum', 0, 3, Number.NaN],
		['an infinite maximum', 0, 3, Number.POSITIVE_INFINITY],
	])('should return zero for %s', (_label, fromTemp, toTemp, max) => {
		expect(computeTempAnimationDuration(fromTemp, toTemp, max)).toBe(0);
	});
});

describe('FEAT temp-hp-token-bar-visual — ArcanaToken._getAnimationData', () => {
	it('includes the actor temporary HP on bar1 when bar1 tracks health', () => {
		const token = createToken({ temp: 3 });

		expect(token._getAnimationData().bar1.temp).toBe(3);
	});

	it('preserves the core animation data', () => {
		const token = createToken({ temp: 3 });

		const data = token._getAnimationData();

		expect(data.x).toBe(0);
		expect(data.bar2).toEqual({ value: 0, max: 0 });
	});

	it('always includes the temporary HP key for a health bar, even at zero', () => {
		const token = createToken({ temp: 0 });

		const data = token._getAnimationData();

		expect('temp' in data.bar1).toBe(true);
		expect(data.bar1.temp).toBe(0);
	});

	it('does not include bar1.temp when bar1 tracks a non-health attribute', () => {
		const token = createToken({ temp: 5, attribute: 'system.initiative' });

		expect(token._getAnimationData().bar1).not.toHaveProperty('temp');
	});

	it('does not include bar1.temp without an actor', () => {
		const token = createToken({ hasActor: false });

		expect(token._getAnimationData().bar1).not.toHaveProperty('temp');
	});

	it('does not include bar1.temp when the actor exposes no finite temporary HP', () => {
		const token = createToken({ temp: Number.NaN });

		expect(token._getAnimationData().bar1).not.toHaveProperty('temp');
	});

	it('does not include bar1.temp when the actor has no temporary HP field', () => {
		const token = createToken({ includeTemp: false });

		expect(token._getAnimationData().bar1).not.toHaveProperty('temp');
	});
});

describe('FEAT temp-hp-token-bar-visual — ArcanaToken._getAnimationDuration', () => {
	let superSpy: MockInstance<typeof MockTokenBase.prototype._getAnimationDuration>;

	beforeEach(() => {
		superSpy = vi.spyOn(MockTokenBase.prototype, '_getAnimationDuration');
	});

	afterEach(() => {
		superSpy.mockRestore();
	});

	const from = { x: 0, y: 0, rotation: 0, bar1: { value: 6, max: 12, temp: 3 }, bar2: {} };

	it('extends a zero core duration with the temporary HP fraction', () => {
		superSpy.mockReturnValue(0);
		const token = createToken();

		expect(token._getAnimationDuration(from, { bar1: { temp: 6 } }, {})).toBe(375);
	});

	it('keeps the core duration when it is longer than the temporary HP fraction', () => {
		superSpy.mockReturnValue(1000);
		const token = createToken();

		expect(token._getAnimationDuration(from, { bar1: { temp: 6 } }, {})).toBe(1000);
	});

	it('uses the temporary HP fraction when it is longer than the core duration', () => {
		superSpy.mockReturnValue(100);
		const token = createToken();

		expect(
			token._getAnimationDuration(
				{ ...from, bar1: { ...from.bar1, temp: 0 } },
				{ bar1: { temp: 12 } },
				{},
			),
		).toBe(1500);
	});

	it('prefers the target maximum health when the update provides it', () => {
		superSpy.mockReturnValue(0);
		const token = createToken();

		expect(
			token._getAnimationDuration(
				{ ...from, bar1: { ...from.bar1, temp: 0 } },
				{ bar1: { temp: 6, max: 24 } },
				{},
			),
		).toBe(375);
	});

	it('takes the absolute difference so decreases animate too', () => {
		superSpy.mockReturnValue(0);
		const token = createToken();

		// |3 - 1| / 12 of 1500 ms
		expect(token._getAnimationDuration(from, { bar1: { temp: 1 } }, {})).toBe(250);
	});

	it('keeps the core duration when no temporary HP changes', () => {
		superSpy.mockReturnValue(500);
		const token = createToken();

		expect(token._getAnimationDuration(from, { bar1: { value: 5, max: 12 } }, {})).toBe(500);
	});

	it('keeps the core duration when there is no bar animation data', () => {
		superSpy.mockReturnValue(750);
		const token = createToken();

		expect(token._getAnimationDuration({ x: 0, y: 0, rotation: 0 }, {}, {})).toBe(750);
	});

	it('keeps the core duration when the maximum health is zero', () => {
		superSpy.mockReturnValue(500);
		const token = createToken();

		expect(
			token._getAnimationDuration(
				{ ...from, bar1: { ...from.bar1, max: 0 } },
				{ bar1: { temp: 6 } },
				{},
			),
		).toBe(500);
	});

	it('forwards the options to the core duration calculation', () => {
		superSpy.mockReturnValue(0);
		const token = createToken();
		const options = { movementSpeed: 6 };

		token._getAnimationDuration(from, { bar1: { temp: 6 } }, options);

		expect(superSpy).toHaveBeenCalledWith(from, { bar1: { temp: 6 } }, options);
	});
});

describe('FEAT temp-hp-token-bar-visual — ArcanaToken._drawBar', () => {
	let bar: Record<string, any>;
	let superSpy: MockInstance<typeof MockTokenBase.prototype._drawBar>;

	beforeEach(() => {
		bar = createBarMock();
		superSpy = vi.spyOn(MockTokenBase.prototype, '_drawBar');
	});

	afterEach(() => {
		superSpy.mockRestore();
	});

	it('always delegates to the core bar drawing and returns its result', () => {
		const token = createToken({ temp: 0 });

		const result = token._drawBar(0, bar, HEALTH_BAR_DATA);

		expect(superSpy).toHaveBeenCalledWith(0, bar, HEALTH_BAR_DATA);
		expect(result).toBe(true);
	});

	it('draws the cyan overlay over the health fill when temporary HP is present', () => {
		const token = createToken({ temp: 3 });

		token._drawBar(0, bar, HEALTH_BAR_DATA);

		expect(bar.beginFill).toHaveBeenCalledWith(TEMP_HP_COLOR, 0.85);
		expect(bar.lineStyle).toHaveBeenCalledWith(0);
		expect(bar.drawRoundedRect).toHaveBeenCalledWith(1, 1, 22, 6, 2);
		expect(bar.endFill).toHaveBeenCalled();
	});

	it('draws the overlay after the core bar', () => {
		const token = createToken({ temp: 3 });

		token._drawBar(0, bar, HEALTH_BAR_DATA);

		expect(superSpy.mock.invocationCallOrder[0]).toBeLessThan(
			bar.beginFill.mock.invocationCallOrder[0],
		);
	});

	it('uses the animated temporary HP from the bar data while the bar animates', () => {
		const token = createToken({ temp: 6 });

		token._drawBar(0, bar, { ...HEALTH_BAR_DATA, temp: 5 });

		expect(bar.drawRoundedRect).toHaveBeenCalledWith(1, 1, 38, 6, 2);
	});

	it('falls back to the actor temporary HP when the bar data carries none', () => {
		const token = createToken({ temp: 3 });

		token._drawBar(0, bar, HEALTH_BAR_DATA);

		expect(bar.drawRoundedRect).toHaveBeenCalledWith(1, 1, 22, 6, 2);
	});

	it('falls back to the actor temporary HP when the bar data value is not finite', () => {
		const token = createToken({ temp: 3 });

		token._drawBar(0, bar, { ...HEALTH_BAR_DATA, temp: Number.NaN });

		expect(bar.drawRoundedRect).toHaveBeenCalledWith(1, 1, 22, 6, 2);
	});

	it('does not draw the overlay when temporary HP is zero', () => {
		const token = createToken({ temp: 0 });

		token._drawBar(0, bar, HEALTH_BAR_DATA);

		expect(bar.drawRoundedRect).not.toHaveBeenCalled();
	});

	it.each(['initiative', 'system.health.max', 'attributes.hp'])(
		'does not draw the overlay for the non-health attribute %s',
		(attribute) => {
			const token = createToken({ temp: 5 });

			token._drawBar(0, bar, { ...HEALTH_BAR_DATA, attribute });

			expect(bar.drawRoundedRect).not.toHaveBeenCalled();
		},
	);

	it('does not draw the overlay on bar2', () => {
		const token = createToken({ temp: 5 });

		token._drawBar(1, bar, HEALTH_BAR_DATA);

		expect(bar.drawRoundedRect).not.toHaveBeenCalled();
	});

	it('does not draw the overlay when the actor has no health data', () => {
		const token = createToken({ hasActor: false });

		token._drawBar(0, bar, HEALTH_BAR_DATA);

		expect(bar.drawRoundedRect).not.toHaveBeenCalled();
	});

	it('does not draw the overlay for single-value bar data without a maximum', () => {
		const token = createToken({ temp: 5 });

		token._drawBar(0, bar, { type: 'value', attribute: 'health', value: 6, editable: true });

		expect(bar.drawRoundedRect).not.toHaveBeenCalled();
	});

	it('enlarges the overlay for tokens of 2x2 or larger, like the core bar', () => {
		const token = createToken({ temp: 3, height: 2 });

		token._drawBar(0, bar, HEALTH_BAR_DATA);

		expect(bar.drawRoundedRect).toHaveBeenCalledWith(1, 1, 22, 10, 2);
	});
});

/**
 * Regression for the v14 construction-order crash: the core calls
 * `_getAnimationData` from `Token#initialize`, inside the base constructor,
 * before the subclass private brand is installed. An uninitialized receiver
 * (prototype only, no brand) reproduces exactly that moment: any `this.#private`
 * access from the overrides throws `TypeError: Receiver must be an instance
 * of class ...` and aborts canvas initialization.
 */
describe('FEAT temp-hp-token-bar-visual — construction-order regression', () => {
	function createUninitializedReceiver(overrides: Record<string, unknown> = {}): any {
		const receiver = Object.create(ArcanaToken.prototype);
		receiver.document = {
			getSize: () => ({ width: 96, height: 96 }),
			height: 1,
			bar1: { attribute: 'system.health', value: 6, max: 12 },
			bar2: { attribute: null, value: null, max: null },
			actor: { system: { health: { value: 6, max: 12, temp: 3 } } },
			...overrides,
		};
		return receiver;
	}

	it('does not throw when _getAnimationData runs before the subclass brand exists', () => {
		const receiver = createUninitializedReceiver();

		let data: any;
		expect(() => {
			data = (ArcanaToken.prototype as any)._getAnimationData.call(receiver);
		}).not.toThrow();

		expect(data.bar1.temp).toBe(3);
	});

	it('does not throw when _drawBar runs before the subclass brand exists', () => {
		const receiver = createUninitializedReceiver();
		const bar = createBarMock();

		expect(() => {
			(ArcanaToken.prototype as any)._drawBar.call(receiver, 0, bar, HEALTH_BAR_DATA);
		}).not.toThrow();

		expect(bar.drawRoundedRect).toHaveBeenCalledWith(1, 1, 22, 6, 2);
	});

	it('does not throw when _getAnimationDuration runs before the subclass brand exists', () => {
		const receiver = createUninitializedReceiver();
		const from = { x: 0, y: 0, rotation: 0, bar1: { value: 6, max: 12, temp: 3 }, bar2: {} };

		expect(() => {
			(ArcanaToken.prototype as any)._getAnimationDuration.call(
				receiver,
				from,
				{ bar1: { temp: 6 } },
				{},
			);
		}).not.toThrow();
	});
});
