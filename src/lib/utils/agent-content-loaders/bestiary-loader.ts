import { mapCreature } from '$lib/mappers/creature-mapper';
import { load as yamlLoad } from 'js-yaml';
import { serializeStatblocksAsMDTable } from '../serializers/statblock-serializer';
import { loadAgentFile } from './agent-content-loader';

const BESTIARY_FILE_PATH = '/docs/bestiary.yml';

export const loadBestiaryAsMD = async () => {
	const fileContent = await loadAgentFile(BESTIARY_FILE_PATH);
	let rawCreatures = [];
	try {
		rawCreatures = (yamlLoad(fileContent) as any).creatures ?? [];
	} catch (e) {
		console.error('Error parsing YAML:', e);
	}

	const creatures = rawCreatures.map((x) => mapCreature(x));

	return serializeStatblocksAsMDTable(creatures);
};
