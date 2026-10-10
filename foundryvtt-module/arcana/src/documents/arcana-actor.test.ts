/**
 * Unit tests for arcana-actor.ts
 *
 * Covers the pure temporary-HP absorption math, the `modifyTokenAttribute`
 * override that intercepts damage on the health bar, and the mutually
 * exclusive statuses enforced by the `toggleStatusEffect` override.
 */

import { afterEach, beforeEach, describe, expect, it, vi, type MockInstance } from 'vitest';

class MockActor {
	system: Record<string, any> = {};
	statuses = new Set<string>();
	update = vi.fn(async () => this);

	async modifyTokenAttribute(
		_attribute: string,
		_value: number,
		_isDelta = false,
		_isBar = true,
	): Promise<MockActor> {
		return this;
	}

	/** Minimal stand-in for the core toggle semantics the override delegates to. */
	async toggleStatusEffect(
		statusId: string,
		options: { active?: boolean | null; overlay?: boolean | null } = {},
	): Promise<boolean | undefined> {
		const isActive = this.statuses.has(statusId);

		if (options.active === true) {
			this.statuses.add(statusId);
			return true;
		}

		if (options.active === undefined) {
			if (isActive) {
				this.statuses.delete(statusId);
				return false;
			}
			this.statuses.add(statusId);
			return true;
		}

		if (!isActive) return undefined;
		this.statuses.delete(statusId);
		return false;
	}
}

vi.stubGlobal('Actor', MockActor);

const arcanaActorModule = await import('./arcana-actor');
const {
	ArcanaActor,
	applyTemporaryHpAbsorption,
	getExclusiveSiblingStatusIds,
	isHealthBarAttribute,
	willActivateStatus,
} = arcanaActorModule;

describe('applyTemporaryHpAbsorption', () => {
	it('should keep current health when there is no temporary HP', () => {
		expect(applyTemporaryHpAbsorption({ value: 10, temp: 0 }, 3)).toEqual({ value: 7, temp: 0 });
	});

	it('should consume temporary HP before current health', () => {
		expect(applyTemporaryHpAbsorption({ value: 10, temp: 4 }, 3)).toEqual({ value: 10, temp: 1 });
	});

	it('should overflow damage beyond temporary HP into current health', () => {
		expect(applyTemporaryHpAbsorption({ value: 10, temp: 2 }, 5)).toEqual({ value: 7, temp: 0 });
	});

	it('should clamp current health at zero', () => {
		expect(applyTemporaryHpAbsorption({ value: 1, temp: 1 }, 5)).toEqual({ value: 0, temp: 0 });
	});

	it('should never produce negative pools from already negative inputs', () => {
		expect(applyTemporaryHpAbsorption({ value: -2, temp: -3 }, 4)).toEqual({ value: 0, temp: 0 });
	});

	it('should not consume temporary HP for non-positive damage', () => {
		expect(applyTemporaryHpAbsorption({ value: 10, temp: 4 }, 0)).toEqual({ value: 10, temp: 4 });
		expect(applyTemporaryHpAbsorption({ value: 10, temp: 4 }, -5)).toEqual({ value: 10, temp: 4 });
	});

	it('should absorb exactly the temporary HP available', () => {
		expect(applyTemporaryHpAbsorption({ value: 10, temp: 4 }, 4)).toEqual({ value: 10, temp: 0 });
	});
});

describe('isHealthBarAttribute', () => {
	it.each(['health', 'system.health', 'system.health.value'])(
		'should recognize %s as a health bar path',
		(attribute) => {
			expect(isHealthBarAttribute(attribute)).toBe(true);
		},
	);

	it.each(['initiative', 'system.health.max', 'attributes.hp'])(
		'should ignore %s as a health bar path',
		(attribute) => {
			expect(isHealthBarAttribute(attribute)).toBe(false);
		},
	);
});

