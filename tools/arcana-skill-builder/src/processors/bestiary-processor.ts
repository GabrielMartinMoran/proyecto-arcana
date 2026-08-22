import type { Creature } from '../types/creature.js';
import { HeadingIds } from '../utils/anchors.js';

export interface TierGroup {
	tier: number;
	creatures: Creature[];
	filename: string;
}

/** H1 rendered by bestiary-builder at the top of each tier file. */
export const tierGroupTitle = (group: TierGroup): string => `Bestiario — Rango ${group.tier}`;

/**
 * Deterministic per-creature anchors inside a tier file, mirroring the
 * rendered document order: the group H1 first, then each creature H1.
 * Duplicate creature names get the app's "-1", "-2", ... suffixes.
 */
export const deriveCreatureAnchors = (group: TierGroup): ReadonlyMap<string, string> => {
	const ids = new HeadingIds();
	ids.anchor(tierGroupTitle(group));
	const anchors = new Map<string, string>();
	for (const creature of group.creatures) {
		anchors.set(creature.id, ids.anchor(creature.name));
	}
	return anchors;
};

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
