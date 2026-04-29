import { dump } from 'js-yaml';
import type { Creature } from '$lib/types/creature';

export function creatureToYaml(creature: Creature): string {
	const { id: _id, ...creatureWithoutId } = creature;
	return dump(creatureWithoutId, { indent: 2, lineWidth: 100 });
}
