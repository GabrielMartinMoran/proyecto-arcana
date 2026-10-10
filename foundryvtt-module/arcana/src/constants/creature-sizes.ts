/**
 * Arcana creature size catalog.
 *
 * The manual defines five canonical categories — Diminuto, Pequeño, Mediano,
 * Grande and Inmenso. "Enorme" (used by some cards and the web bestiary) is an
 * alias of Inmenso: there is intentionally no sixth category, so `enorme` is
 * not a valid id and any future bestiary sync must map it to `inmenso`.
 *
 * The actor flag `arcana.creatureSize` stores one of the variant ids below.
 * Width and height are token footprints in grid units.
 */

export const CREATURE_SIZE_IDS = [
	'diminuto',
	'pequeno',
	'mediano',
	'grande',
	'inmenso',
	'inmenso-4',
	'inmenso-5',
] as const;

export type CreatureSizeId = (typeof CREATURE_SIZE_IDS)[number];

export const CREATURE_SIZE_CATEGORY_IDS = [
	'diminuto',
	'pequeno',
	'mediano',
	'grande',
	'inmenso',
] as const;

export type CreatureSizeCategoryId = (typeof CREATURE_SIZE_CATEGORY_IDS)[number];

export interface CreatureSize {
	id: CreatureSizeId;
	label: string;
	width: number;
	height: number;
}

export interface CreatureSizeCategory {
	id: CreatureSizeCategoryId;
	label: string;
}

/** Viable size variants, in ascending footprint order. */
export const CREATURE_SIZES: readonly CreatureSize[] = [
	{ id: 'diminuto', label: 'Diminuto', width: 0.5, height: 0.5 },
	{ id: 'pequeno', label: 'Pequeño', width: 1, height: 1 },
	{ id: 'mediano', label: 'Mediano', width: 1, height: 1 },
	{ id: 'grande', label: 'Grande', width: 2, height: 2 },
	{ id: 'inmenso', label: 'Inmenso 3×3 (estándar)', width: 3, height: 3 },
	{ id: 'inmenso-4', label: 'Inmenso 4×4 (mayor)', width: 4, height: 4 },
	{ id: 'inmenso-5', label: 'Inmenso 5×5 (colosal)', width: 5, height: 5 },
];

export const CREATURE_SIZE_CATEGORIES: readonly CreatureSizeCategory[] = [
	{ id: 'diminuto', label: 'Diminuto' },
	{ id: 'pequeno', label: 'Pequeño' },
	{ id: 'mediano', label: 'Mediano' },
	{ id: 'grande', label: 'Grande' },
	{ id: 'inmenso', label: 'Inmenso' },
];

const CATEGORY_BY_SIZE_ID: Record<CreatureSizeId, CreatureSizeCategoryId> = {
	diminuto: 'diminuto',
	pequeno: 'pequeno',
	mediano: 'mediano',
	grande: 'grande',
	inmenso: 'inmenso',
	'inmenso-4': 'inmenso',
	'inmenso-5': 'inmenso',
};

const CREATURE_SIZE_BY_ID = Object.fromEntries(
	CREATURE_SIZES.map((size) => [size.id, size]),
) as Record<CreatureSizeId, CreatureSize>;

/** Variants of the largest category: 3×3 (standard), 4×4 (major) and 5×5 (colossal). */
export const LARGE_SIZE_VARIANTS: readonly CreatureSize[] = CREATURE_SIZES.filter(
	(size) => CATEGORY_BY_SIZE_ID[size.id] === 'inmenso',
);

export function isCreatureSizeId(value: unknown): value is CreatureSizeId {
	return typeof value === 'string' && Object.hasOwn(CREATURE_SIZE_BY_ID, value);
}

export function resolveCreatureSize(value: unknown): CreatureSize | null {
	return isCreatureSizeId(value) ? CREATURE_SIZE_BY_ID[value] : null;
}

export function getCreatureSizeCategoryId(id: CreatureSizeId): CreatureSizeCategoryId {
	return CATEGORY_BY_SIZE_ID[id];
}

/**
 * Combine a category with a footprint of the largest category into a stored id.
 * Only `inmenso` has variants; any other category ignores the footprint, and an
 * unknown footprint falls back to the standard 3×3 largest size.
 */
export function buildCreatureSizeId(
	category: CreatureSizeCategoryId,
	largeFootprint?: number,
): CreatureSizeId {
	if (category !== 'inmenso') return category;
	return LARGE_SIZE_VARIANTS.find((size) => size.width === largeFootprint)?.id ?? 'inmenso';
}

/**
 * Infer a size from token dimensions when exactly one variant matches. A 1×1
 * token matches both Pequeño and Mediano, so ambiguous dimensions return null.
 */
export function inferCreatureSize(width: unknown, height: unknown): CreatureSize | null {
	if (typeof width !== 'number' || typeof height !== 'number') return null;
	const matches = CREATURE_SIZES.filter((size) => size.width === width && size.height === height);
	return matches.length === 1 ? matches[0] : null;
}
