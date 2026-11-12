import { describe, expect, it } from 'vitest';
import {
	BOSS_REACTION_COST,
	BOSS_REACTION_OPTIONS,
	BOSS_UPGRADE_TIERS,
	bossUpgradeTier,
	normalizeBossUpgrades,
} from './boss-upgrades';

// Rules source: static/docs/gm.md lines 407-412; changes there should be reflected here.
describe('boss upgrades', () => {
	it.each([
		[0, 1, 0, 1],
		[1, 2, 1, 1.25],
		[2, 3, 2, 1.5],
		[3, 4, 3, 1.75],
	])('FEAT tier %i follows the manual', (upgrades, reactions, determinations, multiplier) => {
		expect(bossUpgradeTier(upgrades as number)).toEqual({
			upgrades,
			reactions,
			determinations,
			paMultiplier: multiplier,
		});
	});
	it.each([
		[7, 3],
		[-2, 0],
		['2', 2],
		['abc', 0],
		[2.7, 2],
	])('FEAT normalizes %s', (raw, expected) => expect(normalizeBossUpgrades(raw)).toBe(expected));
	it('FEAT exposes all four documented tiers', () => expect(BOSS_UPGRADE_TIERS).toHaveLength(4));
	it('FEAT documents each boss Reaction option with a unique id and effect', () => {
		expect(BOSS_REACTION_OPTIONS.map(({ id }) => id)).toEqual([
			'reposicionarse',
			'ataque-rapido',
			'guardia-reactiva',
		]);
		expect(new Set(BOSS_REACTION_OPTIONS.map(({ id }) => id)).size).toBe(
			BOSS_REACTION_OPTIONS.length,
		);
		for (const option of BOSS_REACTION_OPTIONS) {
			expect(option.label).toBeTruthy();
			expect(option.effect).toBeTruthy();
		}
		expect(BOSS_REACTION_COST).toBe(1);
	});
});
