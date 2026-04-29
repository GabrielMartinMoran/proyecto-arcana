import { describe, it, expect } from 'vitest';
import { load } from 'js-yaml';
import { creatureToYaml } from '$lib/utils/creature-to-yaml';
import type { Creature } from '$lib/types/creature';

function createTestCreature(): Creature {
	return {
		id: 'test-id-123',
		name: 'Goblin',
		lineage: 'Goblinoid',
		tier: 1,
		size: 'small',
		attributes: {
			body: 2,
			reflexes: 3,
			mind: 1,
			instinct: 3,
			presence: 1,
		},
		stats: {
			maxHealth: 10,
			evasion: { value: 12, note: null },
			physicalMitigation: { value: 1, note: null },
			magicalMitigation: { value: 0, note: null },
			speed: { value: 6, note: null },
		},
		languages: ['Common', 'Goblin'],
		attacks: [
			{
				name: 'Scimitar',
				bonus: 4,
				damage: '1d6+2',
				note: null,
			},
		],
		traits: [
			{
				name: 'Nimble Escape',
				detail: 'Can disengage as a bonus action.',
			},
		],
		actions: [
			{
				name: 'Attack',
				detail: 'Makes a scimitar attack.',
				uses: null,
			},
		],
		reactions: [],
		interactions: [],
		behavior: 'Cowardly and opportunistic.',
		img: null,
	};
}

describe('creatureToYaml', () => {
	it('excludes id from the generated YAML', () => {
		const creature = createTestCreature();
		const yaml = creatureToYaml(creature);

		expect(yaml).not.toContain('id:');
	});

	it('includes all other fields in the generated YAML', () => {
		const creature = createTestCreature();
		const yaml = creatureToYaml(creature);

		expect(yaml).toContain('name: Goblin');
		expect(yaml).toContain('lineage: Goblinoid');
		expect(yaml).toContain('tier: 1');
		expect(yaml).toContain('size: small');
		expect(yaml).toContain('behavior: Cowardly and opportunistic.');
		expect(yaml).toContain('languages:');
		expect(yaml).toContain('- Common');
		expect(yaml).toContain('- Goblin');
		expect(yaml).toContain('attacks:');
		expect(yaml).toContain('traits:');
		expect(yaml).toContain('actions:');
		expect(yaml).toContain('reactions: []');
		expect(yaml).toContain('interactions: []');
	});

	it('produces valid YAML that round-trips without id', () => {
		const creature = createTestCreature();
		const yaml = creatureToYaml(creature);
		const parsed = load(yaml) as Record<string, unknown>;

		expect(parsed).not.toHaveProperty('id');
		expect(parsed).toHaveProperty('name', 'Goblin');
		expect(parsed).toHaveProperty('tier', 1);
	});
});
