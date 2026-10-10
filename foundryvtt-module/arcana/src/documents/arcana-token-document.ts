/**
 * Arcana TokenDocument class.
 *
 * Foundry's core bar animation only diffs `{value, max}`
 * (`Token#_getAnimationData`, v14.360 `client/canvas/placeables/token.mjs:2039-2052`),
 * so an update that changes only `system.health.temp` never reaches the core
 * bar animation. This subclass requests a bar refresh from `_onRelatedUpdate`
 * (following the pf2e pattern) and additionally dispatches a temporary-HP
 * animation under the core `${objectId}.animateBars` name, for every update
 * path that touches temporary HP: native Token HUD damage, direct actor edits
 * and web-to-Foundry sync.
 *
 * `_onRelatedUpdate` is synchronous in v14
 * (`client/documents/token.mjs:3672-3709`), receives the update delta already
 * expanded by `cleanData` (a single object for base-actor updates, an array of
 * deltas for descendant updates such as unlinked-token ActorDeltas) and
 * forwards to `super` first so core behavior is preserved.
 *
 * The animation helper is module-scoped, not a `#private` method, so the
 * override never depends on the subclass private brand (same constraint the
 * core construction order imposes on `ArcanaToken`; see `arcana-token.ts`).
 */

import type { ActorSystemData } from '../types/actor';

const TEMPORARY_HP_PATH = 'system.health.temp';

/**
 * Minimal structural view of the v14 `Token#animate` API. The v13 type
 * declarations omit animated `bar1`/`bar2` data, so the object is cast locally
 * (same pattern as other version-skew casts in this module).
 */
interface AnimatableToken {
	objectId: string;
	animate(to: Record<string, unknown>, options: Record<string, unknown>): Promise<unknown>;
}

/** Minimal structural view of the document the temporary-HP animation needs. */
interface AnimatableTokenDocument {
	actor: Actor | null | undefined;
	object: unknown;
}

/**
 * Animate the temporary HP overlay through the core bar pipeline. The core
 * dispatches `{bar1, bar2}` under `${objectId}.animateBars`, so reusing that
 * name merges both targets into a single animation; the bar refresh set by
 * the caller stays as the fallback when no object can animate.
 */
function animateTemporaryHp(tokenDocument: AnimatableTokenDocument): void {
	const temp = Number((tokenDocument.actor?.system as ActorSystemData | undefined)?.health?.temp);
	if (!Number.isFinite(temp)) return;

	const object = tokenDocument.object as AnimatableToken | null;
	if (typeof object?.animate !== 'function') return;

	object.animate(
		{ bar1: { temp } },
		{
			name: `${object.objectId}.animateBars`,
			easing: foundry.canvas.animation.CanvasAnimation.easeInOutCosine,
		},
	);
}

export class ArcanaTokenDocument extends foundry.documents.TokenDocument {
	/** @override */
	protected override _onRelatedUpdate(
		update: Record<string, unknown> = {},
		operation?: Actor.Database.OnUpdateOperation,
	): void {
		super._onRelatedUpdate(update, operation);

		const updates = Array.isArray(update) ? update : [update];
		if (!updates.some((entry) => foundry.utils.hasProperty(entry, TEMPORARY_HP_PATH))) return;
		this.object?.renderFlags.set({ refreshBars: true });

		animateTemporaryHp(this);
	}
}
