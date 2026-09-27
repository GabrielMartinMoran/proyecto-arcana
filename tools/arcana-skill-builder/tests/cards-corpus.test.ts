/**
 * Mapping guard for the real cards corpus (builder side).
 *
 * Loads the canonical cards sources the skill builder consumes — the modular
 * ability cards under `static/docs/cards/` and `magical-items.yml` — maps them
 * with the builder mappers, and fails with card + field details when a value
 * the serializers interpolate would be undefined or NaN. This is the safety net
 * that catches card source keys or types drifting from the card schemas.
 */

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { describe, test } from 'node:test';
import { load as yamlLoad } from 'js-yaml';

import { CONFIG } from '../src/config.js';
import { loadAbilityCards } from '../src/loaders/cards-loader.js';
import { mapItemCard } from '../src/mappers/card-mapper.js';
import type { AbilityCard, ItemCard } from '../src/types/card.js';

const VALID_ABILITY_TYPES = ['efecto', 'activable'];
const VALID_ITEM_TYPES = ['efecto', 'activable', 'consumible'];
const VALID_USES_TYPES = ['RELOAD', 'USES', 'LONG_REST', 'DAY'];

const requireDefined = (issues: string[], label: string, field: string, value: unknown): void => {
	const isMissing =
		value === undefined ||
		value === null ||
		(typeof value === 'number' && !Number.isFinite(value)) ||
		(typeof value === 'string' && value.trim() === '');
	if (isMissing) issues.push(`${label}: ${field} is ${String(value)}`);
};

const collectCommonIssues = (
	issues: string[],
	label: string,
	card: AbilityCard | ItemCard,
): void => {
	requireDefined(issues, label, 'name', card.name);
	requireDefined(issues, label, 'level', card.level);
	requireDefined(issues, label, 'type', card.type);
	requireDefined(issues, label, 'description', card.description);
	if (!Array.isArray(card.tags)) issues.push(`${label}: tags is not an array`);

	if (card.uses === undefined || card.uses === null || typeof card.uses !== 'object') {
		issues.push(`${label}: uses is ${String(card.uses)}`);
		return;
	}
	if (card.uses.type === null || card.uses.type === undefined) return;
	if (!VALID_USES_TYPES.includes(String(card.uses.type))) {
		issues.push(`${label}: uses.type "${String(card.uses.type)}" is not a valid uses type`);
	}
	requireDefined(issues, label, 'uses.qty', card.uses.qty);
};

const readMagicalItems = (): { label: string; card: ItemCard }[] => {
	const sourcePath = path.join(CONFIG.DOCS_PATH, CONFIG.MAGICAL_ITEMS_FILE);
	const parsed = yamlLoad(fs.readFileSync(sourcePath, 'utf-8')) as { items?: unknown[] };
	return (parsed.items ?? [])
		.map((entry) => mapItemCard(entry))
		.map((card) => ({
			label: `${CONFIG.MAGICAL_ITEMS_FILE} (${card.name})`,
			card,
		}));
};

describe('cards corpus mapping guard (builder)', () => {
	test('maps the whole ability cards corpus without undefined values', () => {
		const issues: string[] = [];

		for (const card of loadAbilityCards()) {
			const label = `cards.yml (${card.name})`;
			collectCommonIssues(issues, label, card);
			if (!VALID_ABILITY_TYPES.includes(card.type)) {
				issues.push(
					`${label}: ability type "${card.type}" is not one of ${VALID_ABILITY_TYPES.join(', ')}`,
				);
			}
		}

		assert.deepEqual(issues, [], issues.join('\n'));
	});

	test('maps the whole magical items corpus without undefined values', () => {
		const issues: string[] = [];

		for (const { label, card } of readMagicalItems()) {
			collectCommonIssues(issues, label, card);
			if (!VALID_ITEM_TYPES.includes(card.type)) {
				issues.push(
					`${label}: item type "${card.type}" is not one of ${VALID_ITEM_TYPES.join(', ')}`,
				);
			}
			requireDefined(issues, label, 'cost', card.cost);
		}

		assert.deepEqual(issues, [], issues.join('\n'));
	});

	test('every mapped item keeps a renderable cost value', () => {
		for (const { card } of readMagicalItems()) {
			const cost: unknown = card.cost;
			const isRenderable =
				(typeof cost === 'number' && Number.isFinite(cost)) ||
				(typeof cost === 'string' && cost.trim() !== '');
			assert.ok(
				isRenderable,
				`${card.name} cost must be a finite number or a non-empty string, got ${String(cost)}`,
			);
		}
	});
});
