/**
 * Mapping guard for the real cards corpus.
 *
 * Loads every YAML registered in CARD_SOURCE_FILES plus the magical items file,
 * maps them with the same mappers the app uses, and fails with file + card +
 * field details when a value the renderers interpolate would be undefined or
 * NaN. This is the safety net that catches card source keys or types drifting
 * from the card schemas before they reach the Markdown/prompt renderers.
 */

import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { load as parseYaml } from 'js-yaml';
import { describe, expect, it } from 'vitest';

import { CARD_SOURCE_FILES } from '$lib/generated/card-source-files';
import { getCardTotalUses } from '$lib/utils/card-utils';
import { isFormulaValid, type FormulaContext } from '$lib/utils/modifiers-calculator';
import { serializeCardsAsMDTable } from '$lib/utils/serializers/card-serializer';
import type { AbilityCard } from '$lib/types/cards/ability-card';
import type { ItemCard } from '$lib/types/cards/item-card';
import type { Uses } from '$lib/types/uses';
import { mapAbilityCard, mapItemCard } from './card-mapper';

const STATIC_ROOT = path.join(process.cwd(), 'static');
const MAGICAL_ITEMS_SOURCE = '/docs/magical-items.yml';
const LINAJE_SOURCE = '/docs/cards/linaje.yml';
const SINERGIA_SOURCE = '/docs/cards/sinergia.yml';
const MAGO_SOURCE = '/docs/cards/mago.yml';
const BRUJO_SOURCE = '/docs/cards/brujo.yml';
const PICARO_SOURCE = '/docs/cards/picaro.yml';

const VALID_ABILITY_TYPES = ['efecto', 'activable'];
const VALID_ITEM_TYPES = ['efecto', 'activable', 'consumible'];
const VALID_USES_TYPES = ['RELOAD', 'USES', 'LONG_REST', 'DAY'];

const SAMPLE_FORMULA_CONTEXT: FormulaContext = {
	cuerpo: 3,
	reflejos: 5,
	mente: 3,
	instinto: 3,
	presencia: 4,
	ppGastados: 0,
};

