/**
 * Arcana status effects for Foundry VTT v14.
 *
 * `CONFIG.statusEffects` is a Proxy that behaves as both an array and an id map:
 * systems must append entries by id (`CONFIG.statusEffects[id] = entry`) and
 * never replace the list, otherwise the core statuses are lost and
 * `Actor#toggleStatusEffect` stops resolving ids.
 *
 * Orders group the token HUD palette: 100+ states/conditions (chapter 8 plus
 * Concentration from chapter 7), 200+ representative card buffs.
 *
 * Custom icons live under `assets/statuses/`; their origin and license are
 * documented in `CREDITS.md`.
 */

export interface ArcanaStatusEffect {
	readonly id: string;
	readonly name: string;
	readonly img: string;
	readonly order: number;
}

/** Map-shaped view of the v14 `CONFIG.statusEffects` Proxy, indexed by status id. */
export interface StatusEffectRegistry {
	[id: string]: ArcanaStatusEffect;
}

export const ARCANA_STATUS_EFFECTS: readonly ArcanaStatusEffect[] = [
	// Estados y condiciones
	{
		id: 'cansado',
		name: 'Cansado',
		img: 'systems/arcana/assets/statuses/battery-75.svg',
		order: 100,
	},
	{
		id: 'agotado',
		name: 'Agotado',
		img: 'systems/arcana/assets/statuses/battery-50.svg',
		order: 101,
	},
	{
		id: 'exhausto',
		name: 'Exhausto',
		img: 'systems/arcana/assets/statuses/battery-25.svg',
		order: 102,
	},
	{ id: 'asustado', name: 'Asustado', img: 'icons/svg/terror.svg', order: 103 },
	{ id: 'aturdido', name: 'Aturdido', img: 'icons/svg/daze.svg', order: 104 },
	{ id: 'cegado', name: 'Cegado', img: 'icons/svg/blind.svg', order: 105 },
	{ id: 'derribado', name: 'Derribado', img: 'icons/svg/falling.svg', order: 106 },
	{ id: 'dormido', name: 'Dormido', img: 'icons/svg/sleep.svg', order: 107 },
	{
		id: 'encantado',
		name: 'Encantado',
		img: 'systems/arcana/assets/statuses/chained-heart.svg',
		order: 108,
	},
	{ id: 'ensordecido', name: 'Ensordecido', img: 'icons/svg/deaf.svg', order: 109 },
	{ id: 'envenenado', name: 'Envenenado', img: 'icons/svg/poison.svg', order: 110 },
	{
		id: 'inconsciente',
		name: 'Inconsciente',
		img: 'icons/svg/unconscious.svg',
		order: 111,
	},
	{ id: 'inmovilizado', name: 'Inmovilizado', img: 'icons/svg/net.svg', order: 112 },
	{ id: 'moribundo', name: 'Moribundo', img: 'icons/svg/skull.svg', order: 113 },
	{ id: 'concentracion', name: 'Concentración', img: 'icons/svg/eye.svg', order: 114 },

	// Buffs de carta (marcadores manuales, sin automatización)
	{
		id: 'inspiracion-bardica',
		name: 'Inspiración Bárdica',
		img: 'systems/arcana/assets/statuses/musical-notes.svg',
		order: 200,
	},
	{
		id: 'foco-del-escaramuzador',
		name: 'Foco del Escaramuzador',
		img: 'icons/svg/wingfoot.svg',
		order: 201,
	},
	{ id: 'furia-de-batalla', name: 'Furia de Batalla', img: 'icons/svg/combat.svg', order: 202 },
	{
		id: 'forma-del-ki-elemental',
		name: 'Forma del Ki Elemental',
		img: 'icons/svg/ice-aura.svg',
		order: 203,
	},
	{
		id: 'aspecto-de-la-bestia',
		name: 'Aspecto de la Bestia',
		img: 'icons/svg/pawprint.svg',
		order: 204,
	},
	{ id: 'apoteosis-arcana', name: 'Apoteosis Arcana', img: 'icons/svg/angel.svg', order: 205 },
	{ id: 'aura-divina', name: 'Aura Divina', img: 'icons/svg/aura.svg', order: 206 },
	{ id: 'barrera-arcana', name: 'Barrera Arcana', img: 'icons/svg/mage-shield.svg', order: 207 },
	{ id: 'balsamo-natural', name: 'Bálsamo Natural', img: 'icons/svg/heal.svg', order: 208 },
	{ id: 'grito-de-guerra', name: 'Grito de Guerra', img: 'icons/svg/sound.svg', order: 209 },
	{ id: 'punto-vital', name: 'Punto Vital', img: 'icons/svg/dice-target.svg', order: 210 },
	{ id: 'avatar-del-patron', name: 'Avatar del Patrón', img: 'icons/svg/cowled.svg', order: 211 },
];

/**
 * Foundry special status integrations. `CONCENTRATING` is not a core key
 * (dnd5e defines the same one); adding it is safe and lets other packages
 * detect concentration through `CONFIG.specialStatusEffects`.
 */
export const ARCANA_SPECIAL_STATUS_EFFECTS = {
	BLIND: 'cegado',
	CONCENTRATING: 'concentracion',
} as const;

/** Append the Arcana entries to the live `CONFIG.statusEffects` registry by id. */
export function registerArcanaStatusEffects(registry: StatusEffectRegistry): void {
	for (const effect of ARCANA_STATUS_EFFECTS) {
		registry[effect.id] = effect;
	}
}
