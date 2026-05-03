/**
 * Pure functions for building sheet URLs and token settings.
 * These functions have no side effects and no dependencies on Foundry globals.
 */

export interface SheetUrlParams {
	sheetUrl: string | null;
	baseUrl: string;
	actor: {
		uuid: string | null;
		id: string;
		name: string;
		system: { health?: { value: number; max: number } };
	};
	localNotes: string | null;
}

export interface SheetUrlResult {
	iframeUrl: string | null;
	isBestiary: boolean;
	localNotes: string;
	health: { value: number; max: number };
}

export interface TokenSettings {
	'prototypeToken.actorLink': boolean;
	'prototypeToken.displayBars': number;
	'prototypeToken.bar1.attribute': string | null;
	'prototypeToken.bar2.attribute': null;
	'prototypeToken.sight.enabled': boolean;
}

/**
 * Build the sheet URL for embedding in an iframe.
 *
 * @param params - Parameters for building the URL
 * @returns SheetUrlResult containing iframeUrl, isBestiary flag, localNotes, and health data
 *
 * @example
 * // Character URL
 * buildSheetUrl({ sheetUrl: 'https://app.com/characters/shared/123', baseUrl: 'https://app.com', actor: {...}, localNotes: null })
 * // Returns: { iframeUrl: 'https://app.com/embedded/characters/123?mode=foundry&uuid=...&startHp=50&startMax=100', isBestiary: false, ... }
 *
 * // Bestiary NPC URL
 * buildSheetUrl({ sheetUrl: 'https://app.com/bestiary/npc1', ... })
 * // Returns: { iframeUrl: '...&readonly=1', isBestiary: true, ... }
 */
export function buildSheetUrl(params: SheetUrlParams): SheetUrlResult {
	const { sheetUrl, baseUrl, actor, localNotes } = params;

	let urlWeb = sheetUrl;
	if (!urlWeb) urlWeb = baseUrl;

	const result: SheetUrlResult = {
		iframeUrl: null,
		isBestiary: false,
		localNotes: '',
		health: { value: 0, max: 0 },
	};

	if (urlWeb) {
		// Transform shared characters URL to embedded format
		if (urlWeb.includes('/characters/shared/')) {
			urlWeb = urlWeb.replace('/characters/shared/', '/embedded/characters/');
		}

		result.health = actor.system.health || { value: 0, max: 0 };

		// Detect bestiary/NPC mode
		const isNpc = urlWeb.includes('/npc');
		if (urlWeb.includes('/bestiary/') || urlWeb.includes('/creatures/') || isNpc) {
			result.isBestiary = true;
			result.localNotes = localNotes || '';
		}

		const targetId = actor.uuid || actor.id;

		const url = new URL(urlWeb);
		url.searchParams.set('mode', 'foundry');
		url.searchParams.set('uuid', targetId);
		url.searchParams.set('startHp', String(result.health.value));
		url.searchParams.set('startMax', String(result.health.max));
		if (isNpc) url.searchParams.set('readonly', '1');
		result.iframeUrl = url.toString();
	}

	return result;
}

/**
 * Build token settings for the configureSheet dialog.
 *
 * @param isLinked - Whether the actor is linked to a prototype token
 * @param _actorName - The actor name (reserved for future use)
 * @returns TokenSettings object for actor.update()
 *
 * @example
 * buildTokenSettings(true, 'Gandalf')
 * // Returns: { 'prototypeToken.actorLink': true, 'prototypeToken.displayBars': 40, ... }
 *
 * buildTokenSettings(false, 'Goblin')
 * // Returns: { 'prototypeToken.actorLink': false, 'prototypeToken.displayBars': 40, ... }
 */
export function buildTokenSettings(isLinked: boolean, _actorName: string): TokenSettings {
	return {
		'prototypeToken.actorLink': isLinked,
		'prototypeToken.displayBars': 40, // OWNER ONLY
		'prototypeToken.bar1.attribute': 'health',
		'prototypeToken.bar2.attribute': null,
		'prototypeToken.sight.enabled': true,
	};
}
