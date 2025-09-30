import { mapCreature } from '$lib/mappers/creature-mapper';
import type { Creature } from '$lib/types/creature';
import { renderStatblockMarkdown } from '$lib/utils/statblock-md-renderer';
import { load as yamlLoad } from 'js-yaml';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { PageServerLoad } from './$types';

export const prerender = true;
export const ssr = true;

export const load: PageServerLoad = () => {
	const filePath = join(process.cwd(), 'static', 'docs', 'bestiary.yml');
	const fileContent = readFileSync(filePath, 'utf-8');

	let rawCreatures = [];
	try {
		rawCreatures = (yamlLoad(fileContent) as any).creatures ?? [];
	} catch (e) {
		console.error('Error parsing YAML:', e);
	}

	const creatures: Creature[] = rawCreatures.map((x) => mapCreature(x));

	const doc = creatures.map(renderStatblockMarkdown).join('---\n\n');

	return {
		doc,
	};
};
