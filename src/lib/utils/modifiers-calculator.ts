import type { Character } from '$lib/types/character';

const evaluateModifierExpression = (expression: string, context: any) => {
	if (!expression) return 0;
	const expr = expression.trim();
	try {
		// Expose a safe, limited context
		const fn = new Function(
			'cuerpo',
			'reflejos',
			'mente',
			'instinto',
			'presencia',
			'ppGastados',
			'floor',
			'ceil',
			'round',
			'Math',
			`return (${expr});`,
		);
		return (
			Number(
				fn(
					Number(context.cuerpo) || 0,
					Number(context.reflejos) || 0,
					Number(context.mente) || 0,
					Number(context.instinto) || 0,
					Number(context.presencia) || 0,
					Number(context.ppGastados) || 0,
					Math.floor,
					Math.ceil,
					Math.round,
					Math,
				),
			) || 0
		);
	} catch (error) {
		console.error('Error evaluating modifier expression:', error);
		return 0;
	}
};

export const calculateModifierFormula = (formula: string, character: Character) => {
	return evaluateModifierExpression(formula, {
		cuerpo: character.attributes.body,
		reflejos: character.attributes.reflexes,
		mente: character.attributes.mind,
		instinto: character.attributes.instinct,
		presencia: character.attributes.presence,
		ppGastados: character.spentPP,
		floor: Math.floor,
		ceil: Math.ceil,
		round: Math.round,
		Math,
	});
};
