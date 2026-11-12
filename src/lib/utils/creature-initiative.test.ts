import type { Creature } from '$lib/types/creature';
import { describe, expect, it } from 'vitest';
import { calculateCreatureInitiative } from './creature-initiative';
import {
	serializeStatblockAsMD,
	serializeStatblocksAsMDTable,
} from './serializers/statblock-serializer';

const creature = {
	attributes: { body: 1, reflexes: 4, mind: 2, instinct: 3, presence: 1 },
} as Pick<Creature, 'attributes'>;

describe('calculateCreatureInitiative', () => {
	it('returns the creature Reflexes score', () => {
		expect(calculateCreatureInitiative(creature)).toBe(4);
	});

	it('serializes initiative while keeping the Reflexes attribute raw', () => {
		const statblock = {
			id: 'creature',
			name: 'Creature',
			lineage: 'Beast',
			tier: 1,
			size: 'Small',
			attributes: { body: 1, reflexes: 4, mind: 2, instinct: 3, presence: 1 },
			stats: {
				maxHealth: 5,
				evasion: { value: 1, note: null },
				physicalMitigation: { value: 0, note: null },
				magicalMitigation: { value: 0, note: null },
				speed: { value: 5, note: null },
			},
			languages: [],
			attacks: [],
			traits: [],
			actions: [],
			reactions: [],
			interactions: [],
			behavior: null,
			img: null,
		} as unknown as import('$lib/types/creature').Creature;

		expect(serializeStatblockAsMD(statblock)).toContain('- **Reflejos:** 4');
		expect(serializeStatblockAsMD(statblock)).toContain('- **Iniciativa:** 4');
		expect(serializeStatblocksAsMDTable([statblock])).toContain(
			'| Creature | Beast | 1 | Small | 1 | 4 | 2 | 3 | 1 | 5 | 1 | 0 | 0 | 5 | 4 |',
		);
	});
});
