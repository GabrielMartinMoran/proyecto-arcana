import { createCharacter } from '$lib/factories/character-factory';
import { describe, expect, it, vi } from 'vitest';
import {
	buildFormulaContext,
	calculateModifierFormula,
	evaluateFormula,
	isFormulaValid,
	type FormulaContext,
} from './modifiers-calculator';

const buildContext = (overrides: Partial<FormulaContext> = {}): FormulaContext => ({
	cuerpo: 1,
	reflejos: 1,
	mente: 1,
	instinto: 1,
	presencia: 1,
	ppGastados: 0,
	...overrides,
});

describe('evaluateFormula', () => {
	it('should evaluate max with a nested floor expression', () => {
		const result = evaluateFormula('max(1, floor(reflejos/2))', buildContext({ reflejos: 5 }));

		expect(result).toBe(2);
	});

	it('should evaluate min over attribute values', () => {
		const result = evaluateFormula(
			'min(cuerpo, reflejos)',
			buildContext({ cuerpo: 3, reflejos: 5 }),
		);

		expect(result).toBe(3);
	});

	it('should evaluate expressions through the Math object', () => {
		const result = evaluateFormula('Math.floor(reflejos/2)', buildContext({ reflejos: 5 }));

		expect(result).toBe(2);
	});

	it('should evaluate a plain attribute formula', () => {
		const result = evaluateFormula('presencia', buildContext({ presencia: 4 }));

		expect(result).toBe(4);
	});

	it('should evaluate spent PP inside the formula', () => {
		const result = evaluateFormula('5 + floor(ppGastados/10)*6', buildContext({ ppGastados: 20 }));

		expect(result).toBe(17);
	});

	it('should keep ceil available', () => {
		const result = evaluateFormula('ceil(reflejos/2)', buildContext({ reflejos: 5 }));

		expect(result).toBe(3);
	});

	it('should keep round available', () => {
		const result = evaluateFormula('round(reflejos/2)', buildContext({ reflejos: 5 }));

		expect(result).toBe(3);
	});

	it('should return 0 and warn when the formula is invalid', () => {
		const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

		try {
			const result = evaluateFormula('presencia +', buildContext({ presencia: 4 }));

			expect(result).toBe(0);
			expect(warnSpy).toHaveBeenCalledTimes(1);
		} finally {
			warnSpy.mockRestore();
		}
	});

	it('should return 0 when the formula is blank', () => {
		expect(evaluateFormula('', buildContext())).toBe(0);
		expect(evaluateFormula('   ', buildContext())).toBe(0);
	});
});

describe('isFormulaValid', () => {
	it('should accept a formula that evaluates to a finite number', () => {
		expect(isFormulaValid('presencia', buildContext({ presencia: 4 }))).toBe(true);
		expect(isFormulaValid('max(1, floor(reflejos/2))', buildContext({ reflejos: 5 }))).toBe(true);
	});

	it('should accept a legitimate zero result', () => {
		expect(isFormulaValid('ppGastados', buildContext({ ppGastados: 0 }))).toBe(true);
	});

	it('should reject a formula with a syntax error', () => {
		expect(isFormulaValid('presencia +', buildContext({ presencia: 4 }))).toBe(false);
	});

	it('should reject a blank formula', () => {
		expect(isFormulaValid('', buildContext())).toBe(false);
		expect(isFormulaValid('   ', buildContext())).toBe(false);
	});

	it('should reject a formula that evaluates to a non-finite number', () => {
		expect(isFormulaValid('1/0', buildContext())).toBe(false);
	});

	it('should reject a formula that evaluates to NaN', () => {
		expect(isFormulaValid('0/0', buildContext())).toBe(false);
	});
});

describe('buildFormulaContext', () => {
	it('should map character attributes and spent PP', () => {
		const character = createCharacter();
		character.attributes = { body: 3, reflexes: 5, mind: 2, instinct: 4, presence: 4 };
		character.ppHistory = [{ id: 'pp-1', type: 'subtract', value: 20, reason: 'test' }];

		expect(buildFormulaContext(character)).toEqual({
			cuerpo: 3,
			reflejos: 5,
			mente: 2,
			instinto: 4,
			presencia: 4,
			ppGastados: 20,
		});
	});

	it('should default spent PP to zero when the character has no spent history', () => {
		const character = createCharacter();

		expect(buildFormulaContext(character).ppGastados).toBe(0);
	});
});

describe('calculateModifierFormula', () => {
	it('should resolve max, min and Math formulas with the character context', () => {
		const character = createCharacter();
		character.attributes = { body: 3, reflexes: 5, mind: 1, instinct: 4, presence: 1 };

		expect(calculateModifierFormula('max(1, floor(reflejos/2))', character)).toBe(2);
		expect(calculateModifierFormula('min(cuerpo, reflejos)', character)).toBe(3);
		expect(calculateModifierFormula('Math.floor(instinto/2)', character)).toBe(2);
	});

	it('should resolve a max-based modifier formula like pellejo-de-hierro', () => {
		const character = createCharacter();
		character.attributes = { body: 3, reflexes: 1, mind: 1, instinct: 1, presence: 1 };

		expect(calculateModifierFormula('max(cuerpo - 1, 1)', character)).toBe(2);
	});
});
