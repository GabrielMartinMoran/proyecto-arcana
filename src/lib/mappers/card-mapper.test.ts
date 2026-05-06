import { describe, expect, it } from 'vitest';
import { mapCustomAbilityCard, mapCustomItemCard } from './card-mapper';

describe('mapCustomAbilityCard', () => {
	it('maps valid ability YAML data to AbilityCard with generated custom id', () => {
		const data = {
			name: 'Custom Fire Bolt',
			level: 2,
			type: 'activable',
			tags: ['arcanista'],
			requirements: 'Mente 2',
			description: 'A custom bolt of fire',
			uses: { qty: 3, type: 'RELOAD' },
		};

		const card = mapCustomAbilityCard(data);

		expect(card.name).toBe('Custom Fire Bolt');
		expect(card.level).toBe(2);
		expect(card.type).toBe('activable');
		expect(card.tags).toEqual(['arcanista']);
		expect(card.requirements).toBe('Mente 2');
		expect(card.description).toBe('A custom bolt of fire');
		expect(card.uses).toEqual({ qty: 3, type: 'RELOAD' });
		expect(card.cardType).toBe('ability');
		expect(card.id).toMatch(/^custom-/);
		expect(card.img).toBeDefined();
	});

	it('reuses existingId when provided', () => {
		const data = {
			name: 'Custom Fire Bolt',
			level: 1,
			type: 'efecto',
			tags: [],
			requirements: null,
			description: 'Test',
			uses: { qty: 1, type: 'USES' },
		};

		const card = mapCustomAbilityCard(data, 'custom-abc-123');

		expect(card.id).toBe('custom-abc-123');
	});

	it('throws descriptive error when name is missing', () => {
		const data = {
			level: 1,
			type: 'efecto',
			uses: { qty: 1, type: 'USES' },
		};

		expect(() => mapCustomAbilityCard(data)).toThrow(/name is required/i);
	});

	it('throws descriptive error when name is empty string', () => {
		const data = {
			name: '',
			level: 1,
			type: 'efecto',
			uses: { qty: 1, type: 'USES' },
		};

		expect(() => mapCustomAbilityCard(data)).toThrow(/name is required/i);
	});

	it('throws descriptive error when level is missing', () => {
		const data = {
			name: 'Test',
			type: 'efecto',
			uses: { qty: 1, type: 'USES' },
		};

		expect(() => mapCustomAbilityCard(data)).toThrow(/level is required/i);
	});

	it('throws descriptive error when level is negative', () => {
		const data = {
			name: 'Test',
			level: -1,
			type: 'efecto',
			uses: { qty: 1, type: 'USES' },
		};

		expect(() => mapCustomAbilityCard(data)).toThrow(/level must be >= 0/i);
	});

	it('throws descriptive error when type is invalid', () => {
		const data = {
			name: 'Test',
			level: 1,
			type: 'invalid',
			uses: { qty: 1, type: 'USES' },
		};

		expect(() => mapCustomAbilityCard(data)).toThrow(/invalid ability type/i);
	});

	it('maps ability card with uses: null for efecto type', () => {
		const data = {
			name: 'Estudios Mágicos',
			level: 1,
			type: 'efecto',
			tags: ['Mago', 'Arquetipo', 'Arcanista'],
			requirements: 'Mente 2',
			description: 'Has estudiado la magia...',
			uses: null,
		};

		const card = mapCustomAbilityCard(data);

		expect(card.uses).toEqual({ qty: 0, type: null });
	});

	it('throws descriptive error when uses.qty is missing', () => {
		const data = {
			name: 'Test',
			level: 1,
			type: 'efecto',
			uses: { type: 'USES' },
		};

		expect(() => mapCustomAbilityCard(data)).toThrow(/uses.qty is required/i);
	});

	it('throws descriptive error when uses.type is invalid', () => {
		const data = {
			name: 'Test',
			level: 1,
			type: 'efecto',
			uses: { qty: 1, type: 'INVALID' },
		};

		expect(() => mapCustomAbilityCard(data)).toThrow(/invalid uses.type/i);
	});

	it('maps ability card when uses is missing for efecto type', () => {
		const data = {
			name: 'Test',
			level: 1,
			type: 'efecto',
			tags: [],
		};

		const card = mapCustomAbilityCard(data);

		expect(card.uses).toEqual({ qty: 0, type: null });
	});

	it('maps ability card with uses.type: null and uses.qty: 0 for efecto type', () => {
		const data = {
			name: 'Estudios Mágicos',
			level: 1,
			type: 'efecto',
			tags: ['Mago', 'Arquetipo', 'Arcanista'],
			requirements: 'Mente 2',
			description: 'Has estudiado la magia...',
			uses: {
				type: null,
				qty: 0,
			},
		};

		const card = mapCustomAbilityCard(data);

		expect(card.uses).toEqual({ qty: 0, type: null });
	});

	it('maps ability card with uses.type: null for activable type', () => {
		const data = {
			name: 'Test',
			level: 1,
			type: 'activable',
			tags: [],
			uses: { qty: 1, type: null },
		};

		const card = mapCustomAbilityCard(data);

		expect(card.uses).toEqual({ qty: 1, type: null });
	});

	it('maps ability card with uses: null for activable type', () => {
		const data = {
			name: 'Test',
			level: 1,
			type: 'activable',
			tags: [],
			uses: null,
		};

		const card = mapCustomAbilityCard(data);

		expect(card.uses).toEqual({ qty: 0, type: null });
	});

	it('maps ability card with uses.type: "NULL" string for activable type', () => {
		const data = {
			name: 'Test',
			level: 1,
			type: 'activable',
			tags: [],
			uses: { qty: 2, type: 'NULL' },
		};

		const card = mapCustomAbilityCard(data);

		expect(card.uses).toEqual({ qty: 2, type: null });
	});
});

