import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { cwd } from 'node:process';
import { describe, expect, it } from 'vitest';
import {
	ARCANA_SPECIAL_STATUS_EFFECTS,
	ARCANA_STATUS_EFFECTS,
	registerArcanaStatusEffects,
	type ArcanaStatusEffect,
	type StatusEffectRegistry,
} from './status-effects';

/**
 * Acceptance table from plan v2 + addendum 1 (option 1, 5 new SVGs). Kept
 * literal on purpose: it mirrors the approved registration table, so any drift
 * in id, name, icon or order fails the suite.
 */
const EXPECTED_STATUS_EFFECTS: readonly ArcanaStatusEffect[] = [
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

const CUSTOM_STATUS_ASSETS = [
	'battery-75.svg',
	'battery-50.svg',
	'battery-25.svg',
	'musical-notes.svg',
	'chained-heart.svg',
] as const;

/**
 * Mutually exclusive pairs/groups allowed to share an icon (rules enforced in
 * T2). Every other pair of entries can be active at the same time, so sharing
 * an icon there would make the HUD unreadable.
 */
const MUTUALLY_EXCLUSIVE_GROUPS: readonly (readonly string[])[] = [
	['cansado', 'agotado', 'exhausto'],
	['foco-del-escaramuzador', 'concentracion'],
];

function resolveStatusAsset(file: string): string {
	return readFileSync(resolve(cwd(), 'assets/statuses', file), 'utf8');
}

function loadCredits(): string {
	return readFileSync(resolve(cwd(), 'CREDITS.md'), 'utf8');
}

describe('FEAT foundry-status-effects — Arcana status effect registry', () => {
	it('FEAT foundry-status-effects @registry — registers the 27 approved entries with id, name, icon and order', () => {
		expect(ARCANA_STATUS_EFFECTS).toHaveLength(27);
		expect(ARCANA_STATUS_EFFECTS).toEqual(EXPECTED_STATUS_EFFECTS);
	});

	it('FEAT foundry-status-effects @registry — uses unique, accent-free slug ids', () => {
		const ids = ARCANA_STATUS_EFFECTS.map((effect) => effect.id);

		expect(new Set(ids).size).toBe(ids.length);
		for (const id of ids) expect(id).toMatch(/^[a-z][a-z0-9-]*$/);
	});

	it('FEAT foundry-status-effects @core — appends to an existing registry preserving core entries', () => {
		const coreDead = {
			id: 'dead',
			name: 'EFFECT.StatusDead',
			img: 'icons/svg/skull.svg',
			order: 10,
		};
		const registry: StatusEffectRegistry = { dead: coreDead };

		registerArcanaStatusEffects(registry);

		expect(registry.dead).toBe(coreDead);
		expect(Object.keys(registry)).toHaveLength(1 + EXPECTED_STATUS_EFFECTS.length);
		for (const effect of ARCANA_STATUS_EFFECTS) {
			expect(registry[effect.id]).toEqual(effect);
		}
	});

	it('FEAT foundry-status-effects @icons — uses core icon paths and the five shipped custom SVGs', () => {
		for (const effect of ARCANA_STATUS_EFFECTS) {
			expect(effect.img).toMatch(/^(icons\/svg\/|systems\/arcana\/assets\/statuses\/)/);
		}

		const customImages = [
			...new Set(
				ARCANA_STATUS_EFFECTS.filter((effect) =>
					effect.img.startsWith('systems/arcana/assets/statuses/'),
				).map((effect) => effect.img.replace('systems/arcana/assets/statuses/', '')),
			),
		].sort();
		expect(customImages).toEqual([...CUSTOM_STATUS_ASSETS].sort());
		expect(
			ARCANA_STATUS_EFFECTS.filter((effect) => effect.img.startsWith('icons/svg/')),
		).toHaveLength(22);
	});

	it('FEAT foundry-status-effects @icons — shares an icon only between mutually exclusive statuses', () => {
		const byImage = new Map<string, string[]>();
		for (const { id, img } of ARCANA_STATUS_EFFECTS) {
			byImage.set(img, [...(byImage.get(img) ?? []), id]);
		}

		for (const [img, ids] of byImage) {
			if (ids.length < 2) continue;
			const group = MUTUALLY_EXCLUSIVE_GROUPS.find((candidate) => candidate.includes(ids[0]));
			if (!group || ids.some((id) => !group.includes(id))) {
				throw new Error(`statuses share icon ${img} but can coexist: ${ids.join(', ')}`);
			}
		}
	});

	it('FEAT foundry-status-effects @special @concentration — maps the Foundry special status integrations', () => {
		expect(ARCANA_SPECIAL_STATUS_EFFECTS).toEqual({
			BLIND: 'cegado',
			CONCENTRATING: 'concentracion',
		});
	});
});

describe('FEAT foundry-status-effects @icons — custom SVG assets', () => {
	it.each(CUSTOM_STATUS_ASSETS)('%s is a clean 512x512 transparent white glyph', (file) => {
		const svg = resolveStatusAsset(file);
		const parsed = new DOMParser().parseFromString(svg, 'image/svg+xml');

		expect(parsed.querySelector('parsererror')).toBeNull();
		expect(svg).toContain('viewBox="0 0 512 512"');
		expect(svg).toMatch(/width="512"/);
		expect(svg).toMatch(/height="512"/);
		expect(svg).not.toContain('M0 0h512v512H0z');
		expect(svg).not.toMatch(/<rect\b/);
		expect(svg).toContain('fill="#fff"');
	});
});

describe('FEAT foundry-status-effects @icons — third-party icon credits', () => {
	it('credits game-icons.net under CC BY 3.0 with the modifications noted', () => {
		const credits = loadCredits();

		expect(credits).toMatch(/game-icons\.net/);
		expect(credits).toContain('https://creativecommons.org/licenses/by/3.0/');
		expect(credits).toMatch(/CC BY 3\.0/);
		expect(credits).toMatch(/background removed/i);
	});

	it.each(['PriorBlue', 'Delapouite', 'Lorc'])('credits the author %s', (author) => {
		const credits = loadCredits();

		expect(credits).toContain(author);
	});
});
