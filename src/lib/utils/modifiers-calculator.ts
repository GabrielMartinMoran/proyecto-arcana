import type { Character } from '$lib/types/character';

export interface FormulaContext {
	cuerpo: number;
	reflejos: number;
	mente: number;
	instinto: number;
	presencia: number;
	ppGastados: number;
}

const normalizeNumber = (value: unknown): number => Number(value) || 0;

export const buildFormulaContext = (character: Character): FormulaContext => ({
	cuerpo: character.attributes.body,
	reflejos: character.attributes.reflexes,
	mente: character.attributes.mind,
	instinto: character.attributes.instinct,
	presencia: character.attributes.presence,
	ppGastados: character.spentPP,
});

// The Math helpers must be passed explicitly: `new Function` parameters shadow
// the globals, so an omitted argument would evaluate to undefined.
const FORMULA_PARAMETERS = [
	'cuerpo',
	'reflejos',
	'mente',
	'instinto',
	'presencia',
	'ppGastados',
	'floor',
	'ceil',
	'round',
	'max',
	'min',
	'Math',
] as const;

type FormulaEvaluator = (...args: unknown[]) => unknown;

const compileFormula = (expression: string): FormulaEvaluator =>
	new Function(...FORMULA_PARAMETERS, `return (${expression});`) as FormulaEvaluator;

const evaluateExpression = (expression: string, context: FormulaContext): unknown =>
	compileFormula(expression)(
		normalizeNumber(context.cuerpo),
		normalizeNumber(context.reflejos),
		normalizeNumber(context.mente),
		normalizeNumber(context.instinto),
		normalizeNumber(context.presencia),
		normalizeNumber(context.ppGastados),
		Math.floor,
		Math.ceil,
		Math.round,
		Math.max,
		Math.min,
		Math,
	);

export const evaluateFormula = (formula: string, context: FormulaContext): number => {
	if (!formula) return 0;

	const expression = formula.trim();
	if (!expression) return 0;

	try {
		return normalizeNumber(evaluateExpression(expression, context));
	} catch (error) {
		console.warn('Error evaluating formula:', error);
		return 0;
	}
};

export const isFormulaValid = (formula: string, context: FormulaContext): boolean => {
	if (!formula) return false;

	const expression = formula.trim();
	if (!expression) return false;

	try {
		const result = evaluateExpression(expression, context);
		return typeof result === 'number' && Number.isFinite(result);
	} catch {
		return false;
	}
};

export const calculateModifierFormula = (formula: string, character: Character): number =>
	evaluateFormula(formula, buildFormulaContext(character));