describe('mapCustomItemCard', () => {
	it('maps valid item YAML data to ItemCard with generated custom id', () => {
		const data = {
			name: 'Custom Magic Sword',
			level: 3,
			type: 'activable',
			tags: ['weapon'],
			requirements: null,
			description: 'A custom magic sword',
			uses: { qty: 5, type: 'USES' },
			cost: '100',
		};

		const card = mapCustomItemCard(data);

		expect(card.name).toBe('Custom Magic Sword');
		expect(card.level).toBe(3);
		expect(card.type).toBe('activable');
		expect(card.tags).toEqual(['weapon']);
		expect(card.cost).toBe('100');
		expect(card.cardType).toBe('item');
		expect(card.id).toMatch(/^custom-/);
	});

	it('throws descriptive error when cost is missing', () => {
		const data = {
			name: 'Test',
			level: 1,
			type: 'consumible',
			uses: { qty: 1, type: 'USES' },
		};

		expect(() => mapCustomItemCard(data)).toThrow(/cost is required/i);
	});

	it('throws descriptive error when type is invalid for item', () => {
		const data = {
			name: 'Test',
			level: 1,
			type: 'invalid',
			uses: { qty: 1, type: 'USES' },
			cost: '10',
		};

		expect(() => mapCustomItemCard(data)).toThrow(/invalid item type/i);
	});

	it('reuses existingId when provided', () => {
		const data = {
			name: 'Custom Sword',
			level: 1,
			type: 'efecto',
			tags: [],
			requirements: null,
			description: 'Test',
			uses: { qty: 1, type: 'USES' },
			cost: '50',
		};

		const card = mapCustomItemCard(data, 'custom-item-123');

		expect(card.id).toBe('custom-item-123');
	});

	it('maps item card with uses: null for efecto type', () => {
		const data = {
			name: 'Anillo Pasivo',
			level: 1,
			type: 'efecto',
			tags: [],
			requirements: null,
			description: 'Un anillo pasivo',
			uses: null,
			cost: '10',
		};

		const card = mapCustomItemCard(data);

		expect(card.uses).toEqual({ qty: 0, type: null });
	});

	it('maps item card with uses.type: null for consumible type', () => {
		const data = {
			name: 'Test',
			level: 1,
			type: 'consumible',
			uses: { qty: 1, type: null },
			cost: '10',
		};

		const card = mapCustomItemCard(data);

		expect(card.uses).toEqual({ qty: 1, type: null });
	});

	it('maps item card with uses: null for consumible type', () => {
		const data = {
			name: 'Test',
			level: 1,
			type: 'consumible',
			uses: null,
			cost: '10',
		};

		const card = mapCustomItemCard(data);

		expect(card.uses).toEqual({ qty: 0, type: null });
	});

	it('maps item card with uses.type: "NULL" string for activable type', () => {
		const data = {
			name: 'Test',
			level: 1,
			type: 'activable',
			uses: { qty: 2, type: 'NULL' },
			cost: '10',
		};

		const card = mapCustomItemCard(data);

		expect(card.uses).toEqual({ qty: 2, type: null });
	});
});
