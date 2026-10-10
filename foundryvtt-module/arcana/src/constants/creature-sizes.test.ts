/**
 * Unit tests for the Arcana creature size catalog, validators and helpers.
 */

import { describe, expect, it } from 'vitest';
import {
	buildCreatureSizeId,
	CREATURE_SIZE_CATEGORIES,
	CREATURE_SIZE_CATEGORY_IDS,
	CREATURE_SIZE_IDS,
	CREATURE_SIZES,
	getCreatureSizeCategoryId,
	inferCreatureSize,
	isCreatureSizeId,
	LARGE_SIZE_VARIANTS,
	resolveCreatureSize,
} from './creature-sizes';

describe('CREATURE_SIZES', () => {
	it('exposes the seven size variants with their exact ids, labels and footprints', () => {
		expect(CREATURE_SIZES).toEqual([
			{ id: 'diminuto', label: 'Diminuto', width: 0.5, height: 0.5 },
			{ id: 'pequeno', label: 'Pequeño', width: 1, height: 1 },
			{ id: 'mediano', label: 'Mediano', width: 1, height: 1 },
			{ id: 'grande', label: 'Grande', width: 2, height: 2 },
			{ id: 'inmenso', label: 'Inmenso 3×3 (estándar)', width: 3, height: 3 },
			{ id: 'inmenso-4', label: 'Inmenso 4×4 (mayor)', width: 4, height: 4 },
			{ id: 'inmenso-5', label: 'Inmenso 5×5 (colosal)', width: 5, height: 5 },
		]);
		expect(CREATURE_SIZE_IDS).toEqual(CREATURE_SIZES.map((size) => size.id));
	});

	it('exposes the five canonical categories exactly once each', () => {
		expect(CREATURE_SIZE_CATEGORIES).toEqual([
			{ id: 'diminuto', label: 'Diminuto' },
			{ id: 'pequeno', label: 'Pequeño' },
			{ id: 'mediano', label: 'Mediano' },
			{ id: 'grande', label: 'Grande' },
			{ id: 'inmenso', label: 'Inmenso' },
		]);
		expect(CREATURE_SIZE_CATEGORY_IDS).toEqual(
			CREATURE_SIZE_CATEGORIES.map((category) => category.id),
		);
	});

	it('lists the largest-category variants in ascending footprint order', () => {
		expect(LARGE_SIZE_VARIANTS.map((variant) => variant.id)).toEqual([
			'inmenso',
			'inmenso-4',
			'inmenso-5',
		]);
		expect(LARGE_SIZE_VARIANTS.map((variant) => variant.width)).toEqual([3, 4, 5]);
	});
});

describe('isCreatureSizeId', () => {
	it('recognizes every canonical id and rejects anything else', () => {
		for (const id of CREATURE_SIZE_IDS) {
			expect(isCreatureSizeId(id)).toBe(true);
		}
		expect(isCreatureSizeId('purple')).toBe(false);
		expect(isCreatureSizeId('')).toBe(false);
		expect(isCreatureSizeId(undefined)).toBe(false);
		expect(isCreatureSizeId(42)).toBe(false);
	});

	it('rejects "Enorme": it aliases Inmenso in the content, it is not a sixth category', () => {
		expect(isCreatureSizeId('enorme')).toBe(false);
		expect(isCreatureSizeId('Enorme')).toBe(false);
	});
});

describe('resolveCreatureSize', () => {
	it('resolves stored ids to their variant definition', () => {
		expect(resolveCreatureSize('grande')).toEqual({
			id: 'grande',
			label: 'Grande',
			width: 2,
			height: 2,
		});
		expect(resolveCreatureSize('inmenso-4')?.width).toBe(4);
	});

	it('returns null for missing or invalid values', () => {
		expect(resolveCreatureSize(undefined)).toBeNull();
		expect(resolveCreatureSize(null)).toBeNull();
		expect(resolveCreatureSize('enorme')).toBeNull();
		expect(resolveCreatureSize(3)).toBeNull();
	});
});

describe('getCreatureSizeCategoryId', () => {
	it('maps base ids to themselves and the largest variants to inmenso', () => {
		expect(getCreatureSizeCategoryId('diminuto')).toBe('diminuto');
		expect(getCreatureSizeCategoryId('mediano')).toBe('mediano');
		expect(getCreatureSizeCategoryId('inmenso')).toBe('inmenso');
		expect(getCreatureSizeCategoryId('inmenso-4')).toBe('inmenso');
		expect(getCreatureSizeCategoryId('inmenso-5')).toBe('inmenso');
	});
});

describe('buildCreatureSizeId', () => {
	it('combines the largest category with its footprint variants', () => {
		expect(buildCreatureSizeId('inmenso', 3)).toBe('inmenso');
		expect(buildCreatureSizeId('inmenso', 4)).toBe('inmenso-4');
		expect(buildCreatureSizeId('inmenso', 5)).toBe('inmenso-5');
	});

	it('keeps categories without variants unchanged', () => {
		expect(buildCreatureSizeId('diminuto', 4)).toBe('diminuto');
		expect(buildCreatureSizeId('grande', 5)).toBe('grande');
	});

	it('falls back to the standard largest footprint for unknown values', () => {
		expect(buildCreatureSizeId('inmenso')).toBe('inmenso');
		expect(buildCreatureSizeId('inmenso', Number.NaN)).toBe('inmenso');
		expect(buildCreatureSizeId('inmenso', 6)).toBe('inmenso');
	});
});

describe('inferCreatureSize', () => {
	it('infers variants that match the token dimensions uniquely', () => {
		expect(inferCreatureSize(0.5, 0.5)?.id).toBe('diminuto');
		expect(inferCreatureSize(2, 2)?.id).toBe('grande');
		expect(inferCreatureSize(3, 3)?.id).toBe('inmenso');
		expect(inferCreatureSize(4, 4)?.id).toBe('inmenso-4');
		expect(inferCreatureSize(5, 5)?.id).toBe('inmenso-5');
	});

	it('returns null when the dimensions match more than one size (1×1)', () => {
		expect(inferCreatureSize(1, 1)).toBeNull();
	});

	it('returns null for non-square, missing or invalid dimensions', () => {
		expect(inferCreatureSize(2, 3)).toBeNull();
		expect(inferCreatureSize(undefined, 1)).toBeNull();
		expect(inferCreatureSize(1, '1')).toBeNull();
	});
});
