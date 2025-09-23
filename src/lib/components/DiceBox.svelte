<script lang="ts">
	import { useDiceRollerService } from '$lib/services/dice-roller-service';
	import DiceBox from '@3d-dice/dice-box';
	import { onMount } from 'svelte';
	import { CONFIG } from '../../config';

	type Props = {
		isMobile: boolean;
	};

	let { isMobile }: Props = $props();

	let { rollExpression, register3DDiceRollerFn, registerClear3DDicesFn } = useDiceRollerService();

	let diceBox: DiceBox = $state();

	onMount(async () => {
		const element = document.getElementById('dice-box');
		if (element) {
			diceBox = new DiceBox({
				assetPath: '/assets/dice-box/',
				container: '#dice-box',
				scale: 4,
				preloadThemes: ['default-extras'],
				themeColor: '#000000',
				lightIntensity: 1,
			});
			await diceBox.init();
			register3DDiceRollerFn((expression: string) => diceBox.add(expression));
			registerClear3DDicesFn(() => diceBox.clear());
		}
	});
</script>

<div class="dice-box-container" class:isMobile>
	<div class="controls">
		{#if diceBox !== undefined}
			<button onclick={() => rollExpression('1d2e', {})} class="dice-button">1d2e</button>
			{#each CONFIG.STANDARD_DICES as dice (dice)}
				<button onclick={() => rollExpression(`4${dice}e`, {})} class="dice-button"
					>{`4${dice}e`}</button
				>
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
		box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
		padding: 16px;
		z-index: 2;
		/*background-color: red;*/
		width: calc(100% - var(--side-bar-width));
		height: 100%;
		margin-left: var(--side-bar-width);
		pointer-events: none;

		&.isMobile {
			width: 100%;
			height: calc(100% - var(--top-bar-height));
			margin-top: var(--top-bar-height);
			border-radius: 0;
			box-shadow: none;
			padding: 0;
			margin-left: 0;
		}

		.controls {
			display: flex;
			flex-direction: row;
			gap: var(--spacing-sm);
			flex-wrap: wrap;
			align-items: center;
			justify-content: space-around;

			.dice-button {
				pointer-events: all;
			}
		}

		.dice-box {
			width: 100%;
			height: 100%;

			:global(canvas) {
				width: 100%;
				height: 100%;
			}
		}
	}
</style>