const sourceFileFor = (assetPath: string): string =>
	path.join(STATIC_ROOT, assetPath.replace(/^\//, ''));

const readRawCards = async (assetPath: string, rootKey: string): Promise<unknown[]> => {
	const content = await readFile(sourceFileFor(assetPath), 'utf8');
	const parsed = parseYaml(content) as Record<string, unknown[] | undefined>;
	return parsed[rootKey] ?? [];
};

const loadCardFromSource = async (assetPath: string, name: string): Promise<AbilityCard> => {
	const rawCard = (await readRawCards(assetPath, 'cards')).find(
		(card) => (card as { name?: unknown }).name === name,
	);
	if (rawCard === undefined) throw new Error(`Card "${name}" is missing from ${assetPath}`);

	return mapAbilityCard(rawCard);
};

const loadLinajeCard = (name: string): Promise<AbilityCard> =>
	loadCardFromSource(LINAJE_SOURCE, name);

const loadSinergiaCard = (name: string): Promise<AbilityCard> =>
	loadCardFromSource(SINERGIA_SOURCE, name);

const loadItemFromSource = async (name: string): Promise<ItemCard> => {
	const rawItem = (await readRawCards(MAGICAL_ITEMS_SOURCE, 'items')).find(
		(item) => (item as { name?: unknown }).name === name,
	);
	if (rawItem === undefined)
		throw new Error(`Item "${name}" is missing from ${MAGICAL_ITEMS_SOURCE}`);

	return mapItemCard(rawItem);
};

const requireDefined = (issues: string[], label: string, field: string, value: unknown): void => {
	const isMissing =
		value === undefined ||
		value === null ||
		(typeof value === 'number' && !Number.isFinite(value)) ||
		(typeof value === 'string' && value.trim() === '');
	if (isMissing) issues.push(`${label}: ${field} is ${String(value)}`);
};

interface UsesGuardOptions {
	requireNumericQty: boolean;
}

const collectUsesIssues = (
	issues: string[],
	label: string,
	uses: unknown,
	{ requireNumericQty }: UsesGuardOptions,
): void => {
	if (uses === undefined || uses === null) return;
	if (typeof uses !== 'object') {
		issues.push(`${label}: uses is ${String(uses)}`);
		return;
	}

	const { type, qty, formula } = uses as { type?: unknown; qty?: unknown; formula?: unknown };

	if (type !== null && type !== undefined && !VALID_USES_TYPES.includes(String(type))) {
		issues.push(`${label}: uses.type "${String(type)}" is not a valid uses type`);
	}
	if (requireNumericQty) {
		if (qty !== undefined && qty !== null && typeof qty !== 'number') {
			issues.push(`${label}: uses.qty is not a number`);
		}
	} else {
		requireDefined(issues, label, 'uses.qty', qty);
	}
	if (formula === undefined) return;
	if (typeof formula !== 'string' || formula.trim() === '') {
		issues.push(`${label}: uses.formula must be a non-empty string`);
		return;
	}
	if (!isFormulaValid(formula, SAMPLE_FORMULA_CONTEXT)) {
		issues.push(`${label}: uses.formula "${formula}" does not evaluate to a finite number`);
	}
};

const collectCommonIssues = (
	issues: string[],
	label: string,
	card: Record<string, unknown>,
	options: UsesGuardOptions,
) => {
	requireDefined(issues, label, 'name', card.name);
	requireDefined(issues, label, 'level', card.level);
	requireDefined(issues, label, 'type', card.type);
	requireDefined(issues, label, 'description', card.description);
	if (!Array.isArray(card.tags)) issues.push(`${label}: tags is not an array`);

	collectUsesIssues(issues, label, card.uses, options);
};

const collectAbilityIssues = (card: AbilityCard, label: string): string[] => {
	const issues: string[] = [];
	collectCommonIssues(issues, label, card as unknown as Record<string, unknown>, {
		requireNumericQty: true,
	});
	if (!VALID_ABILITY_TYPES.includes(card.type)) {
		issues.push(
			`${label}: ability type "${card.type}" is not one of ${VALID_ABILITY_TYPES.join(', ')}`,
		);
	}
	return issues;
};

const collectItemIssues = (card: ItemCard, label: string): string[] => {
	const issues: string[] = [];
	collectCommonIssues(issues, label, card as unknown as Record<string, unknown>, {
		requireNumericQty: true,
	});
	if (!VALID_ITEM_TYPES.includes(card.type)) {
		issues.push(`${label}: item type "${card.type}" is not one of ${VALID_ITEM_TYPES.join(', ')}`);
	}
	requireDefined(issues, label, 'cost', card.cost);
	return issues;
};

describe('cards corpus mapping guard', () => {
	it('maps every ability card source without undefined values the renderers interpolate', async () => {
		const issues: string[] = [];

		for (const sourcePath of CARD_SOURCE_FILES) {
			for (const rawCard of await readRawCards(sourcePath, 'cards')) {
				try {
					const card = mapAbilityCard(rawCard);
					issues.push(...collectAbilityIssues(card, `${sourcePath} (${card.name})`));
				} catch (error) {
					issues.push(`${sourcePath}: mapping threw ${String(error)}`);
				}
			}
		}

		expect(issues, issues.join('\n')).toEqual([]);
	});

	it('maps the magical items source without undefined values the renderers interpolate', async () => {
		const issues: string[] = [];

		for (const rawCard of await readRawCards(MAGICAL_ITEMS_SOURCE, 'items')) {
			try {
				const card = mapItemCard(rawCard);
				issues.push(...collectItemIssues(card, `${MAGICAL_ITEMS_SOURCE} (${card.name})`));
			} catch (error) {
				issues.push(`${MAGICAL_ITEMS_SOURCE}: mapping threw ${String(error)}`);
			}
		}

		expect(issues, issues.join('\n')).toEqual([]);
	});

	it('serializes the whole cards corpus as markdown without undefined or NaN', async () => {
		const abilityCards = (
			await Promise.all(
				CARD_SOURCE_FILES.map(async (sourcePath) =>
					(await readRawCards(sourcePath, 'cards')).map((rawCard) => mapAbilityCard(rawCard)),
				),
			)
		).flat();
		const itemCards = (await readRawCards(MAGICAL_ITEMS_SOURCE, 'items')).map((rawCard) =>
			mapItemCard(rawCard),
		);

		expect(serializeCardsAsMDTable(abilityCards)).not.toMatch(/undefined|NaN/);
		expect(serializeCardsAsMDTable(itemCards)).not.toMatch(/undefined|NaN/);
	});
});

describe('card uses formulas in the linaje corpus', () => {
	it('declares Reprensión Infernal uses from Presencia and resolves them', async () => {
		const card = await loadLinajeCard('Reprensión Infernal');

		expect(card.uses.type).toBe('LONG_REST');
		expect(card.uses.formula).toBe('presencia');
		expect(getCardTotalUses(card, { ...SAMPLE_FORMULA_CONTEXT, presencia: 4 })).toBe(4);
	});

	it('declares Movilidad Elemental uses formula and resolves it across Reflejos values', async () => {
		const card = await loadLinajeCard('Movilidad Elemental');

		expect(card.uses.type).toBe('LONG_REST');
		expect(card.uses.formula).toBe('max(1, floor(reflejos/2))');

		const totals = [8, 4, 1].map((reflejos) =>
			getCardTotalUses(card, { ...SAMPLE_FORMULA_CONTEXT, reflejos }),
		);
		expect(totals).toEqual([4, 2, 1]);
	});
});

interface UsesBatchExpectation {
	name: string;
	formula?: string;
	qty?: number;
	total: number;
}

const LINAJE_USES_BATCH: UsesBatchExpectation[] = [
	{ name: 'Enfoque Adaptable', qty: 2, total: 2 },
	{ name: 'Mirada Estelar', formula: 'mente', total: SAMPLE_FORMULA_CONTEXT.mente },
	{ name: 'Sangre Resistente', qty: 1, total: 1 },
	{ name: 'Eco de la Roca', formula: 'instinto', total: SAMPLE_FORMULA_CONTEXT.instinto },
	{ name: 'Parpadeo Ilusorio', formula: 'mente', total: SAMPLE_FORMULA_CONTEXT.mente },
	{ name: 'Pacto Oscuro', qty: 1, total: 1 },
	{ name: 'Castigo Elemental', formula: 'cuerpo', total: SAMPLE_FORMULA_CONTEXT.cuerpo },
	{ name: 'Adaptación Elemental', formula: 'max(1, floor(cuerpo/2))', total: 1 },
	{ name: 'Mente Psiónica', formula: 'max(1, floor(mente/2))', total: 1 },
	{ name: 'Anatomía Migratoria', qty: 1, total: 1 },
];

describe('card uses batch approved for linaje and sinergia', () => {
	it.each(LINAJE_USES_BATCH)(
		'declares and resolves the uses for $name',
		async ({ name, formula, qty, total }) => {
			const card = await loadLinajeCard(name);

			expect(card.uses.type).toBe('LONG_REST');
			expect(card.uses.formula).toBe(formula);
			expect(card.uses.qty).toBe(qty ?? 0);
			expect(getCardTotalUses(card, SAMPLE_FORMULA_CONTEXT)).toBe(total);
		},
	);

	it('declares Voluntad Indomable uses from half Instinto and resolves them', async () => {
		const card = await loadSinergiaCard('Voluntad Indomable');

		expect(card.uses.type).toBe('LONG_REST');
		expect(card.uses.formula).toBe('floor(instinto/2)');
		expect(getCardTotalUses(card, SAMPLE_FORMULA_CONTEXT)).toBe(1);
	});

	it('resolves Voluntad Indomable to 0 uses with Instinto 1 (approved strict reading, no minimum 1)', async () => {
		const card = await loadSinergiaCard('Voluntad Indomable');

		expect(getCardTotalUses(card, { ...SAMPLE_FORMULA_CONTEXT, instinto: 1 })).toBe(0);
	});
});

interface FixedUsesExpectation {
	name: string;
	source: string;
	type: Uses['type'];
	qty: number;
	total: number;
}

const FIXED_ABILITY_USES_BATCH: FixedUsesExpectation[] = [
	{
		name: 'Grimorio de Preparación',
		source: MAGO_SOURCE,
		type: 'LONG_REST',
		qty: 1,
		total: 1,
	},
	{
		name: 'Visiones del Patrón',
		source: BRUJO_SOURCE,
		type: 'LONG_REST',
		qty: 1,
		total: 1,
	},
	{
		name: 'Señor de los Bajos Fondos',
		source: PICARO_SOURCE,
		type: 'USES',
		qty: 1,
		total: 1,
	},
];

describe('card uses fixed limits approved for archetype cards', () => {
	it.each(FIXED_ABILITY_USES_BATCH)(
		'declares $type uses of $qty for $name',
		async ({ name, source, type, qty, total }) => {
			const card = await loadCardFromSource(source, name);

			expect(card.uses).toEqual({ type, qty });
			expect(getCardTotalUses(card, SAMPLE_FORMULA_CONTEXT)).toBe(total);
		},
	);
});

describe('card uses fixed limits approved for magical items', () => {
	it('declares DAY uses of 3 for Gemas del Eco Mental', async () => {
		const card = await loadItemFromSource('Gemas del Eco Mental');

		expect(card.uses).toEqual({ type: 'DAY', qty: 3 });
		expect(card.cardType).toBe('item');
		expect(getCardTotalUses(card, SAMPLE_FORMULA_CONTEXT)).toBe(3);
	});

	it('normalizes Pipa del Cuentacuentos to a numeric zero quantity and unlimited uses', async () => {
		const card = await loadItemFromSource('Pipa del Cuentacuentos');

		expect(card.uses.type).toBeNull();
		expect(card.uses.qty).toBe(0);
		expect(getCardTotalUses(card, SAMPLE_FORMULA_CONTEXT)).toBeNull();
	});
});
