/**
 * Pure helper for mapping night vision distance categories to Foundry sight settings.
 */

export type NightVisionCategory = 'none' | 'immediate' | 'close' | 'medium' | 'long' | 'unlimited';

export interface NightVisionSightSettings {
	visionMode: string;
	range: number | null;
}

export interface NightVisionSightUpdate {
	'sight.visionMode': string;
	'sight.range': number | null;
	'sight.saturation'?: number;
	'sight.brightness'?: number;
	'sight.contrast'?: number;
	'sight.attenuation'?: number;
	'sight.color'?: string | null;
}

export const NIGHT_VISION_LABELS: Record<NightVisionCategory, string> = {
	none: 'Ninguna',
	immediate: 'Inmediata',
	close: 'Cercana',
	medium: 'Media',
	long: 'Larga',
	unlimited: 'Ilimitada',
};

/**
 * Map a night vision category to Foundry VTT sight settings.
 *
 * @param category - Night vision distance category
 * @returns Sight settings with visionMode and range for the token
 *
 * @example
 * getNightVisionSightSettings('medium')
 * // Returns: { visionMode: 'darkvision', range: 50 }
 */
export function getNightVisionSightSettings(
	category: NightVisionCategory,
): NightVisionSightSettings {
	switch (category) {
		case 'none':
			return { visionMode: 'basic', range: 0 };
		case 'immediate':
			return { visionMode: 'darkvision', range: 1 };
		case 'close':
			return { visionMode: 'darkvision', range: 10 };
		case 'medium':
			return { visionMode: 'darkvision', range: 50 };
		case 'long':
			return { visionMode: 'darkvision', range: 100 };
		case 'unlimited':
			return { visionMode: 'darkvision', range: null };
		default:
			return { visionMode: 'basic', range: 0 };
	}
}

/**
 * Get a complete sight update object for a night vision category,
 * including VisionMode defaults from Foundry's CONFIG at runtime.
 *
 * @param category - Night vision distance category
 * @returns Flat sight update with dotted sight keys and any defaults
 */
export function getNightVisionSightUpdate(category: NightVisionCategory): NightVisionSightUpdate {
	const { visionMode, range } = getNightVisionSightSettings(category);
	const defaults = (globalThis as any).CONFIG?.Canvas?.visionModes?.[visionMode]?.vision?.defaults;

	const base: NightVisionSightUpdate = {
		'sight.visionMode': visionMode,
		'sight.range': range,
	};

	if (!defaults) {
		return base;
	}

	return {
		...base,
		...(defaults.saturation !== undefined ? { 'sight.saturation': defaults.saturation } : {}),
		...(defaults.brightness !== undefined ? { 'sight.brightness': defaults.brightness } : {}),
		...(defaults.contrast !== undefined ? { 'sight.contrast': defaults.contrast } : {}),
		...(defaults.attenuation !== undefined ? { 'sight.attenuation': defaults.attenuation } : {}),
		...(defaults.color !== undefined ? { 'sight.color': defaults.color } : {}),
	};
}
