<script lang="ts">
	import {
		parseDiceExpression,
		type DiceExpressionMember,
	} from '$lib/utils/dice-expression-parser';
	import DiceBox from '@3d-dice/dice-box';
	import { onMount } from 'svelte';

	const STANDARD_DICES = ['d4', 'd6', 'd8', 'd10', 'd12', 'd20', 'd100'];

	let diceBox: DiceBox = $state();

	onMount(async () => {
		const element = document.getElementById('dice-box');
		if (element) {
			diceBox = new DiceBox({
				assetPath: '/assets/dice-box/',
				container: '#dice-box',
				scale: 12,
			});
			await diceBox.init();
		}
	});

	const roll = async (expression: string, variables: Record<string, number>) => {
		const members = parseDiceExpression(expression, variables);

		diceBox.clear();

		type DiceResult = {
			sides: number;
			dieType: string;
			groupId: number;
			rollId: number;
			theme: string;
			themeColor: string;
			value: number;
		};

		type DiceRoll = {
			expressionMember: DiceExpressionMember;
			promise?: Promise<any>;
			result?: DiceResult[] | number;
			explosionResolved: boolean;
			numExplosions: number;
		};

		let rolls: DiceRoll[] = [];

		const rollExpression = async (expression: string): Promise<DiceResult[]> => {
			const isStandardDice = STANDARD_DICES.some((x) => expression.endsWith(x));
			if (isStandardDice) {
				return diceBox.add(expression);
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

		console.log('RESULTS', rolls);
		return rolls;
	};
</script>

<div class="dice-box-container">
	<div class="controls">
		{#if diceBox !== undefined}
			<button onclick={() => roll('1d2e', {})} class="dice-button">1d2e</button>
			{#each STANDARD_DICES as dice (dice)}
				<button onclick={() => roll(`100${dice}e`, {})} class="dice-button">{`100${dice}e`}</button>
			{/each}
		{/if}
	</div>
	<div class="dice-box" id="dice-box"></div>
</div>

<style>
	.dice-box-container {
		position: fixed;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		top: 50%;
		left: 50%;
		transform: translate(-50%, -50%);
		width: 50%;
		height: 50%;
		border-radius: 8px;
		box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
		padding: 16px;
		z-index: 2;
		background-color: red;

		.controls {
			display: flex;
			flex-direction: row;
			gap: var(--spacing-sm);
			flex-wrap: wrap;
			align-items: center;
			justify-content: space-around;
		}

		.dice-box {
			flex: 1;
			border: 5px solid #29140e;
			background: #4d0000;
		}
	}
</style>
