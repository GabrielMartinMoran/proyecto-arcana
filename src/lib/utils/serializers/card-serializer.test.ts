import type { Card } from '$lib/types/cards/card';
import { describe, expect, it } from 'vitest';
import { formatUses, serializeCardsAsMDTable } from './card-serializer';

describe('formatUses', () => {
	it('should return N/A when uses is null', () => {
		expect(formatUses(null)).toBe('N/A');
	});

	it('should return N/A for a uses block without type or formula', () => {
		expect(formatUses({ type: null, qty: 0 })).toBe('N/A');
	});

	it('should format a LONG_REST quantity with its rest description', () => {
		expect(formatUses({ type: 'LONG_REST', qty: 3 })).toBe('3 por día de descanso');
	});

	it('should show the formula text when a formula is declared', () => {
		expect(formatUses({ type: 'LONG_REST', qty: 2, formula: 'presencia' })).toBe(
			'presencia por día de descanso',
		);
	});

	it('should prefer the formula over qty', () => {
		expect(formatUses({ type: 'USES', qty: 9, formula: 'max(1, floor(reflejos/2))' })).toBe(
			'max(1, floor(reflejos/2))',
		);
	});

	it('should tolerate an incomplete uses block without undefined or NaN', () => {
		const text = formatUses({ type: 'LONG_REST', qty: null });

		expect(text).toBe('— por día de descanso');
		expect(text).not.toMatch(/undefined|NaN/);
	});
});

describe('serializeCardsAsMDTable', () => {
	const abilityCard = (uses: Card['uses']): Card => ({
		id: 'card-1',
		name: 'Reprensión Infernal',
		level: 1,
		tags: ['Linaje'],
		requirements: null,
		description: 'Descripción de la carta',
		uses,
		type: 'efecto',
		cardType: 'ability',
	});

	it('should serialize a formula uses cell without breaking the markdown row', () => {
		const table = serializeCardsAsMDTable([
			abilityCard({ type: 'LONG_REST', qty: 0, formula: 'presencia' }),
		]);

		expect(table).toContain('| presencia por día de descanso |');
		expect(table).not.toMatch(/undefined|NaN/);
	});
});
