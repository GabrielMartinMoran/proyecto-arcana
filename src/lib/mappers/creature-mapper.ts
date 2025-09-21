import type { Creature } from '$lib/types/creature';
import { generateId } from '$lib/utils/id-generator';

export const mapCreature = (data: any): Creature => {
	if (!data.name) throw new Error('Creature name is required');
	return {
		id: generateId(data.name),
		...data,
	};
};
