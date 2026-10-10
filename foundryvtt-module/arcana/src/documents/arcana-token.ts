/**
 * Arcana Token placeable class.
 *
 * Foundry's core health bar renders `value / max` in green and has no notion
 * of temporary HP. Arcana stores temporary HP in `system.health.temp`, so this
 * subclass appends a cyan overlay segment at the start of bar1, on top of the
 * green fill, spanning `temp / max` of the bar (Option A semantics).
 *
 * The override keeps the core drawing untouched: it always calls
 * `super._drawBar` and only appends geometry to the same `PIXI.Graphics` when
 * bar1 tracks a health attribute and the actor still has temporary HP.
 *
 * The temporary segment also rides the core bar animation: `_getAnimationData`
 * exposes `bar1.temp`, `_getAnimationDuration` extends the core duration by the
 * temporary-HP fraction and `_drawBar` draws the interpolated `data.temp` while
 * the core writes frames into the document.
 *
 * Geometry contract (verified against Foundry v14.360
 * `client/canvas/placeables/token.mjs:1694-1738` and dnd5e's `_drawHPBar`):
 * - bar width  = `document.getSize().width`
 * - bar height = `8 * (document.height >= 2 ? 1.5 : 1) * canvas.dimensions.uiScale`
 * - the overlay is inset by `uiScale` so the core border stays visible and uses
 *   the core fill radius (`2 * uiScale`).
 *
 * Every helper below the geometry math is module-scoped, not a `#private`
 * method: the core calls `_getAnimationData` from `Token#initialize` inside the
 * base constructor, before the subclass private brand is installed, so an
 * override that touches `this.#` aborts canvas construction with
 * `TypeError: Receiver must be an instance of class ...`.
 */

import type { ActorSystemData } from '../types/actor';
import { isHealthBarAttribute } from './arcana-actor';

/** Temporary HP color shared with the dnd5e/pf2e convention. */
export const TEMP_HP_COLOR = 0x66ccff;

/** Temporary HP overlay alpha: translucent enough to keep the green fill visible underneath. */
export const TEMP_HP_ALPHA = 0.85;

/** Core bar geometry constants (v14.360 `Token#_drawBar`): height is 8px, scaled ×1.5 for tokens of 2×2 or larger. */
const CORE_BAR_HEIGHT = 8;
const LARGE_TOKEN_BAR_FACTOR = 1.5;

/** Inputs required to place the temporary HP overlay inside the health bar. */
export interface TemporaryHpOverlayInput {
	max: number;
	temp: number;
	barWidth: number;
	barHeight: number;
	uiScale: number;
}

/** Bar-local geometry for `PIXI.Graphics#drawRoundedRect`. */
export interface TemporaryHpOverlayGeometry {
	x: number;
	y: number;
	width: number;
	height: number;
	radius: number;
}

/**
 * Compute the temporary HP overlay geometry, or `null` when there is nothing
 * to draw. Pure function: no Foundry or PIXI dependencies.
 *
 * The segment spans `clamp(temp, 0, max) / max` of the bar and is inset so it
 * never covers the core border. Degenerate inputs (zero, negative or NaN max,
 * temp, bar width or bar height) yield `null`, as does an inset that leaves no
 * drawable area.
 */
export function computeTemporaryHpOverlay(
	input: TemporaryHpOverlayInput,
): TemporaryHpOverlayGeometry | null {
	const max = toPositiveNumber(input.max);
	const temp = toPositiveNumber(input.temp);
	const barWidth = toPositiveNumber(input.barWidth);
	const barHeight = toPositiveNumber(input.barHeight);
	if (max === null || temp === null || barWidth === null || barHeight === null) return null;

	const inset = toNonNegativeNumber(input.uiScale);
	const width = (Math.min(temp, max) / max) * barWidth - 2 * inset;
	const height = barHeight - 2 * inset;
	if (width <= 0 || height <= 0) return null;

	return {
		x: inset,
		y: inset,
		width,
		height,
		radius: Math.min(2 * inset, width / 2, height / 2),
	};
}

function toPositiveNumber(value: number): number | null {
	const number = Number(value);
	return Number.isFinite(number) && number > 0 ? number : null;
}

function toNonNegativeNumber(value: number): number {
	const number = Number(value);
	return Number.isFinite(number) && number > 0 ? number : 0;
}

/** Core bar animation speed: 1500 ms for a full 0→100% change (v14.360 `Token#_getAnimationDuration`). */
const FULL_BAR_ANIMATION_MS = 1500;

/**
 * Animation duration contributed by a temporary HP change, mirroring the core
 * bar formula (`1500 ms × |Δpercent|`). Pure function: zero when either value
 * or the maximum is not finite, when the maximum is not positive, or when the
 * value does not change.
 */
