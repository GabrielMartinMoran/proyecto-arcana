/**
 * Scene-controls integration for the GM Chaos Points window.
 *
 * Foundry v13+ exposes the Scene controls as a record keyed by control name.
 * This hook adds a GM-only tool to the Token controls that opens (or closes)
 * the {@link GMChaosPointsApp}. The hook is defensive: when the controls shape
 * is not the expected v13/v14 record it silently does nothing instead of
 * breaking the whole controls bar.
 */

import { GMChaosPointsApp } from '../apps/gm-chaos-points';

export const CHAOS_POINTS_TOOL_NAME = 'chaosPoints';
export const CHAOS_POINTS_TOOL_TITLE = 'Puntos de Caos';
/** Orbital icon by Lorc — game-icons.net — CC BY 3.0. */
export const CHAOS_POINTS_TOOL_ICON = 'arcana-orbital-icon';

/** Id of the stylesheet that backs the custom Orbital icon class. */
export const ORBITAL_ICON_STYLES_ID = 'arcana-orbital-icon-styles';

/**
 * Custom-icon rules for the chaos control. The class may land on the tool
 * `<button>` (Foundry v13) or on its inner `<i>` (v14), so the `i.` variant
 * keeps the glyph filling its box either way. The URL is the installed
 * module path, not a filesystem path.
 */
const ORBITAL_ICON_STYLES_CSS = `
.arcana-orbital-icon { background: url("systems/arcana/assets/icons/orbital.svg") no-repeat center / 60% auto; }
i.arcana-orbital-icon { display: block; width: 100%; height: 100%; }
`;

/**
 * Inject the Orbital icon stylesheet into a document head. Idempotent: a
 * document that already carries the style (including double registrations) is
 * left untouched.
 */
export function ensureOrbitalIconStyles(doc: Document = document): void {
	if (!doc?.head || doc.getElementById(ORBITAL_ICON_STYLES_ID)) return;

	const style = doc.createElement('style');
	style.id = ORBITAL_ICON_STYLES_ID;
	style.textContent = ORBITAL_ICON_STYLES_CSS;
	doc.head.append(style);
}

interface SceneControlTool {
	name: string;
	title: string;
	icon: string;
	order: number;
	button: boolean;
	visible: boolean;
	onChange: () => void;
}

/**
 * Resolve the Token control's tools record from the hook argument. Returns
 * null for any shape other than `{ tokens: { tools: <record> } }`.
 */
function resolveTokenTools(controls: unknown): Record<string, SceneControlTool> | null {
	if (!controls || typeof controls !== 'object') return null;

	const tokens = (controls as Record<string, unknown>).tokens;
	if (!tokens || typeof tokens !== 'object') return null;

	const tools = (tokens as Record<string, unknown>).tools;
	if (!tools || typeof tools !== 'object') return null;

	return tools as Record<string, SceneControlTool>;
}

/**
 * Open the GM Chaos Points window, or close it when it is already open.
 * Resolves the current instance from Foundry's application registry so the
 * control behaves as a toggle.
 */
export function toggleChaosPointsWindow(): void {
	const existing = foundry.applications.instances.get(GMChaosPointsApp.ID);
	if (existing) {
		existing.close();
		return;
	}

	new GMChaosPointsApp().render({ force: true });
}

/**
 * `getSceneControlButtons` hook handler: append the GM-only tool to the Token
 * controls.
 */
export function onGetSceneControlButtons(controls: unknown): void {
	const tools = resolveTokenTools(controls);
	if (!tools) return;

	ensureOrbitalIconStyles();

	tools[CHAOS_POINTS_TOOL_NAME] = {
		name: CHAOS_POINTS_TOOL_NAME,
		title: CHAOS_POINTS_TOOL_TITLE,
		icon: CHAOS_POINTS_TOOL_ICON,
		order: Object.keys(tools).length,
		button: true,
		visible: game?.user?.isGM === true,
		onChange: toggleChaosPointsWindow,
	};
}
