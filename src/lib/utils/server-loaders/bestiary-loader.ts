import { mapCreature } from '$lib/mappers/creature-mapper';
import { load as yamlLoad } from 'js-yaml';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { serializeStatblockAsMD } from '../serializers/statblock-serializer';

const BESTIARY_FILE_PATH = join(process.cwd(), 'static', 'docs', 'bestiary.yml');

export const loadBestiaryAsMD = async () => {
	const fileContent = await readFile(BESTIARY_FILE_PATH, 'utf-8');
	let rawCreatures = [];
	try {
		rawCreatures = (yamlLoad(fileContent) as any).creatures ?? [];
	} catch (e) {
		console.error('Error parsing YAML:', e);
	}

	const creatures = rawCreatures.map((x) => mapCreature(x));

	return creatures.map(serializeStatblockAsMD).join('---\n\n');
};
