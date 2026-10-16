import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
	CHAOS_SPEND_COSTS,
	adjustChaosPoints,
	canSpendChaosPoints,
	getChaosPoints,
	normalizeChaosPoints,
	setChaosPoints,
	spendChaosPoints,
} from './chaos-points';

describe('FEAT foundry-gm-chaos-points — manual adjustment with a floor of zero', () => {
	it('increments by +1', () => {
		expect(adjustChaosPoints(3, 1)).toBe(4);
	});

	it('floors at 0 on a large negative adjustment', () => {
		expect(adjustChaosPoints(3, -10)).toBe(0);
	});

	it('keeps a negative adjustment that stays above zero', () => {
		expect(adjustChaosPoints(5, -2)).toBe(3);
	});
});

describe('FEAT foundry-gm-chaos-points — spend guard', () => {
	it('spends when the balance covers the cost', () => {
		expect(spendChaosPoints(5, 2)).toEqual({ ok: true, value: 3 });
	});

	it('rejects a spend above the balance and leaves the value untouched', () => {
		expect(spendChaosPoints(1, 2)).toEqual({ ok: false, value: 1 });
	});

	it('rejects a non-positive cost', () => {
		expect(spendChaosPoints(5, 0)).toEqual({ ok: false, value: 5 });
		expect(spendChaosPoints(5, -1)).toEqual({ ok: false, value: 5 });
	});

	it('exposes the same rule through canSpendChaosPoints', () => {
		expect(canSpendChaosPoints(2, 2)).toBe(true);
		expect(canSpendChaosPoints(1, 2)).toBe(false);
		expect(canSpendChaosPoints(5, 0)).toBe(false);
	});
});

describe('FEAT foundry-gm-chaos-points — pact of chaos costs', () => {
	it('exposes the fixed cost table', () => {
		expect(CHAOS_SPEND_COSTS).toEqual({
			hostileReflex: 1,
			environmentalComplication: 1,
			secondChance: 2,
		});
	});

	it('applies the pact costs in sequence', () => {
		const afterHostileReflex = spendChaosPoints(5, CHAOS_SPEND_COSTS.hostileReflex);
		expect(afterHostileReflex).toEqual({ ok: true, value: 4 });

		const afterSecondChance = spendChaosPoints(
			afterHostileReflex.value,
			CHAOS_SPEND_COSTS.secondChance,
		);
		expect(afterSecondChance).toEqual({ ok: true, value: 2 });

		const afterComplication = spendChaosPoints(
			afterSecondChance.value,
			CHAOS_SPEND_COSTS.environmentalComplication,
		);
		expect(afterComplication).toEqual({ ok: true, value: 1 });
	});
});

describe('FEAT foundry-gm-chaos-points — normalization', () => {
	it('truncates to an integer and floors at zero', () => {
		expect(normalizeChaosPoints(3.9)).toBe(3);
		expect(normalizeChaosPoints(-2)).toBe(0);
	});

	it('maps invalid values to 0', () => {
		expect(normalizeChaosPoints(Number.NaN)).toBe(0);
		expect(normalizeChaosPoints(Number.POSITIVE_INFINITY)).toBe(0);
		expect(normalizeChaosPoints('3')).toBe(0);
		expect(normalizeChaosPoints(undefined)).toBe(0);
		expect(normalizeChaosPoints(null)).toBe(0);
	});
});

describe('FEAT foundry-gm-chaos-points — world-scoped setting persistence', () => {
	let settingsGet: ReturnType<typeof vi.fn>;
	let settingsSet: ReturnType<typeof vi.fn>;

	beforeEach(() => {
		settingsGet = vi.fn();
		settingsSet = vi.fn().mockResolvedValue(undefined);
		vi.stubGlobal('game', { settings: { get: settingsGet, set: settingsSet } });
	});

	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it('reads the arcana/gmChaosPoints setting and normalizes it', () => {
		settingsGet.mockReturnValue(2);

		expect(getChaosPoints()).toBe(2);
		expect(settingsGet).toHaveBeenCalledWith('arcana', 'gmChaosPoints');
	});

	it('normalizes invalid stored values to 0', () => {
		settingsGet.mockReturnValue(-5);
		expect(getChaosPoints()).toBe(0);

		settingsGet.mockReturnValue(Number.NaN);
		expect(getChaosPoints()).toBe(0);
	});

	it('writes the normalized value', async () => {
		await setChaosPoints(3.9);

		expect(settingsSet).toHaveBeenCalledWith('arcana', 'gmChaosPoints', 3);
	});

	it('floors negative writes to 0', async () => {
		await setChaosPoints(-4);

		expect(settingsSet).toHaveBeenCalledWith('arcana', 'gmChaosPoints', 0);
	});
});

describe('FEAT foundry-gm-chaos-points — setting registration', () => {
	let settingsRegister: ReturnType<typeof vi.fn>;

	beforeEach(() => {
		vi.resetModules();
		settingsRegister = vi.fn();
		vi.stubGlobal('game', { settings: { register: settingsRegister } });
	});

	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it('registers the world-scoped setting with the exact contract', async () => {
		const { registerChaosPointsSetting } = await import('./chaos-points');

		registerChaosPointsSetting();

		expect(settingsRegister).toHaveBeenCalledWith('arcana', 'gmChaosPoints', {
			name: 'Puntos de Caos del DJ',
			scope: 'world',
			config: false,
			type: Number,
			default: 0,
		});
	});

	it('is idempotent: a second call does not throw', async () => {
		const { registerChaosPointsSetting } = await import('./chaos-points');

		expect(() => {
			registerChaosPointsSetting();
			registerChaosPointsSetting();
		}).not.toThrow();
		expect(settingsRegister).toHaveBeenCalledTimes(1);
	});
});
