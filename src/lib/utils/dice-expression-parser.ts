/* proyecto-arcana/src/lib/utils/dice-formula-parser.ts
   Implementación del parser de fórmulas de dados.

   Reglas:
   - Devuelve un arreglo de `DiceFormulaMember`.
   - Soporta tokens separados por + o - (espacios permitidos).
   - Tokens válidos:
     * Constantes numéricas (enteros o decimales).
     * Variables: identificadores que se buscan en `variables` (se guarda el valor numérico y en `label` el nombre).
     * Dados: form `NdM` o `dM` (N opcional, por defecto 1).
     * Dados explosivos: igual que dados pero con una `e` o `E` al final: `2d6e` -> tipo `explodingDice`.
   - El signo + / - delante de un token indica suma o resta. Para variables y constantes el valor numérico se ajusta con el signo.
     Para dados y dados explosivos el signo se conserva en la representación en `value` como prefijo '-' si corresponde
     (por compatibilidad con representaciones de tokens "negativos", puesto que `value` es string para dados).
*/

import type { DiceExpressionMember } from '$lib/types/dice-expression-member';

export const parseDiceExpression = (
	formula: string,
	variables: Record<string, number>,
): DiceExpressionMember[] => {
	if (!formula) return [];

	const members: DiceExpressionMember[] = [];

	// Normalize: remove spaces to simplify parsing but keep +/-
	const normalized = formula.replace(/\s+/g, '');

	// Regex to capture optional leading sign and token:
	// token may be:
	//  - dice: 2d6, d8, 3d10e, 4d6E
	//  - number: 123 or 12.34
	//  - variable: starts with letter or underscore, then word chars
	const tokenRe = /([+-]?)(\d*d\d+(?:[eE])?|\d+(\.\d+)?|[A-Za-z_][A-Za-z0-9_]*)/g;

	let match: RegExpExecArray | null;
	while ((match = tokenRe.exec(normalized)) !== null) {
		const sign = match[1] || '+';
		const token = match[2];

		// Check if token is a dice expression
		const diceMatch = /^(\d*)[dD](\d+)([eE])?$/.exec(token);
		if (diceMatch) {
			const countStr = diceMatch[1];
			const sidesStr = diceMatch[2];
			const explodingFlag = Boolean(diceMatch[3]);

			const count = countStr ? Number(countStr) : 1;
			const sides = Number(sidesStr);

			// Represent dice as a string "NdM" (preserve count even if 1)
			let diceValue = `${count}d${sides}`;
			if (sign === '-') diceValue = `-${diceValue}`;

			const member: DiceExpressionMember = {
				type: 'dice',
				isExplosive: explodingFlag,
				value: diceValue,
			};
			members.push(member);
			continue;
		}

		// Check if token is a number (integer or float)
		const numberMatch = /^\d+(\.\d+)?$/.exec(token);
		if (numberMatch) {
			let num = Number(token);
			if (sign === '-') num = -num;
			members.push({
				type: 'constant',
				isExplosive: false,
				value: num,
			});
			continue;
		}

		// Otherwise treat as variable name
		// Look up in provided variables map; if not present, default to 0
		const varName = token;
		const rawValue =
			variables && Object.prototype.hasOwnProperty.call(variables, varName)
				? Number(variables[varName]) || 0
				: 0;
		const varValue = sign === '-' ? -rawValue : rawValue;
		members.push({
			type: 'variable',
			value: varValue,
			isExplosive: false,
			label: varName,
		});
	}

	return members;
};
