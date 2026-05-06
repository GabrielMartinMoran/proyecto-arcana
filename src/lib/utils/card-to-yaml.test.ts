import { describe, expect, it } from 'vitest';
import { cardToYaml } from './card-to-yaml';
import type { AbilityCard } from '$lib/types/cards/ability-card';
import type { ItemCard } from '$lib/types/cards/item-card';

describe('cardToYaml', () => {
	it('serializes ability card excluding runtime fields', () => {
		const card: AbilityCard = {
			id: 'custom-abc',
			name: 'Fire Bolt',
			level: 2,
			tags: ['arcanista'],
			requirements: 'Mente 2',
			description: 'A bolt of fire',
			uses: { qty: 3, type: 'RELOAD' },
			type: 'activable',
			cardType: 'ability',
			img: 'some-img.png',
		};

		const yaml = cardToYaml(card);

		expect(yaml).toContain('name: Fire Bolt');
		expect(yaml).toContain('level: 2');
		expect(yaml).toContain('tags:');
		expect(yaml).toContain('- arcanista');
		expect(yaml).toContain('requirements: Mente 2');
		expect(yaml).toContain('description: A bolt of fire');
		expect(yaml).toContain('type: activable');
		expect(yaml).toContain('uses:');
		expect(yaml).toContain('qty: 3');
		expect(yaml).toContain('type: RELOAD');
		expect(yaml).not.toContain('id:');
		expect(yaml).not.toContain('img:');
		expect(yaml).not.toContain('cardType:');
	});

	it('serializes item card including cost', () => {
		const card: ItemCard = {
			id: 'custom-def',
			name: 'Magic Sword',
			level: 1,
			tags: ['weapon'],
			requirements: null,
			description: 'A magic sword',
			uses: { qty: 5, type: 'USES' },
			type: 'activable',
			cardType: 'item',
			img: 'item-img.png',
			cost: '100',
		};

		const yaml = cardToYaml(card);

		expect(yaml).toContain('name: Magic Sword');
		expect(yaml).toContain("cost: '100'");
		expect(yaml).not.toContain('id:');
		expect(yaml).not.toContain('img:');
		expect(yaml).not.toContain('cardType:');
	});

	it('handles empty tags', () => {
		const card: AbilityCard = {
			id: 'custom-ghi',
			name: 'Simple Skill',
			level: 0,
			tags: [],
			requirements: null,
			description: '',
			uses: { qty: 1, type: 'USES' },
			type: 'efecto',
			cardType: 'ability',
			img: '',
		};

		const yaml = cardToYaml(card);
		expect(yaml).toContain('tags: []');
	});
});