describe('ArcanaActor.modifyTokenAttribute', () => {
	let actor: InstanceType<typeof ArcanaActor>;
	let superSpy: MockInstance<typeof MockActor.prototype.modifyTokenAttribute>;

	beforeEach(() => {
		actor = new (ArcanaActor as any)();
		(actor as any).system = { health: { value: 10, max: 12, temp: 4 } };
		(actor as any).update.mockClear();
		superSpy = vi.spyOn(MockActor.prototype, 'modifyTokenAttribute');
	});

	afterEach(() => {
		superSpy.mockRestore();
	});

	it('FEAT temp-hp-damage-absorption — consumes temporary HP before current health on damage', async () => {
		await actor.modifyTokenAttribute('health', -3, true, true);

		expect(superSpy).not.toHaveBeenCalled();
		expect((actor as any).update).toHaveBeenCalledWith({ 'system.health.temp': 1 });
	});

	it('FEAT temp-hp-damage-absorption — overflows damage into current health', async () => {
		(actor as any).system = { health: { value: 10, max: 12, temp: 2 } };

		await actor.modifyTokenAttribute('health', -5, true, true);

		expect(superSpy).not.toHaveBeenCalled();
		expect((actor as any).update).toHaveBeenCalledWith({
			'system.health.temp': 0,
			'system.health.value': 7,
		});
	});

	it('FEAT temp-hp-damage-absorption — clamps damage at zero current health', async () => {
		(actor as any).system = { health: { value: 1, max: 12, temp: 1 } };

		await actor.modifyTokenAttribute('health', -5, true, true);

		expect((actor as any).update).toHaveBeenCalledWith({
			'system.health.temp': 0,
			'system.health.value': 0,
		});
	});

	it('FEAT temp-hp-damage-absorption — handles damage with no temporary HP', async () => {
		(actor as any).system = { health: { value: 10, max: 12, temp: 0 } };

		await actor.modifyTokenAttribute('health', -3, true, true);

		expect(superSpy).not.toHaveBeenCalled();
		expect((actor as any).update).toHaveBeenCalledWith({ 'system.health.value': 7 });
	});

	it('FEAT temp-hp-damage-absorption — accepts the full system.health.value path', async () => {
		await actor.modifyTokenAttribute('system.health.value', -3, true, true);

		expect(superSpy).not.toHaveBeenCalled();
		expect((actor as any).update).toHaveBeenCalledWith({ 'system.health.temp': 1 });
	});

	it('FEAT temp-hp-damage-absorption — delegates healing deltas to the core implementation', async () => {
		await actor.modifyTokenAttribute('health', 3, true, true);

		expect(superSpy).toHaveBeenCalledWith('health', 3, true, true);
		expect((actor as any).update).not.toHaveBeenCalled();
	});

	it('FEAT temp-hp-damage-absorption — delegates absolute health sets to the core implementation', async () => {
		await actor.modifyTokenAttribute('health', 8, false, true);

		expect(superSpy).toHaveBeenCalledWith('health', 8, false, true);
		expect((actor as any).update).not.toHaveBeenCalled();
	});

	it('FEAT temp-hp-damage-absorption — delegates non-bar deltas to the core implementation', async () => {
		await actor.modifyTokenAttribute('health', -3, true, false);

		expect(superSpy).toHaveBeenCalledWith('health', -3, true, false);
		expect((actor as any).update).not.toHaveBeenCalled();
	});

	it('FEAT temp-hp-damage-absorption — delegates zero deltas to the core implementation', async () => {
		await actor.modifyTokenAttribute('health', 0, true, true);

		expect(superSpy).toHaveBeenCalledWith('health', 0, true, true);
		expect((actor as any).update).not.toHaveBeenCalled();
	});

	it('FEAT temp-hp-damage-absorption — delegates non-health attributes to the core implementation', async () => {
		await actor.modifyTokenAttribute('initiative', -3, true, true);

		expect(superSpy).toHaveBeenCalledWith('initiative', -3, true, true);
		expect((actor as any).update).not.toHaveBeenCalled();
	});

	it('FEAT temp-hp-damage-absorption — delegates when the actor has no health data', async () => {
		(actor as any).system = {};

		await actor.modifyTokenAttribute('health', -3, true, true);

		expect(superSpy).toHaveBeenCalledWith('health', -3, true, true);
		expect((actor as any).update).not.toHaveBeenCalled();
	});
});