export function computeTempAnimationDuration(
	fromTemp: number,
	toTemp: number,
	max: number,
): number {
	if (!Number.isFinite(fromTemp) || !Number.isFinite(toTemp) || !Number.isFinite(max) || max <= 0) {
		return 0;
	}
	return (FULL_BAR_ANIMATION_MS * Math.abs(toTemp - fromTemp)) / max;
}

/**
 * Foundry v14 animates `bar1`/`bar2` through `Token#_getAnimationData`, but the
 * v13 type declarations omit them; the v14 shape is described locally, like the
 * `canvas.dimensions.uiScale` cast used below.
 */
interface AnimatedBarValues {
	value?: number;
	max?: number;
	temp?: number;
}

type V14AnimationData = Token.AnimationData & {
	bar1?: AnimatedBarValues;
	bar2?: AnimatedBarValues;
};

/**
 * Minimal structural view of the token document the overlay geometry reads.
 * `this.document` (a `TokenDocument`) satisfies it.
 */
interface OverlayDocument {
	getSize(): { width: number; height: number };
	height: number;
}

/**
 * Actor temporary HP, or `null` when there is no finite value to use.
 * Module-scoped so overrides stay callable before subclass initialization.
 */
function readActorTemporaryHp(actor: Actor | null | undefined): number | null {
	const temp = Number((actor?.system as ActorSystemData | undefined)?.health?.temp);
	return Number.isFinite(temp) ? temp : null;
}

/** Whether a bar attribute string points at the Arcana health attribute. */
function bar1TracksHealth(attribute: unknown): boolean {
	return typeof attribute === 'string' && isHealthBarAttribute(attribute);
}

/**
 * Temporary HP to draw: the interpolated value the core writes into the bar
 * data during an animation, or the actor value outside of it.
 */
function resolveTemporaryHp(
	data: NonNullable<TokenDocument.GetBarAttributeReturn>,
	actor: Actor | null | undefined,
): number {
	const animatedTemp = (data as { temp?: unknown }).temp;
	if (typeof animatedTemp === 'number' && Number.isFinite(animatedTemp)) return animatedTemp;
	return readActorTemporaryHp(actor) ?? 0;
}

/**
 * Append the cyan temporary HP segment to the already drawn health bar.
 * A no-op when the temporary HP or the geometry degenerates.
 */
function drawTemporaryHpOverlay(
	bar: PIXI.Graphics,
	tokenDocument: OverlayDocument,
	max: number,
	temp: number,
): void {
	// v14 runtime sets `canvas.dimensions.uiScale`; the v13 beta types do not
	// declare it, so it is read through a local structural cast.
	const scale = (canvas.dimensions as { uiScale?: number } | null)?.uiScale ?? 1;
	const overlay = computeTemporaryHpOverlay({
		max,
		temp,
		barWidth: tokenDocument.getSize().width,
		barHeight: CORE_BAR_HEIGHT * (tokenDocument.height >= 2 ? LARGE_TOKEN_BAR_FACTOR : 1) * scale,
		uiScale: scale,
	});
	if (!overlay) return;

	bar
		.beginFill(TEMP_HP_COLOR, TEMP_HP_ALPHA)
		.lineStyle(0)
		.drawRoundedRect(overlay.x, overlay.y, overlay.width, overlay.height, overlay.radius)
		.endFill();
}

export class ArcanaToken extends foundry.canvas.placeables.Token {
	/** @override */
	protected override _getAnimationData(): Token.AnimationData {
		const data = super._getAnimationData() as V14AnimationData;
		const temp = readActorTemporaryHp(this.actor);
		if (temp !== null && bar1TracksHealth(this.document.bar1?.attribute) && data.bar1) {
			data.bar1.temp = temp;
		}
		return data;
	}

	/**
	 * @override
	 * The core only measures `value`/`max`, so a temporary-HP-only change would
	 * otherwise animate with duration 0 (an instant jump).
	 */
	protected override _getAnimationDuration(
		from: Token.AnimationDataForDuration,
		to: Token.PartialAnimationData,
		options?: Token.GetAnimationDurationOptions,
	): number {
		const coreDuration = super._getAnimationDuration(from, to, options);
		const fromBar = (from as V14AnimationData).bar1;
		const toBar = (to as V14AnimationData).bar1;
		const tempDuration = computeTempAnimationDuration(
			Number(fromBar?.temp),
			Number(toBar?.temp),
			Number(toBar?.max ?? fromBar?.max),
		);
		return Math.max(coreDuration, tempDuration);
	}

	/** @override */
	protected override _drawBar(
		index: number,
		bar: PIXI.Graphics,
		data: NonNullable<TokenDocument.GetBarAttributeReturn>,
	): boolean {
		const result = super._drawBar(index, bar, data);

		if (index === 0 && isHealthBarAttribute(data.attribute) && 'max' in data) {
			drawTemporaryHpOverlay(bar, this.document, data.max, resolveTemporaryHp(data, this.actor));
		}

		return result;
	}
}
