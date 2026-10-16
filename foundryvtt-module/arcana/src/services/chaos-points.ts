/**
 * Domain logic for the GM Chaos Points counter of the Arcana Foundry system.
 *
 * The counter tracks the points the GM accumulates when players Buy Luck. It is
 * persistent per world, has no cap and cannot go below zero. This module keeps
 * the counter rules pure and framework-free, with thin adapters to the
 * world-scoped Foundry setting at the bottom.
 */

export const CHAOS_SPEND_COSTS = {
	hostileReflex: 1,
	environmentalComplication: 1,
	secondChance: 2,
} as const;

const SETTING_NAMESPACE = 'arcana';
const SETTING_KEY = 'gmChaosPoints';
const SETTING_NAME = 'Puntos de Caos del DJ';

let isSettingRegistered = false;

/**
 * Coerce any stored or user-provided value into a valid counter: an integer
 * greater than or equal to zero. Invalid values (NaN, Infinity, negatives,
 * non-numbers) collapse to zero.
 */
export function normalizeChaosPoints(value: unknown): number {
	if (typeof value !== 'number' || !Number.isFinite(value)) {
		return 0;
	}

	return Math.max(0, Math.trunc(value));
}

/**
 * Apply a manual adjustment to the counter, keeping it at or above zero.
 */
export function adjustChaosPoints(current: number, delta: number): number {
	const balance = normalizeChaosPoints(current);
	const change = Number.isFinite(delta) ? Math.trunc(delta) : 0;
	return Math.max(0, balance + change);
}

/**
 * A spend is allowed only when the cost is positive and the balance covers it.
 */
export function canSpendChaosPoints(current: number, cost: number): boolean {
	return cost > 0 && cost <= normalizeChaosPoints(current);
}

/**
 * Spend `cost` points from the counter. When the spend is rejected the balance
 * is returned unchanged.
 */
export function spendChaosPoints(current: number, cost: number): { ok: boolean; value: number } {
	const balance = normalizeChaosPoints(current);

	if (!canSpendChaosPoints(balance, cost)) {
		return { ok: false, value: balance };
	}

	return { ok: true, value: balance - Math.trunc(cost) };
}

/**
 * Read the world-scoped counter, normalized to a valid value.
 */
export function getChaosPoints(): number {
	return normalizeChaosPoints(game.settings.get(SETTING_NAMESPACE, SETTING_KEY));
}

/**
 * Persist the counter in the world-scoped setting, normalized to a valid value.
 */
export async function setChaosPoints(value: number): Promise<void> {
	await game.settings.set(SETTING_NAMESPACE, SETTING_KEY, normalizeChaosPoints(value));
}

/**
 * Register the world-scoped counter setting. Safe to call more than once:
 * Foundry throws when a setting is registered twice, so this guards itself.
 */
export function registerChaosPointsSetting(): void {
	if (isSettingRegistered) return;

	game.settings.register(SETTING_NAMESPACE, SETTING_KEY, {
		name: SETTING_NAME,
		scope: 'world',
		config: false,
		type: Number,
		default: 0,
	});

	isSettingRegistered = true;
}
