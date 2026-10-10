/**
 * Token border color palette.
 *
 * The actor flag `arcana.tokenBorderColor` stores a palette id (not the hex), so
 * updating the palette keeps existing actors working. Ids renamed in a palette
 * update stay valid through `LEGACY_TOKEN_COLOR_ALIASES` (e.g. `silver` ->
 * `gray`), which only the resolve helpers consult: `isTokenColorId` accepts
 * current palette ids exclusively.
 */

export const TOKEN_COLOR_IDS = [
	'black',
	'red',
	'green',
	'yellow',
	'orange',
	'gray',
	'lightblue',
	'purple',
] as const;

export type TokenColorId = (typeof TOKEN_COLOR_IDS)[number];

export interface TokenColor {
	id: TokenColorId;
	label: string;
	hex: string;
}

export const TOKEN_COLORS: readonly TokenColor[] = [
	{ id: 'black', label: 'Negro', hex: '#000000' },
	{ id: 'red', label: 'Rojo', hex: '#990000' },
	{ id: 'green', label: 'Verde', hex: '#27a241' },
	{ id: 'yellow', label: 'Amarillo', hex: '#e6b800' },
	{ id: 'orange', label: 'Naranja', hex: '#d35400' },
	{ id: 'gray', label: 'Gris', hex: '#9aa0a6' },
	{ id: 'lightblue', label: 'Celeste', hex: '#2b89fb' },
	{ id: 'purple', label: 'Púrpura', hex: '#7800ff' },
];

export const DEFAULT_CHARACTER_TOKEN_COLOR_ID: TokenColorId = 'black';
export const DEFAULT_NPC_TOKEN_COLOR_ID: TokenColorId = 'red';

/**
 * Ids from previous palettes mapped to their current id. `silver` was renamed
 * to `gray`; actors whose flag still stores it must keep resolving to gray.
 */
const LEGACY_TOKEN_COLOR_ALIASES: Readonly<Partial<Record<string, TokenColorId>>> = {
	silver: 'gray',
};

const TOKEN_COLOR_BY_ID = Object.fromEntries(
	TOKEN_COLORS.map((color) => [color.id, color]),
) as Record<TokenColorId, TokenColor>;

export function isTokenColorId(value: unknown): value is TokenColorId {
	return typeof value === 'string' && Object.hasOwn(TOKEN_COLOR_BY_ID, value);
}

export function getTokenColorHex(id: TokenColorId): string {
	return TOKEN_COLOR_BY_ID[id].hex;
}

export function getDefaultTokenColorId(isNpc: boolean): TokenColorId {
	return isNpc ? DEFAULT_NPC_TOKEN_COLOR_ID : DEFAULT_CHARACTER_TOKEN_COLOR_ID;
}

/**
 * Resolve the default color id for an actor, preferring its document type and
 * falling back to the sheet kind (bestiary/npc route vs character route).
 */
export function resolveDefaultTokenColorId(actorType: unknown, isBestiary: boolean): TokenColorId {
	if (actorType === 'npc') return DEFAULT_NPC_TOKEN_COLOR_ID;
	if (actorType === 'character') return DEFAULT_CHARACTER_TOKEN_COLOR_ID;
	return getDefaultTokenColorId(isBestiary);
}

/**
 * Resolve a stored palette id: current ids pass through, legacy aliases are
 * upgraded to their renamed id, and anything else falls back to `fallbackId`.
 */
export function resolveTokenColorId(value: unknown, fallbackId: TokenColorId): TokenColorId {
	if (isTokenColorId(value)) return value;
	if (typeof value === 'string') {
		const legacyId = LEGACY_TOKEN_COLOR_ALIASES[value];
		if (legacyId) return legacyId;
	}
	return fallbackId;
}

export function resolveTokenColorHex(value: unknown, fallbackId: TokenColorId): string {
	return getTokenColorHex(resolveTokenColorId(value, fallbackId));
}
