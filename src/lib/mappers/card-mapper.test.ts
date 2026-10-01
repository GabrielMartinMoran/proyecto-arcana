import { describe, expect, it } from 'vitest';
import {
	mapAbilityCard,
	mapCustomAbilityCard,
	mapCustomItemCard,
	mapItemCard,
} from './card-mapper';

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

	it('defaults uses.qty to 0 when uses.qty is missing', () => {
		const data = {
			name: 'Test',
			level: 1,
			type: 'efecto',
			tags: [],
			uses: { type: 'USES' },
		};

		const card = mapCustomAbilityCard(data);

		expect(card.uses).toEqual({ qty: 0, type: 'USES' });
	});

	it('preserves a non-empty uses.formula in custom cards', () => {
		const data = {
			name: 'Test',
			level: 1,
			type: 'efecto',
			tags: [],
			uses: { type: 'LONG_REST', formula: 'presencia' },
		};

		const card = mapCustomAbilityCard(data);

		expect(card.uses).toEqual({ qty: 0, type: 'LONG_REST', formula: 'presencia' });
	});

	it('throws descriptive error when uses.formula is not a non-empty string', () => {
		const blankFormula = {
			name: 'Test',
			level: 1,
			type: 'efecto',
			tags: [],
			uses: { type: 'LONG_REST', qty: 1, formula: '   ' },
		};
		const nonStringFormula = {
			name: 'Test',
			level: 1,
			type: 'efecto',
			tags: [],
			uses: { type: 'LONG_REST', qty: 1, formula: 42 },
		};

		expect(() => mapCustomAbilityCard(blankFormula)).toThrow(
			/uses\.formula must be a non-empty string/i,
		);
		expect(() => mapCustomAbilityCard(nonStringFormula)).toThrow(
			/uses\.formula must be a non-empty string/i,
		);
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

describe('mapAbilityCard', () => {
	const rawCard = (overrides: Record<string, unknown> = {}) => ({
		name: 'Reprensión Infernal',
		level: 1,
		type: 'efecto',
		tags: ['Linaje'],
		description: 'Descripción de la carta',
		...overrides,
	});

	it('normalizes a missing uses block to zero quantity and null type', () => {
		expect(mapAbilityCard(rawCard()).uses).toEqual({ qty: 0, type: null });
	});

	it('normalizes a null uses block to zero quantity and null type', () => {
		expect(mapAbilityCard(rawCard({ uses: null })).uses).toEqual({ qty: 0, type: null });
	});

	it('defaults a missing qty to zero when the uses type is declared', () => {
		expect(mapAbilityCard(rawCard({ uses: { type: 'LONG_REST' } })).uses).toEqual({
			qty: 0,
			type: 'LONG_REST',
		});
	});

	it('preserves a declared formula next to its type', () => {
		expect(
			mapAbilityCard(rawCard({ uses: { type: 'LONG_REST', formula: 'presencia' } })).uses,
		).toEqual({ qty: 0, type: 'LONG_REST', formula: 'presencia' });
	});

	it('throws a descriptive error for an invalid uses type', () => {
		expect(() => mapAbilityCard(rawCard({ uses: { type: 'WEEKLY', qty: 1 } }))).toThrow(
			/invalid uses\.type/i,
		);
	});

	it('throws a descriptive error when uses.formula is not a non-empty string', () => {
		expect(() => mapAbilityCard(rawCard({ uses: { type: 'LONG_REST', formula: '' } }))).toThrow(
			/uses\.formula must be a non-empty string/i,
		);
		expect(() => mapAbilityCard(rawCard({ uses: { type: 'LONG_REST', formula: 7 } }))).toThrow(
			/uses\.formula must be a non-empty string/i,
		);
	});
});

describe('mapItemCard', () => {
	const rawItem = (overrides: Record<string, unknown> = {}) => ({
		name: 'Pipa del Cuentacuentos',
		level: 1,
		type: 'efecto',
		tags: ['Estético'],
		description: 'Descripción del objeto mágico',
		cost: '100',
		...overrides,
	});

	it('maps a declared uses block preserving its type and quantity', () => {
		const card = mapItemCard(rawItem({ uses: { type: 'DAY', qty: 3 } }));

		expect(card.uses).toEqual({ qty: 3, type: 'DAY' });
		expect(card.type).toBe('efecto');
		expect(card.cost).toBe('100');
		expect(card.cardType).toBe('item');
	});

	it('normalizes a missing uses block to zero quantity and null type', () => {
		expect(mapItemCard(rawItem()).uses).toEqual({ qty: 0, type: null });
	});

	it('normalizes a null uses block to zero quantity and null type', () => {
		expect(mapItemCard(rawItem({ uses: null })).uses).toEqual({ qty: 0, type: null });
	});

	it('normalizes a non-object uses block to zero quantity and null type', () => {
		expect(mapItemCard(rawItem({ uses: 'unexpected' })).uses).toEqual({ qty: 0, type: null });
	});

	it('defaults a missing qty to zero when the uses type is declared', () => {
		expect(mapItemCard(rawItem({ uses: { type: 'USES' } })).uses).toEqual({
			qty: 0,
			type: 'USES',
		});
	});

	it('preserves a declared formula next to its type', () => {
		expect(mapItemCard(rawItem({ uses: { type: 'DAY', formula: 'mente' } })).uses).toEqual({
			qty: 0,
			type: 'DAY',
			formula: 'mente',
		});
	});

	it('throws a descriptive error for an invalid uses type', () => {
		expect(() => mapItemCard(rawItem({ uses: { type: 'WEEKLY', qty: 1 } }))).toThrow(
			/invalid uses\.type/i,
		);
	});

	it('throws a descriptive error when uses.formula is not a non-empty string', () => {
		expect(() => mapItemCard(rawItem({ uses: { type: 'DAY', formula: '' } }))).toThrow(
			/uses\.formula must be a non-empty string/i,
		);
		expect(() => mapItemCard(rawItem({ uses: { type: 'DAY', formula: 7 } }))).toThrow(
			/uses\.formula must be a non-empty string/i,
		);
	});
});
