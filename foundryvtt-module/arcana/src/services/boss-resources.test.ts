import { describe, expect, it, vi } from 'vitest';
import {
	readBossResources,
	resetBossDetermination,
	updateBossResourceCurrent,
} from './boss-resources';

function owner(flags: Record<string, unknown> = {}) {
	return {
		getFlag: vi.fn((_scope: string, key: string) => flags[key]),
		setFlag: vi.fn(async (_scope: string, key: string, value: unknown) => {
			flags[key] = value;
		}),
		flags,
	};
}

describe('boss resources', () => {
	it('FEAT initializes pools at their derived maximum', () => {
		const actor = owner();
		expect(readBossResources(actor as any)).toEqual({
			reactions: { current: 1, max: 1 },
			determination: { current: 0, max: 0 },
		});
	});
	it('FEAT clamps updates and resets resources independently', async () => {
		const actor = owner({ bossUpgrades: 2 });
		await updateBossResourceCurrent(actor as any, 'reactions', -3);
		expect(readBossResources(actor as any).reactions).toEqual({ current: 0, max: 3 });
		await resetBossDetermination(actor as any);
		expect(readBossResources(actor as any).determination).toEqual({ current: 2, max: 2 });
		expect(readBossResources(actor as any).reactions.current).toBe(0);
	});
	it('FEAT keeps unlinked token resources local', async () => {
		const base = owner();
		const token = Object.assign(owner(), { actorLink: false });
		const actor = Object.assign(owner(), {
			isToken: true,
			token,
			baseActor: base,
			prototypeToken: { actorLink: false },
		});
		await updateBossResourceCurrent(actor as any, 'reactions', 0);
		expect(token.setFlag).toHaveBeenCalled();
		expect(base.setFlag).not.toHaveBeenCalled();
	});
});
