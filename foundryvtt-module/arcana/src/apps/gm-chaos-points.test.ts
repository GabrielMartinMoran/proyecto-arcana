import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import process from 'node:process';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
	getChaosPoints: vi.fn<() => number>(),
	setChaosPoints: vi.fn<(value: number) => Promise<void>>(),
	adjustChaosPoints: vi.fn<(current: number, delta: number) => number>(),
	spendChaosPoints: vi.fn<(current: number, cost: number) => { ok: boolean; value: number }>(),
	CHAOS_SPEND_COSTS: {
		hostileReflex: 1,
		environmentalComplication: 1,
		secondChance: 2,
	} as Record<string, number>,
}));

vi.mock('../services/chaos-points', () => ({
	getChaosPoints: mocks.getChaosPoints,
	setChaosPoints: mocks.setChaosPoints,
	adjustChaosPoints: mocks.adjustChaosPoints,
	spendChaosPoints: mocks.spendChaosPoints,
	CHAOS_SPEND_COSTS: mocks.CHAOS_SPEND_COSTS,
}));

type AppModule = typeof import('./gm-chaos-points');

describe('FEAT foundry-gm-chaos-points — GM Chaos Points window', () => {
	let mod: AppModule;
	let app: any;
	let baseRender: ReturnType<typeof vi.fn>;

	beforeEach(async () => {
		vi.resetModules();
		vi.clearAllMocks();
		mocks.getChaosPoints.mockReturnValue(2);
		mocks.setChaosPoints.mockResolvedValue(undefined);
		mocks.adjustChaosPoints.mockImplementation((current, delta) => Math.max(0, current + delta));
		mocks.spendChaosPoints.mockImplementation((current, cost) =>
			cost > 0 && cost <= current
				? { ok: true, value: current - cost }
				: { ok: false, value: current },
		);
		Object.assign(mocks.CHAOS_SPEND_COSTS, {
			hostileReflex: 1,
			environmentalComplication: 1,
			secondChance: 2,
		});

		baseRender = vi.fn(function (this: unknown) {
			return Promise.resolve(this);
		});
		class FakeApplicationV2 {
			element: HTMLElement | null = null;
			_prepareContext(_options: unknown): Promise<Record<string, unknown>> {
				return Promise.resolve({});
			}
			render(options?: unknown): Promise<unknown> {
				return baseRender.call(this, options);
			}
		}
		vi.stubGlobal('foundry', {
			applications: {
				api: {
					ApplicationV2: FakeApplicationV2,
					HandlebarsApplicationMixin: (Base: unknown) => Base,
				},
			},
		});
		vi.stubGlobal('game', { user: { isGM: true } });
		vi.stubGlobal('ui', { notifications: { warn: vi.fn() } });

		mod = await import('./gm-chaos-points');
		app = new mod.GMChaosPointsApp();
	});

	afterEach(() => {
		vi.unstubAllGlobals();
	});

	function action(name: 'adjust' | 'set' | 'spend'): (...args: any[]) => Promise<void> {
		return (mod.GMChaosPointsApp as any).DEFAULT_OPTIONS.actions[name];
	}

	it('shows the current value read from the service', async () => {
		const context = await app._prepareContext({});

		expect(mocks.getChaosPoints).toHaveBeenCalled();
		expect(context.chaosPoints).toBe(2);
	});

	it('adjusts +1 through the service and re-renders', async () => {
		await action('adjust').call(app, {}, { dataset: { delta: '1' } });

		expect(mocks.adjustChaosPoints).toHaveBeenCalledWith(2, 1);
		expect(mocks.setChaosPoints).toHaveBeenCalledWith(3);
		expect(baseRender).toHaveBeenCalled();
	});

	it('adjusts -1 through the service and re-renders', async () => {
		mocks.getChaosPoints.mockReturnValue(1);

		await action('adjust').call(app, {}, { dataset: { delta: '-1' } });

		expect(mocks.adjustChaosPoints).toHaveBeenCalledWith(1, -1);
		expect(mocks.setChaosPoints).toHaveBeenCalledWith(0);
		expect(baseRender).toHaveBeenCalled();
	});

	it('sets an exact value from the input and re-renders', async () => {
		const input = { value: '7' };
		const form = { querySelector: vi.fn(() => input) };
		const target = { form };

		await action('set').call(app, {}, target);

		expect(mocks.setChaosPoints).toHaveBeenCalledWith(7);
		expect(baseRender).toHaveBeenCalled();
	});

	it('reflects the updated value after an adjustment', async () => {
		mocks.getChaosPoints.mockReturnValueOnce(2).mockReturnValue(3);

		await action('adjust').call(app, {}, { dataset: { delta: '1' } });
		const context = await app._prepareContext({});

		expect(context.chaosPoints).toBe(3);
	});

	it('renders for a GM user', async () => {
		await app.render({ force: true });

		expect(baseRender).toHaveBeenCalledWith({ force: true });
	});

	it('blocks rendering for a non-GM user', async () => {
		(game as any).user.isGM = false;

		const result = await app.render({ force: true });

		expect(baseRender).not.toHaveBeenCalled();
		expect(result).toBe(app);
	});

	it('exposes the three Pact of Chaos spend options in the render context', async () => {
		const context = await app._prepareContext({});

		expect(context.spendOptions.map((option: any) => option.key)).toEqual([
			'hostileReflex',
			'environmentalComplication',
			'secondChance',
		]);
	});

	it('derives each spend option cost and label from CHAOS_SPEND_COSTS', async () => {
		mocks.CHAOS_SPEND_COSTS.hostileReflex = 7;
		mocks.CHAOS_SPEND_COSTS.secondChance = 9;

		const context = await app._prepareContext({});
		const options = Object.fromEntries(
			context.spendOptions.map((option: any) => [option.key, option]),
		);

		expect(options.hostileReflex.cost).toBe(7);
		expect(options.hostileReflex.label).toBe('Reflejo Hostil (−7)');
		expect(options.secondChance.cost).toBe(9);
		expect(options.secondChance.label).toBe('Segunda Oportunidad (−9)');
		expect(options.environmentalComplication.cost).toBe(1);
		expect(options.environmentalComplication.label).toBe('Complicación Ambiental (−1)');
	});

	it('spends Reflejo Hostil (−1) and re-renders', async () => {
		mocks.getChaosPoints.mockReturnValue(5);

		await action('spend').call(app, {}, { dataset: { spend: 'hostileReflex' } });

		expect(mocks.spendChaosPoints).toHaveBeenCalledWith(5, 1);
		expect(mocks.setChaosPoints).toHaveBeenCalledWith(4);
		expect(baseRender).toHaveBeenCalled();
	});

	it('spends Complicación Ambiental (−1) and re-renders', async () => {
		mocks.getChaosPoints.mockReturnValue(5);

		await action('spend').call(app, {}, { dataset: { spend: 'environmentalComplication' } });

		expect(mocks.spendChaosPoints).toHaveBeenCalledWith(5, 1);
		expect(mocks.setChaosPoints).toHaveBeenCalledWith(4);
		expect(baseRender).toHaveBeenCalled();
	});

	it('spends Segunda Oportunidad (−2) and re-renders', async () => {
		mocks.getChaosPoints.mockReturnValue(5);

		await action('spend').call(app, {}, { dataset: { spend: 'secondChance' } });

		expect(mocks.spendChaosPoints).toHaveBeenCalledWith(5, 2);
		expect(mocks.setChaosPoints).toHaveBeenCalledWith(3);
		expect(baseRender).toHaveBeenCalled();
	});

	it('refuses a spend with insufficient balance: warns, changes nothing and does not re-render', async () => {
		mocks.getChaosPoints.mockReturnValue(1);

		await action('spend').call(app, {}, { dataset: { spend: 'secondChance' } });

		expect(mocks.spendChaosPoints).toHaveBeenCalledWith(1, 2);
		expect(mocks.setChaosPoints).not.toHaveBeenCalled();
		expect((ui as any).notifications.warn).toHaveBeenCalledWith('Puntos de Caos insuficientes.');
		expect(baseRender).not.toHaveBeenCalled();
	});

	it('ignores an unknown spend key without touching the counter', async () => {
		await action('spend').call(app, {}, { dataset: { spend: 'not-a-real-spend' } });

		expect(mocks.spendChaosPoints).not.toHaveBeenCalled();
		expect(mocks.setChaosPoints).not.toHaveBeenCalled();
		expect((ui as any).notifications.warn).not.toHaveBeenCalled();
		expect(baseRender).not.toHaveBeenCalled();
	});
});

describe('FEAT foundry-gm-chaos-points — adjust buttons presentation', () => {
	const template = readFileSync(resolve(process.cwd(), 'gm-chaos-points.html'), 'utf8');

	function adjustButtons(): HTMLButtonElement[] {
		const doc = new DOMParser().parseFromString(template, 'text/html');
		return Array.from(doc.querySelectorAll<HTMLButtonElement>('button[data-action="adjust"]'));
	}

	it('shows only the minus icon on the decrement button', () => {
		const [decrement] = adjustButtons();

		expect(decrement).toBeDefined();
		expect(decrement.dataset.delta).toBe('-1');
		expect(decrement.querySelector('i.fa-minus')).not.toBeNull();
		expect(decrement.textContent ?? '').not.toMatch(/\d/);
		expect(decrement.getAttribute('title')).toBe('−1');
	});

	it('shows only the plus icon on the increment button', () => {
		const [, increment] = adjustButtons();

		expect(increment).toBeDefined();
		expect(increment.dataset.delta).toBe('1');
		expect(increment.querySelector('i.fa-plus')).not.toBeNull();
		expect(increment.textContent ?? '').not.toMatch(/\d/);
		expect(increment.getAttribute('title')).toBe('+1');
	});
});
