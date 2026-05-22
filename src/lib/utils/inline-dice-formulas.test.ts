import { describe, expect, it } from 'vitest';
import { parseInlineDiceFormulaParts } from './inline-dice-formulas';

const formulasFrom = (text: string) =>
	parseInlineDiceFormulaParts(text).filter((part) => part.type === 'formula');

describe('parseInlineDiceFormulaParts', () => {
	it('FEAT-statblock-inline-dice @rendering — extracts a single dice formula', () => {
		expect(parseInlineDiceFormulaParts('Inflige 1d6 de daño')).toEqual([
			{ type: 'text', text: 'Inflige ' },
			{ type: 'formula', display: '1d6', expression: '1d6' },
			{ type: 'text', text: ' de daño' },
		]);
	});

	it('FEAT-statblock-inline-dice @multiple-formulas — extracts multiple formulas in order', () => {
		expect(formulasFrom('Inflige 1d6 + 5 + 4d2 y luego 2d6 + 3')).toEqual([
			{ type: 'formula', display: '1d6 + 5 + 4d2', expression: '1d6+5+4d2' },
			{ type: 'formula', display: '2d6 + 3', expression: '2d6+3' },
		]);
	});

	it('normalizes uppercase dice separators and preserves display text', () => {
		expect(formulasFrom('Causa 2D6 + 3')).toEqual([
			{ type: 'formula', display: '2D6 + 3', expression: '2d6+3' },
		]);
	});

	it.each([
		['1d8+1', '1d8+1'],
		['2d6 + 3', '2d6+3'],
		['+1d4', '+1d4'],
		['-1d4', '-1d4'],
		['1d6 - 2', '1d6-2'],
	])('supports contracted formula %s', (visibleFormula, rollExpression) => {
		expect(formulasFrom(`Tira ${visibleFormula}`)).toEqual([
			{ type: 'formula', display: visibleFormula, expression: rollExpression },
		]);
	});

	it('does not extract standalone numbers or dice-like substrings inside words', () => {
		expect(formulasFrom('Tiene CD 15, rango 6, código abc1d6 y texto 1d6abc')).toEqual([]);
	});

	it('does not extract incomplete formulas ending with an operator', () => {
		expect(formulasFrom('Inflige 1d6 +')).toEqual([]);
	});
});
