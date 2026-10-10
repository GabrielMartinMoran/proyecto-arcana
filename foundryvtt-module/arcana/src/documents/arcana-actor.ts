/**
 * Arcana Actor document class.
 *
 * Two rule hooks live here:
 * - Temporary HP absorption for token-bar damage (see `modifyTokenAttribute`).
 * - Mutually exclusive statuses toggled from the token HUD (see
 *   `toggleStatusEffect`): fatigue grades do not accumulate, and Focus prevents
 *   keeping any other Concentration effect.
 *
 * Foundry's default token-bar handling subtracts damage directly from current
 * health. Arcana characters and NPCs have a `system.health.temp` pool, so the
 * token-bar override intercepts damage deltas applied to the health bar,
 * consumes the temporary pool first, and delegates every other case to the
 * core implementation to preserve its behavior exactly.
 *
 * Foundry v14 contract (verified against the official API docs and the dnd5e
 * and pf2e system overrides):
 * - `modifyTokenAttribute(attribute, value, isDelta = false, isBar = true)`.
 * - The Token HUD passes the configured bar attribute path, which for Arcana
 *   is `health` (`CONFIG.Actor.trackableAttributes` + `prototypeToken.bar1`).
 * - Delta values are signed: negative means damage, positive means healing.
 * - Absolute sets (`isDelta = false`) and non-bar edits must not consume temp.
 * - `toggleStatusEffect(statusId, {active, overlay = false} = {})`: an omitted
 *   `active` toggles by current state; `active: true` forces activation and
 *   `active: false`/`null` forces deactivation.
 */

import type { ActorSystemData } from '../types/actor';

export interface HealthPool {
	value: number;
	temp: number;
}

/**
 * Attribute paths that refer to the Arcana health bar.
 * `health` is the canonical configured path; the `system.*` variants are
 * accepted for callers that use full document paths.
 */
const HEALTH_BAR_ATTRIBUTES = new Set(['health', 'system.health', 'system.health.value']);

/**
 * Whether a token attribute path refers to the Arcana health bar.
 */
export function isHealthBarAttribute(attribute: string): boolean {
	return HEALTH_BAR_ATTRIBUTES.has(attribute);
}

/**
 * Apply incoming damage to a health pool, consuming temporary HP first.
 *
 * Pure function: no Foundry dependencies and no side effects. Negative or zero
 * damage never consumes temporary HP, and both pools stay clamped at zero.
 */
export function applyTemporaryHpAbsorption(health: HealthPool, damage: number): HealthPool {
	const currentTemp = Math.max(0, health.temp);
	const currentValue = Math.max(0, health.value);
	const incomingDamage = Math.max(0, damage);
	const absorbed = Math.min(currentTemp, incomingDamage);

	return {
		value: Math.max(0, currentValue - (incomingDamage - absorbed)),
		temp: currentTemp - absorbed,
	};
}

/**
 * Fatigue grades are progressive: only the current grade applies, so
 * activating one deactivates the other two (`cansado` → `agotado` →
 * `exhausto`).
 */
export const FATIGUE_STATUS_IDS: readonly string[] = ['cansado', 'agotado', 'exhausto'];

/**
 * Foco del Escaramuzador prevents keeping any other Concentration effect,
 * which makes Focus and Concentration mutually exclusive.
 */
export const FOCUS_CONCENTRATION_STATUS_IDS: readonly string[] = [
	'concentracion',
	'foco-del-escaramuzador',
];

/** Status groups whose members cannot be active at the same time. */
const EXCLUSIVE_STATUS_GROUPS: readonly (readonly string[])[] = [
	FATIGUE_STATUS_IDS,
	FOCUS_CONCENTRATION_STATUS_IDS,
];

/**
 * Sibling status ids that must be deactivated when `statusId` becomes active.
 * Returns an empty list when the status does not belong to an exclusive group.
 */
export function getExclusiveSiblingStatusIds(statusId: string): readonly string[] {
	const group = EXCLUSIVE_STATUS_GROUPS.find((ids) => ids.includes(statusId));
	return group?.filter((id) => id !== statusId) ?? [];
}

/**
 * Whether a toggle call will activate the status, mirroring the core contract:
 * an explicit `true` always activates, while an omitted (`undefined`) `active`
 * toggles and therefore only activates when the status is not applied yet.
 */
export function willActivateStatus(
	activeStatusIds: ReadonlySet<string>,
	statusId: string,
	active: boolean | null | undefined,
): boolean {
	if (active === true) return true;
	if (active === undefined) return !activeStatusIds.has(statusId);
	return false;
}

export class ArcanaActor extends Actor {
	/** @override */
	override async modifyTokenAttribute(
		attribute: string,
		value: number,
		isDelta = false,
		isBar = true,
	): Promise<this | undefined> {
		if (!isDelta || !isBar || value >= 0 || !isHealthBarAttribute(attribute)) {
			return super.modifyTokenAttribute(attribute, value, isDelta, isBar);
		}

		const health = (this.system as ActorSystemData).health;
		if (!health) return super.modifyTokenAttribute(attribute, value, isDelta, isBar);

		const currentValue = Number(health.value);
		const currentTemp = Math.max(0, Number(health.temp ?? 0));
		const result = applyTemporaryHpAbsorption({ value: currentValue, temp: currentTemp }, -value);

		const updates: Record<string, number> = {};
		if (result.temp !== currentTemp) updates['system.health.temp'] = result.temp;
		if (result.value !== currentValue) updates['system.health.value'] = result.value;
		if (Object.keys(updates).length === 0) return this;

		return this.update(updates);
	}

	/**
	 * Enforce Arcana's mutually exclusive statuses when toggled from the HUD.
	 *
	 * Activating a fatigue grade deactivates the other grades, and activating
	 * Focus or Concentration deactivates the other one ("last click wins").
	 * Deactivations and statuses outside the exclusive groups delegate to the
	 * core implementation untouched.
	 *
	 * @override
	 */
	override async toggleStatusEffect(
		statusId: string,
		options: Actor.ToggleStatusEffectOptions = {},
	): Promise<ActiveEffect.Implementation | boolean | undefined> {
		if (!willActivateStatus(this.statuses, statusId, options.active)) {
			return super.toggleStatusEffect(statusId, options);
		}

		const siblingStatusIds = getExclusiveSiblingStatusIds(statusId);
		if (siblingStatusIds.length === 0) return super.toggleStatusEffect(statusId, options);

		const result = await super.toggleStatusEffect(statusId, options);

		for (const siblingStatusId of siblingStatusIds) {
			if (this.statuses.has(siblingStatusId)) {
				await super.toggleStatusEffect(siblingStatusId, { active: false });
			}
		}

		return result;
	}
}
