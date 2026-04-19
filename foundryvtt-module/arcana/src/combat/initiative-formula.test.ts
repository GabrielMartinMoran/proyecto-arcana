/**
 * Unit tests for initiative-formula.ts
 * Pure functions for building initiative formulas and flavor strings
 */

import { describe, expect, it } from 'vitest';
import { buildInitiativeFlavor, buildInitiativeFormula } from './initiative-formula';

describe('buildInitiativeFormula', () => {
	describe('normal mode', () => {
		it('should build formula with positive modifier', () => {
			const result = buildInitiativeFormula(5, 'normal');
			expect(result).toBe('1d8e + 5');
		});

		it('should build formula with zero modifier', () => {
			const result = buildInitiativeFormula(0, 'normal');
			expect(result).toBe('1d8e + 0');
		});

		it('should build formula with negative modifier', () => {
			const result = buildInitiativeFormula(-3, 'normal');
			expect(result).toBe('1d8e + -3');
		});
	});

	describe('advantage mode', () => {
		it('should add +1d4 to formula with positive modifier', () => {
			const result = buildInitiativeFormula(5, 'advantage');
			expect(result).toBe('1d8e + 5 + 1d4');
		});

		it('should add +1d4 to formula with zero modifier', () => {
			const result = buildInitiativeFormula(0, 'advantage');
			expect(result).toBe('1d8e + 0 + 1d4');
		});

		it('should add +1d4 to formula with negative modifier', () => {
			const result = buildInitiativeFormula(-2, 'advantage');
			expect(result).toBe('1d8e + -2 + 1d4');
		});
	});

	describe('disadvantage mode', () => {
		it('should add -1d4 to formula with positive modifier', () => {
			const result = buildInitiativeFormula(5, 'disadvantage');
			expect(result).toBe('1d8e + 5 - 1d4');
		});

		it('should add -1d4 to formula with zero modifier', () => {
			const result = buildInitiativeFormula(0, 'disadvantage');
			expect(result).toBe('1d8e + 0 - 1d4');
		});

		it('should add -1d4 to formula with negative modifier', () => {
			const result = buildInitiativeFormula(-2, 'disadvantage');
			expect(result).toBe('1d8e + -2 - 1d4');
		});
	});
});

describe('buildInitiativeFlavor', () => {
	describe('normal mode', () => {
		it('should build flavor string with Normal label', () => {
			const result = buildInitiativeFlavor('Gandalf', 'normal');
			expect(result).toBe('Gandalf tira Iniciativa (Normal)');
		});
	});

	describe('advantage mode', () => {
		it('should build flavor string with Ventaja label', () => {
			const result = buildInitiativeFlavor('Gandalf', 'advantage');
			expect(result).toBe('Gandalf tira Iniciativa (Ventaja)');
		});
	});

	describe('disadvantage mode', () => {
		it('should build flavor string with Desventaja label', () => {
			const result = buildInitiativeFlavor('Gandalf', 'disadvantage');
			expect(result).toBe('Gandalf tira Iniciativa (Desventaja)');
		});
	});

	describe('edge cases', () => {
		it('should handle empty name', () => {
			const result = buildInitiativeFlavor('', 'normal');
			expect(result).toBe(' tira Iniciativa (Normal)');
		});

		it('should handle unicode characters in name', () => {
			const result = buildInitiativeFlavor('Ñandú', 'advantage');
			expect(result).toBe('Ñandú tira Iniciativa (Ventaja)');
		});
	});
});
