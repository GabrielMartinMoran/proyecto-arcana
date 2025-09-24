import { mapRollLog } from '$lib/mappers/roll-log-mapper';
import { serializeRollLog } from '$lib/serializers/roll-log-serializer';
import type { DiceResult } from '$lib/types/dice-result';
import type { DiceRoll } from '$lib/types/dice-roll';
import type { RollLog } from '$lib/types/roll-log';
import { parseDiceExpression } from '$lib/utils/dice-expression-parser';
import { writable, type Writable } from 'svelte/store';
import { CONFIG } from '../../config';

const STORAGE_KEY = 'arcana:rollLogs';

const state: {
	inited: boolean;
	clearTimeoutId: NodeJS.Timeout | null;
	roll3DDice: (expression: string) => Promise<DiceResult[]>;
	clear3DDices: () => void;
	logs: Writable<RollLog[]>;
} = {
	inited: false,
	clearTimeoutId: null,
	roll3DDice: async () => [],
	clear3DDices: () => {},
	logs: writable([]),
};

const loadRollLogs = (): RollLog[] => {
	try {
		const logs = localStorage.getItem(STORAGE_KEY);
		const rawLogs = logs ? JSON.parse(logs) : [];
		return rawLogs.map((x: any) => mapRollLog(x));
	} catch (error) {
		console.error('Error loading roll logs:', error);
		return [];
	} finally {
		state.logs.subscribe((logs) => saveRollLogs(logs));
	}
};

const saveRollLogs = (logs: RollLog[]): void => {
	try {
		const serializedLogs = logs.map((x) => serializeRollLog(x));
		localStorage.setItem(STORAGE_KEY, JSON.stringify(serializedLogs));
	} catch (error) {
		console.error('Error saving roll logs:', error);
	}
};

const rollDice = async (expression: string): Promise<DiceResult[]> => {
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

const buildRollsDetail = (rolls: DiceRoll[]): string => {
	let detail = '';
	rolls.forEach((roll, i) => {
		const expression = roll.expressionMember;
		let term = '';
		switch (expression.type) {
			case 'dice':
				if (i > 0 && !expression.value.toString().startsWith('-')) term += '+ ';
				term += `${expression.value} [${(roll.result as DiceResult[]).map((x) => `<span class="${x.value === x.sides ? 'max' : ''}${x.value === 1 ? 'min' : ''}">` + x.value.toString() + (expression.isExplosive && x.value === x.sides ? '💥' : '') + '</span>').join(', ')}]`;
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

const calculateTotal = (rolls: DiceRoll[]): number => {
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

const logRolls = (rolls: DiceRoll[], title?: string) => {
	console.log(rolls);
	const log: RollLog = {
		id: crypto.randomUUID(),
		timestamp: new Date(),
		title: title || 'Dice Roll',
		total: calculateTotal(rolls),
		detail: buildRollsDetail(rolls),
	};

	state.logs.update((x) => [...x, log]);
};

export const useDiceRollerService = () => {
	if (!state.inited) {
		state.logs.set(loadRollLogs());
		state.inited = true;
	}

	const rollExpression = async ({
		expression,
		variables = {},
		title = undefined,
	}: {
		expression: string;
		variables?: Record<string, number>;
		title?: string;
	}): Promise<DiceRoll[]> => {
		const members = parseDiceExpression(expression, variables);

		if (state.clearTimeoutId) {
			clearTimeout(state.clearTimeoutId);
			state.clearTimeoutId = null;
		}

		state.clear3DDices();

		const rolls: DiceRoll[] = [];

		for (const member of members) {
			if (member.type === 'dice') {
				rolls.push({
					expressionMember: member,
					promise: rollDice(member.value as string),
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
								promise: rollDice(expressionMember.value as string),
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

		logRolls(rolls, title);

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
		rollLogs: state.logs,
	};
};
