import { parseDiceExpression, type DiceExpressionMember } from '$lib/utils/dice-expression-parser';
import { CONFIG } from '../../config';

export type DiceResult = {
	sides: number;
	dieType: string;
	groupId: number;
	rollId: number;
	theme: string;
	themeColor: string;
	value: number;
};

export type DiceRoll = {
	expressionMember: DiceExpressionMember;
	promise?: Promise<any>;
	result?: DiceResult[] | number;
	explosionResolved: boolean;
	numExplosions: number;
};

const state: {
	clearTimeoutId: NodeJS.Timeout | null;
	roll3DDice: (expression: string) => Promise<DiceResult[]>;
	clear3DDices: () => void;
} = {
	clearTimeoutId: null,
	roll3DDice: async () => [],
	clear3DDices: () => {},
};

export const useDiceRollerService = () => {
	const rollExpression = async (
		expression: string,
		variables: Record<string, number>,
	): Promise<DiceRoll[]> => {
		const members = parseDiceExpression(expression, variables);

		if (state.clearTimeoutId) {
			clearTimeout(state.clearTimeoutId);
			state.clearTimeoutId = null;
		}

		state.clear3DDices();

		const rolls: DiceRoll[] = [];

		const rollExpression = async (expression: string): Promise<DiceResult[]> => {
			const isStandardDice = CONFIG.STANDARD_DICES.some((x) => expression.endsWith(x));
			if (isStandardDice) {
				return state.roll3DDice(expression);
			} else {
				return new Promise((resolve) => {
					const [quantity, sides] = expression.split('d');
					const results: DiceResult[] = [];
					for (let i = 0; i < Number(quantity); i++) {
						results.push({
							value: Math.floor(Math.random() * Number(sides)) + 1,
							sides: Number(sides),
							dieType: 'd' + sides,
							groupId: 0,
							rollId: i,
							theme: 'default',
							themeColor: '#000000',
						});
					}
					resolve(results);
				});
			}
		};

		for (const member of members) {
			if (member.type === 'dice') {
				rolls.push({
					expressionMember: member,
					promise: rollExpression(member.value as string),
					result: undefined,
					explosionResolved: false,
					numExplosions: 0,
				});
			} else {
				rolls.push({
					expressionMember: member,
					promise: undefined,
					result: member.value as number,
					explosionResolved: true,
					numExplosions: 0,
				});
			}
		}

		while (rolls.some((x) => x.result === undefined)) {
			const resolvers: Promise<DiceRoll>[] = [];
			const filteredRolls = rolls.filter(
				(x) => x.expressionMember.type === 'dice' && x.result === undefined,
			);
			for (const roll of filteredRolls) {
				resolvers.push(
					(async () => {
						roll.result = (await roll.promise) as DiceResult[];
						roll.promise = undefined;

						for (const result of roll.result) {
							if (
								roll.expressionMember.isExplosive &&
								result.sides === result.value &&
								result.sides > 1 // For preventing infinite loops
							) {
								roll.numExplosions++;
							}
						}

						if (roll.numExplosions > 0) {
							const expressionMember = {
								...roll.expressionMember,
								value: `${roll.numExplosions}d${roll.result[0].sides}`,
							};
							rolls.push({
								expressionMember: expressionMember,
								promise: rollExpression(expressionMember.value as string),
								result: undefined,
								explosionResolved: false,
								numExplosions: 0,
							});
						}

						return roll;
					})(),
				);
			}
			await Promise.all(resolvers);
		}

		state.clearTimeoutId = setTimeout(() => {
			state.clear3DDices();
		}, CONFIG.CLEAR_3D_DICES_DELAY);

		console.log('RESULTS', rolls);
		return rolls;
	};

	const register3DDiceRollerFn = (fn: (expression: string) => Promise<DiceResult[]>) => {
		state.roll3DDice = fn;
	};

	const registerClear3DDicesFn = (fn: () => void) => {
		state.clear3DDices = fn;
	};
	return {
		rollExpression,
		register3DDiceRollerFn,
		registerClear3DDicesFn,
	};
};
