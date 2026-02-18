import type { Creature } from '../types/creature.js';

export interface TierGroup {
	tier: number;
	creatures: Creature[];
	filename: string;
}

export const groupCreaturesByTier = (creatures: Creature[]): TierGroup[] => {
	const byTier = new Map<number, Creature[]>();
	for (const creature of creatures) {
		if (!byTier.has(creature.tier)) byTier.set(creature.tier, []);
		byTier.get(creature.tier)!.push(creature);
	}
	return [...byTier.entries()]
		.sort((a, b) => a[0] - b[0])
		.map(([tier, creatures]) => ({ tier, creatures, filename: `rango-${tier}.md` }));
};
