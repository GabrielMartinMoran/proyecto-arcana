/**
 * Compact pause indicator (Foundry v14).
 *
 * Core renders the paused game as a full-width 180px band with a 100px spinning
 * clock icon in the middle of the screen. The module replaces it with a small
 * floating chip centered above the hotbar: a masked pause glyph plus the
 * localized pause word.
 *
 * The stylesheet is injected from code (same convention as
 * `setup-detached-window` and `render-scene-controls`) instead of declared in
 * the manifest. Rules are unlayered while the core rules live in
 * `@layer applications`, so no `!important` is needed. `display` is deliberately
 * left alone: core hides `#pause` and shows `#pause.paused`, and overriding it
 * here would leave the capsule visible at all times.
 */

/** Id of the stylesheet that replaces the core pause banner with a capsule. */
export const PAUSE_STYLES_ID = 'arcana-pause-styles';

/**
 * Two-bar pause glyph as an inline SVG data URI. It is drawn through `mask`
 * over `currentColor` so it inherits the caption color and stays sharp at the
 * 11x13px capsule size, where the core's 100px clock icon becomes a blur.
 */
const PAUSE_GLYPH =
	"url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Crect x='5' y='4' width='4.5' height='16' rx='1.6'/%3E%3Crect x='14.5' y='4' width='4.5' height='16' rx='1.6'/%3E%3C/svg%3E\")";

/**
 * Flat chip geometry and typography for the core pause element. It mirrors the
 * core panels: square-ish 4px radius, translucent black fill, hairline border
 * and a tight drop shadow, so the indicator reads as native UI. Foundry's own
 * `#pause.paused { display: flex }` keeps controlling visibility, and the
 * `flex-direction: row` here turns the core column layout into the approved
 * glyph-plus-word chip.
 */
const PAUSE_STYLES_CSS = `
#pause {
	--arcana-pause-glyph: ${PAUSE_GLYPH};
	top: auto;
	left: 50%;
	right: auto;
	bottom: 108px;
	transform: translateX(-50%);
	flex-direction: row;
	width: fit-content;
	height: auto;
	min-width: 0;
	align-items: center;
	gap: 8px;
	padding: 7px 12px;
	border: 1px solid rgba(255, 255, 255, .14);
	border-radius: 4px;
	background: rgba(0, 0, 0, .55);
	box-shadow: 0 0 6px rgba(0, 0, 0, .5);
	color: #e8e4d8;
	text-shadow: none;
	pointer-events: none;
	z-index: 100;
}

#pause.paused {
	animation: none;
}

#pause::before {
	content: "";
	flex: none;
	width: 11px;
	height: 13px;
	background: currentColor;
	-webkit-mask: var(--arcana-pause-glyph) center / contain no-repeat;
	mask: var(--arcana-pause-glyph) center / contain no-repeat;
}

#pause img {
	display: none;
}

#pause figcaption {
	margin: 0;
	padding: 0;
	font-size: 11px;
	font-weight: 600;
	line-height: 1;
	letter-spacing: .12em;
	text-transform: uppercase;
	color: inherit;
	white-space: nowrap;
}

@media (prefers-reduced-motion: reduce) {
	#pause.paused {
		animation: none;
	}
}
`;

/**
 * Inject the pause stylesheet into a document head. Idempotent: a document that
 * already carries the style (including double registrations) is left untouched.
 */
export function ensurePauseStyles(doc: Document = document): void {
	if (!doc?.head || doc.getElementById(PAUSE_STYLES_ID)) return;

	const style = doc.createElement('style');
	style.id = PAUSE_STYLES_ID;
	style.textContent = PAUSE_STYLES_CSS;
	doc.head.append(style);
}

/** Register the compact pause indicator. */
export function setupPauseIndicator(doc: Document = document): void {
	ensurePauseStyles(doc);
}
