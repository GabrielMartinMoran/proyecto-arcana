<script lang="ts">
	import { useDiceRollerService } from '$lib/services/dice-roller-service';
	import DiceBox from '@3d-dice/dice-box';
	import { onMount } from 'svelte';

	type Props = {
		isMobile: boolean;
	};

	let { isMobile }: Props = $props();

	let { register3DDiceRollerFn, registerClear3DDicesFn } = useDiceRollerService();

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
		z-index: 1001;
		/*background-color: red;*/
		width: calc(100% - var(--side-bar-width) - var(--dice-panel-width));
		height: 100%;
		margin-left: var(--side-bar-width);
		margin-right: var(--dice-panel-width);
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
