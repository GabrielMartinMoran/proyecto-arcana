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
import { serializeCardsAsMDTable } from '$lib/utils/serializers/card-serializer';
import type { AbilityCard } from '$lib/types/cards/ability-card';
import type { ItemCard } from '$lib/types/cards/item-card';
import { mapAbilityCard, mapItemCard } from './card-mapper';

const STATIC_ROOT = path.join(process.cwd(), 'static');
const MAGICAL_ITEMS_SOURCE = '/docs/magical-items.yml';

const VALID_ABILITY_TYPES = ['efecto', 'activable'];
const VALID_ITEM_TYPES = ['efecto', 'activable', 'consumible'];
const VALID_USES_TYPES = ['RELOAD', 'USES', 'LONG_REST', 'DAY'];

const sourceFileFor = (assetPath: string): string =>
	path.join(STATIC_ROOT, assetPath.replace(/^\//, ''));

const readRawCards = async (assetPath: string, rootKey: string): Promise<unknown[]> => {
	const content = await readFile(sourceFileFor(assetPath), 'utf8');
	const parsed = parseYaml(content) as Record<string, unknown[] | undefined>;
	return parsed[rootKey] ?? [];
};

const requireDefined = (issues: string[], label: string, field: string, value: unknown): void => {
	const isMissing =
		value === undefined ||
		value === null ||
		(typeof value === 'number' && !Number.isFinite(value)) ||
		(typeof value === 'string' && value.trim() === '');
	if (isMissing) issues.push(`${label}: ${field} is ${String(value)}`);
};

const collectCommonIssues = (issues: string[], label: string, card: Record<string, unknown>) => {
	requireDefined(issues, label, 'name', card.name);
	requireDefined(issues, label, 'level', card.level);
	requireDefined(issues, label, 'type', card.type);
	requireDefined(issues, label, 'description', card.description);
	if (!Array.isArray(card.tags)) issues.push(`${label}: tags is not an array`);

	const uses = card.uses as { qty?: unknown; type?: unknown } | undefined;
	if (uses === undefined || uses === null || typeof uses !== 'object') {
		issues.push(`${label}: uses is ${String(uses)}`);
		return;
	}
	if (uses.type === null || uses.type === undefined) return;
	if (!VALID_USES_TYPES.includes(String(uses.type))) {
		issues.push(`${label}: uses.type "${String(uses.type)}" is not a valid uses type`);
	}
	requireDefined(issues, label, 'uses.qty', uses.qty);
};

const collectAbilityIssues = (card: AbilityCard, label: string): string[] => {
	const issues: string[] = [];
	collectCommonIssues(issues, label, card as unknown as Record<string, unknown>);
	if (!VALID_ABILITY_TYPES.includes(card.type)) {
		issues.push(
			`${label}: ability type "${card.type}" is not one of ${VALID_ABILITY_TYPES.join(', ')}`,
		);
	}
	return issues;
};

const collectItemIssues = (card: ItemCard, label: string): string[] => {
	const issues: string[] = [];
	collectCommonIssues(issues, label, card as unknown as Record<string, unknown>);
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
