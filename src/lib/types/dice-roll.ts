import type { DiceExpressionMember } from './dice-expression-member';
import type { DiceResult } from './dice-result';

export type DiceRoll = {
	expressionMember: DiceExpressionMember;
	promise?: Promise<any>;
	result?: DiceResult[] | number;
	explosionResolved: boolean;
	numExplosions: number;
};
