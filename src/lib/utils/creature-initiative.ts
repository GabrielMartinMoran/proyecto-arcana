import type { Creature } from '$lib/types/creature';

export const calculateCreatureInitiative = (creature: Pick<Creature, 'attributes'>): number =>
	creature.attributes.reflexes;