describe('getExclusiveSiblingStatusIds', () => {
	it.each<[string, string[]]>([
		['cansado', ['agotado', 'exhausto']],
		['agotado', ['cansado', 'exhausto']],
		['exhausto', ['cansado', 'agotado']],
		['concentracion', ['foco-del-escaramuzador']],
		['foco-del-escaramuzador', ['concentracion']],
	])('should return the exclusive siblings of "%s"', (statusId, expected) => {
		expect(getExclusiveSiblingStatusIds(statusId)).toEqual(expected);
	});

	it.each(['envenenado', 'barrera-arcana', 'inspiracion-bardica'])(
		'should report no exclusive siblings for unrelated status "%s"',
		(statusId) => {
			expect(getExclusiveSiblingStatusIds(statusId)).toEqual([]);
		},
	);
});

describe('willActivateStatus', () => {
	it('should activate when active is explicitly true, even with the status already applied', () => {
		expect(willActivateStatus(new Set(), 'agotado', true)).toBe(true);
		expect(willActivateStatus(new Set(['agotado']), 'agotado', true)).toBe(true);
	});

	it('should toggle by current state when active is undefined', () => {
		expect(willActivateStatus(new Set(), 'agotado', undefined)).toBe(true);
		expect(willActivateStatus(new Set(['agotado']), 'agotado', undefined)).toBe(false);
	});

	it('should not activate when active is false or null', () => {
		expect(willActivateStatus(new Set(), 'agotado', false)).toBe(false);
		expect(willActivateStatus(new Set(['agotado']), 'agotado', false)).toBe(false);
		expect(willActivateStatus(new Set(), 'agotado', null)).toBe(false);
	});
});

