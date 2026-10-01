import type { Card } from '$lib/types/cards/card';
import { CONFIG } from '../../config';
import { evaluateFormula, type FormulaContext } from './modifiers-calculator';

const resolveFormulaUses = (formula: string, context?: FormulaContext): number | null => {
	if (!context) return null;

	const value = evaluateFormula(formula, context);
	if (!Number.isFinite(value)) return 0;

	return Math.max(0, Math.floor(value));
};

export const getCardTotalUses = (card: Card, context?: FormulaContext): number | null => {
	if (card.uses.formula) return resolveFormulaUses(card.uses.formula, context);
	if (card.uses.type === null) return null;

	switch (card.uses.type) {
		case 'USES':
		case 'LONG_REST':
		case 'DAY':
			return card.uses.qty ?? 0;
		case 'RELOAD':
			return CONFIG.RELOAD_CARD_USES;
		default:
			return null;
	}
};

export const clampRemainingUses = (
	remaining: number | null,
	totalUses: number | null,
): number | null => {
	if (totalUses !== null && remaining !== null && remaining > totalUses) return totalUses;
	return remaining;
};

export const getCardTypeName = (card: Card): string => {
	return card.cardType === 'ability' ? 'Habilidad' : 'Objeto Mágico';
};
