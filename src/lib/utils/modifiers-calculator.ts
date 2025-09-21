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
		cuerpo: character.attributes.cuerpo,
		reflejos: character.attributes.reflejos,
		mente: character.attributes.mente,
		instinto: character.attributes.instinto,
		presencia: character.attributes.presencia,
		Math,
	});
};
