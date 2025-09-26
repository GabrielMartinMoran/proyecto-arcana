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

export const parseCreatureDamageExpression = (raw: string) => {
	const parts: any[] = [];
	if (!raw || !String(raw).trim()) return parts;
	const s = String(raw).trim();

	// Normalize plus/minus spacing but preserve case for damageType.
	// Ensure uniform leading sign
	const norm = /^[+-]/.test(s) ? s : `+${s}`;

	// Regex to capture sequences: sign then all until next sign
	const tokenRe = /([+-])\s*([^+-]+)/g;
	let m;
	while ((m = tokenRe.exec(norm)) !== null) {
		const sign = m[1] === '+' ? 1 : -1;
		const term = (m[2] || '').trim();
		if (!term) continue;

		// Try dice at start: NdM or N d M
		const diceMatch = term.match(/^(\d+)\s*d\s*(\d+)/i);
		if (diceMatch) {
			const n = Number(diceMatch[1]);
			const faces = Number(diceMatch[2]);
			const rest = term.slice(diceMatch[0].length).trim();
			const damageType = rest || null;
			parts.push({ kind: 'dice', sign, n, faces, damageType, raw: term });
			continue;
		}

		// Try flat number at start
		const numMatch = term.match(/^(\d+)/);
		if (numMatch) {
			const value = Number(numMatch[1]);
			const rest = term.slice(numMatch[0].length).trim();
			const damageType = rest || null;
			parts.push({ kind: 'flat', sign, value, damageType, raw: term });
			continue;
		}

		// Fallback: try to find any dice anywhere
		const anyDice = term.match(/(\d+)\s*d\s*(\d+)/i);
		if (anyDice) {
			const n = Number(anyDice[1]);
			const faces = Number(anyDice[2]);
			const damageType = term.replace(anyDice[0], '').trim() || null;
			parts.push({ kind: 'dice', sign, n, faces, damageType, raw: term });
			continue;
		}

		// Fallback: treat as "flat" label with zero numeric effect (keeps type information)
		parts.push({ kind: 'flat', sign, value: 0, damageType: term || null, raw: term });
	}

	const finalExpression = parts.reduce((acc, term) => {
		if (term.kind === 'dice') {
			return `${acc} ${term.sign === 1 ? '+' : '-'} ${term.n}d${term.faces}`;
		} else if (term.kind === 'flat') {
			return `${acc} ${term.sign === 1 ? '+' : '-'} ${term.value}`;
		}
		return acc;
	}, '');

	return finalExpression;
};