describe('ArcanaActor.toggleStatusEffect', () => {
	let actor: InstanceType<typeof ArcanaActor>;
	let superSpy: MockInstance<typeof MockActor.prototype.toggleStatusEffect>;

	beforeEach(() => {
		actor = new (ArcanaActor as any)();
		superSpy = vi.spyOn(MockActor.prototype, 'toggleStatusEffect');
	});

	afterEach(() => {
		superSpy.mockRestore();
	});

	const activeStatuses = (): string[] => [...((actor as any).statuses as Set<string>)].sort();

	it('FEAT foundry-status-effects @fatigue — activating a grade replaces the previous grade', async () => {
		(actor as any).statuses = new Set(['cansado']);

		await actor.toggleStatusEffect('agotado');

		expect(activeStatuses()).toEqual(['agotado']);
		expect(superSpy).toHaveBeenCalledWith('agotado', {});
		expect(superSpy).toHaveBeenCalledWith('cansado', { active: false });

		await actor.toggleStatusEffect('exhausto');

		expect(activeStatuses()).toEqual(['exhausto']);
		expect(superSpy).toHaveBeenCalledWith('exhausto', {});
		expect(superSpy).toHaveBeenCalledWith('agotado', { active: false });
	});

	it('FEAT foundry-status-effects @fatigue @edge-case — activating a grade clears every other active grade', async () => {
		(actor as any).statuses = new Set(['cansado', 'agotado']);

		await actor.toggleStatusEffect('exhausto');

		expect(activeStatuses()).toEqual(['exhausto']);
		expect(superSpy).toHaveBeenCalledWith('cansado', { active: false });
		expect(superSpy).toHaveBeenCalledWith('agotado', { active: false });
	});

	it('FEAT foundry-status-effects @fatigue @edge-case — deactivating a grade leaves unrelated statuses untouched', async () => {
		(actor as any).statuses = new Set(['agotado', 'envenenado']);

		await actor.toggleStatusEffect('agotado', { active: false });

		expect(activeStatuses()).toEqual(['envenenado']);
		expect(superSpy).toHaveBeenCalledTimes(1);
		expect(superSpy).toHaveBeenCalledWith('agotado', { active: false });
	});

	it('FEAT foundry-status-effects @fatigue @edge-case — toggling off an active grade leaves unrelated statuses untouched', async () => {
		(actor as any).statuses = new Set(['agotado', 'envenenado']);

		await actor.toggleStatusEffect('agotado');

		expect(activeStatuses()).toEqual(['envenenado']);
		expect(superSpy).toHaveBeenCalledTimes(1);
		expect(superSpy).toHaveBeenCalledWith('agotado', {});
	});

	it('FEAT foundry-status-effects @toggle — activating a status outside the exclusive groups delegates untouched', async () => {
		(actor as any).statuses = new Set(['cansado']);

		await actor.toggleStatusEffect('envenenado');

		expect(activeStatuses()).toEqual(['cansado', 'envenenado']);
		expect(superSpy).toHaveBeenCalledTimes(1);
		expect(superSpy).toHaveBeenCalledWith('envenenado', {});
	});

	it('FEAT foundry-status-effects @toggle — deactivating a status outside the exclusive groups delegates untouched', async () => {
		(actor as any).statuses = new Set(['barrera-arcana']);

		await actor.toggleStatusEffect('barrera-arcana', { active: false });

		expect(activeStatuses()).toEqual([]);
		expect(superSpy).toHaveBeenCalledTimes(1);
		expect(superSpy).toHaveBeenCalledWith('barrera-arcana', { active: false });
	});

	it('FEAT foundry-status-effects @exclusivity — activating Focus removes Concentration', async () => {
		(actor as any).statuses = new Set(['concentracion']);

		await actor.toggleStatusEffect('foco-del-escaramuzador');

		expect(activeStatuses()).toEqual(['foco-del-escaramuzador']);
		expect(superSpy).toHaveBeenCalledWith('foco-del-escaramuzador', {});
		expect(superSpy).toHaveBeenCalledWith('concentracion', { active: false });
	});

	it('FEAT foundry-status-effects @exclusivity — activating Concentration removes Focus', async () => {
		(actor as any).statuses = new Set(['foco-del-escaramuzador']);

		await actor.toggleStatusEffect('concentracion');

		expect(activeStatuses()).toEqual(['concentracion']);
		expect(superSpy).toHaveBeenCalledWith('concentracion', {});
		expect(superSpy).toHaveBeenCalledWith('foco-del-escaramuzador', { active: false });
	});

	it('FEAT foundry-status-effects @fatigue — honors explicit active:true and still clears active siblings', async () => {
		(actor as any).statuses = new Set(['agotado', 'cansado']);

		await actor.toggleStatusEffect('agotado', { active: true });

		expect(activeStatuses()).toEqual(['agotado']);
		expect(superSpy).toHaveBeenCalledWith('agotado', { active: true });
		expect(superSpy).toHaveBeenCalledWith('cansado', { active: false });
	});

	it('FEAT foundry-status-effects @exclusivity — forwards overlay and remaining options to the core implementation', async () => {
		(actor as any).statuses = new Set(['concentracion']);

		await actor.toggleStatusEffect('foco-del-escaramuzador', { overlay: true });

		expect(activeStatuses()).toEqual(['foco-del-escaramuzador']);
		expect(superSpy).toHaveBeenCalledWith('foco-del-escaramuzador', { overlay: true });
	});

	it('FEAT foundry-status-effects @fatigue — delegates siblings through super without re-entering the override', async () => {
		const overrideSpy = vi.spyOn(ArcanaActor.prototype, 'toggleStatusEffect');
		(actor as any).statuses = new Set(['cansado']);

		try {
			await actor.toggleStatusEffect('agotado');

			expect(overrideSpy).toHaveBeenCalledTimes(1);
		} finally {
			overrideSpy.mockRestore();
		}
	});
});
