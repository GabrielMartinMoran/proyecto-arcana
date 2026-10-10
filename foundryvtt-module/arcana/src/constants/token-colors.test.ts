/**
 * Unit tests for the token border color palette and validators.
 */

import { describe, expect, it } from 'vitest';
import {
	DEFAULT_CHARACTER_TOKEN_COLOR_ID,
	DEFAULT_NPC_TOKEN_COLOR_ID,
	TOKEN_COLORS,
	getDefaultTokenColorId,
	getTokenColorHex,
	isTokenColorId,
	resolveDefaultTokenColorId,
	resolveTokenColorHex,
	resolveTokenColorId,
} from './token-colors';

describe('TOKEN_COLORS', () => {
	it('exposes exactly the eight palette entries with their hex values', () => {
		expect(TOKEN_COLORS).toEqual([
			{ id: 'black', label: 'Negro', hex: '#000000' },
			{ id: 'red', label: 'Rojo', hex: '#990000' },
			{ id: 'green', label: 'Verde', hex: '#27a241' },
			{ id: 'yellow', label: 'Amarillo', hex: '#e6b800' },
			{ id: 'orange', label: 'Naranja', hex: '#d35400' },
			{ id: 'gray', label: 'Gris', hex: '#9aa0a6' },
			{ id: 'lightblue', label: 'Celeste', hex: '#2b89fb' },
			{ id: 'purple', label: 'Púrpura', hex: '#7800ff' },
		]);
	});

	it('recognizes every palette id and rejects anything else', () => {
		for (const color of TOKEN_COLORS) {
			expect(isTokenColorId(color.id)).toBe(true);
		}
		expect(isTokenColorId('magenta')).toBe(false);
		expect(isTokenColorId('')).toBe(false);
		expect(isTokenColorId(undefined)).toBe(false);
		expect(isTokenColorId(42)).toBe(false);
	});

	it('keeps the legacy silver id out of the strict validator', () => {
		expect(isTokenColorId('silver')).toBe(false);
	});

	it('resolves the hex for each palette id', () => {
		expect(getTokenColorHex('green')).toBe('#27a241');
		expect(getTokenColorHex('gray')).toBe('#9aa0a6');
		expect(getTokenColorHex('orange')).toBe('#d35400');
	});
});

describe('getDefaultTokenColorId', () => {
	it('uses black for characters and red for NPCs', () => {
		expect(DEFAULT_CHARACTER_TOKEN_COLOR_ID).toBe('black');
		expect(DEFAULT_NPC_TOKEN_COLOR_ID).toBe('red');
		expect(getDefaultTokenColorId(false)).toBe('black');
		expect(getDefaultTokenColorId(true)).toBe('red');
	});
});

describe('resolveDefaultTokenColorId', () => {
	it('prefers the actor type over the bestiary fallback', () => {
		expect(resolveDefaultTokenColorId('character', true)).toBe('black');
		expect(resolveDefaultTokenColorId('npc', false)).toBe('red');
	});

	it('falls back to the bestiary kind when the actor type is unknown', () => {
		expect(resolveDefaultTokenColorId(undefined, false)).toBe('black');
		expect(resolveDefaultTokenColorId(undefined, true)).toBe('red');
	});
});

describe('resolveTokenColorId', () => {
	it('keeps valid stored ids', () => {
		expect(resolveTokenColorId('orange', 'black')).toBe('orange');
	});

	it('maps the legacy silver id to its renamed gray id', () => {
		expect(resolveTokenColorId('silver', 'black')).toBe('gray');
	});

	it('falls back for invalid or missing stored values', () => {
		expect(resolveTokenColorId('magenta', 'black')).toBe('black');
		expect(resolveTokenColorId(null, 'red')).toBe('red');
		expect(resolveTokenColorId(42, 'red')).toBe('red');
	});
});

describe('resolveTokenColorHex', () => {
	it('resolves stored ids to their hex', () => {
		expect(resolveTokenColorHex('gray', 'black')).toBe('#9aa0a6');
	});

	it('resolves the legacy silver id to the gray hex', () => {
		expect(resolveTokenColorHex('silver', 'black')).toBe('#9aa0a6');
	});

	it('falls back to the default hex for invalid values', () => {
		expect(resolveTokenColorHex('magenta', 'black')).toBe('#000000');
		expect(resolveTokenColorHex(undefined, 'red')).toBe('#990000');
	});
});
