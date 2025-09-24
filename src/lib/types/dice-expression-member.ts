export interface DiceExpressionMember {
	type: 'constant' | 'variable' | 'dice';
	value: number | string;
	label?: string;
	isExplosive: boolean;
}
