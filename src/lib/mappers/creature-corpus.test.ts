/**
 * Mapping guard for the real bestiary corpus.
 *
 * Loads every YAML registered in BESTIARY_SOURCE_FILES, maps it with the same
 * mapper the app uses, and fails with file + creature + field details when a
 * value the renderers interpolate would be undefined or NaN. This is the safety
 * net that catches source keys drifting from the Creature schema (like the
 * `attack` vs `bonus` key that rendered "+undefined" in the Markdown statblock).
 */

import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { load as parseYaml } from 'js-yaml';
import { describe, expect, it } from 'vitest';

import { BESTIARY_SOURCE_FILES } from '$lib/generated/bestiary-source-files';
import { serializeStatblocksAsMDTable } from '$lib/utils/serializers/statblock-serializer';
import type { Creature } from '$lib/types/creature';
import { mapCreature } from './creature-mapper';

const STATIC_ROOT = path.join(process.cwd(), 'static');

const sourceFileFor = (assetPath: string): string =>
	path.join(STATIC_ROOT, assetPath.replace(/^\//, ''));

const readRawCreature = async (assetPath: string): Promise<unknown> => {
	const content = await readFile(sourceFileFor(assetPath), 'utf8');
	const parsed = parseYaml(content) as { creatures?: unknown[] };
	return parsed.creatures?.[0];
};

const requireDefined = (issues: string[], label: string, field: string, value: unknown): void => {
	const isMissing =
		value === undefined ||
		value === null ||
		(typeof value === 'number' && !Number.isFinite(value)) ||
		(typeof value === 'string' && value.trim() === '');
	if (isMissing) issues.push(`${label}: ${field} is ${String(value)}`);
};

const collectCreatureIssues = (creature: Creature, sourcePath: string): string[] => {
	const issues: string[] = [];
	const label = `${sourcePath} (${creature.name})`;

	requireDefined(issues, label, 'name', creature.name);
	requireDefined(issues, label, 'lineage', creature.lineage);
	requireDefined(issues, label, 'tier', creature.tier);
	requireDefined(issues, label, 'size', creature.size);
	if (!Array.isArray(creature.languages)) issues.push(`${label}: languages is not an array`);

	for (const attribute of ['body', 'reflexes', 'mind', 'instinct', 'presence'] as const) {
		requireDefined(issues, label, `attributes.${attribute}`, creature.attributes[attribute]);
	}

	for (const stat of ['evasion', 'physicalMitigation', 'magicalMitigation', 'speed'] as const) {
		requireDefined(issues, label, `stats.${stat}.value`, creature.stats[stat].value);
	}

	creature.attacks.forEach((attack, index) => {
		const attackLabel = `${label} attacks[${index}] "${attack.name}"`;
		requireDefined(issues, attackLabel, 'name', attack.name);
		requireDefined(issues, attackLabel, 'bonus', attack.bonus);
		requireDefined(issues, attackLabel, 'damage', attack.damage);
	});

	for (const section of ['traits', 'actions', 'reactions', 'interactions'] as const) {
		creature[section].forEach((entry, index) => {
			const entryLabel = `${label} ${section}[${index}] "${entry.name}"`;
			requireDefined(issues, entryLabel, 'name', entry.name);
			requireDefined(issues, entryLabel, 'detail', entry.detail);
		});
	}

	return issues;
};

describe('bestiary corpus mapping guard', () => {
	it('maps every source without undefined values the renderers interpolate', async () => {
		const issues: string[] = [];

		for (const sourcePath of BESTIARY_SOURCE_FILES) {
			let creature: Creature;
			try {
				creature = mapCreature(await readRawCreature(sourcePath));
			} catch (error) {
				issues.push(`${sourcePath}: mapping threw ${String(error)}`);
				continue;
			}
			issues.push(...collectCreatureIssues(creature, sourcePath));
		}

		expect(issues, issues.join('\n')).toEqual([]);
	});

	it('serializes the whole corpus as markdown without undefined or NaN', async () => {
		const creatures = await Promise.all(
			BESTIARY_SOURCE_FILES.map(async (sourcePath) =>
				mapCreature(await readRawCreature(sourcePath)),
			),
		);

		const markdown = serializeStatblocksAsMDTable(creatures);

		expect(markdown).not.toMatch(/undefined|NaN/);
	});
});
