import type { DiceExpressionMember } from '$lib/types/dice-expression-member';
import type { DiceResult } from '$lib/types/dice-result';
import type { DiceRoll } from '$lib/types/dice-roll';

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

export const buildRollsDetail = (rolls: DiceRoll[]): string => {
	let detail = '';
	rolls.forEach((roll, i) => {
		const expression = roll.expressionMember;
		let term = '';
		switch (expression.type) {
			case 'dice':
				if (i > 0 && !expression.value.toString().startsWith('-')) term += '+ ';
				term += `${expression.value}${expression.isExplosive ? 'e' : ''} [${(roll.result as DiceResult[]).map((x) => `<span class="${x.value === x.sides ? 'max' : ''}${x.value === 1 ? 'min' : ''}">` + x.value.toString() + (expression.isExplosive && x.value === x.sides ? '💥' : '') + '</span>').join(', ')}]`;
				break;
			case 'constant':
				term = `${i > 0 && (expression.value as number) >= 0 ? '+ ' : ''}${expression.value}`;
				break;
			case 'variable':
				term = `${i > 0 && (expression.value as number) >= 0 ? '+ ' : ''}${expression.label} [${expression.value}]`;
				break;
			default:
				break;
		}
		if (term.startsWith('-')) term = term.replace('-', '- ');
		detail += `${i > 0 ? ' ' : ''}${term}`;
	});
	return detail;
};

export const calculateTotal = (rolls: DiceRoll[]): number => {
	let total = 0;
	rolls.forEach((roll) => {
		const expression = roll.expressionMember;
		switch (expression.type) {
			case 'dice':
				total +=
					(roll.result as DiceResult[]).reduce((acc, result) => acc + result.value, 0) *
					(expression.value.toString().startsWith('-') ? -1 : 1);
				break;
			case 'constant':
				total += expression.value as number;
				break;
			case 'variable':
				total += expression.value as number;
				break;
			default:
				break;
		}
	});
	return total;
};
