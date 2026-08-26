import { loadBestiaryCreatures } from '../bestiary-source-loader';
import { serializeStatblocksAsMDTable } from '../serializers/statblock-serializer';

export const loadBestiaryAsMD = async () => {
	const creatures = await loadBestiaryCreatures();

	return serializeStatblocksAsMDTable(creatures);
};
