export interface RollModalData {
	expression: string;
	variables: Record<string, number>;
	title: string;
	rollType: 'normal' | 'advantage' | 'disadvantage';
	extraModsExpression: string;
	resultFormatter?: (total: number) => string;
}
