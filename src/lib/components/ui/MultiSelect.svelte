<script lang="ts">
	import { clickOutsideDetector } from '$lib/utils/outside-click-detector';
	import { SvelteSet } from 'svelte/reactivity';

	type Props = {
		summary: string;
		value: any[];
		options: {
			label: string;
			value: any;
		}[];
		onChange: (values: any[]) => void;
	};

	let { summary, options, onChange, value }: Props = $props();

	let selectedOptions = $derived(new SvelteSet(value));

	const onCheckboxChange = (checked: boolean, value: string) => {
		if (checked) {
			selectedOptions.add(value);
		} else {
			selectedOptions.delete(value);
		}
		selectedOptions = new SvelteSet(selectedOptions);
		onChange(Array.from(selectedOptions));
	};

	let isOpened = $state(false);

	const onOutsideClick = () => {
		isOpened = false;
	};

	const clearAll = () => {
		selectedOptions = new SvelteSet();
		onChange(Array.from(selectedOptions));
	};
</script>

<details use:clickOutsideDetector onoutsideclick={onOutsideClick} bind:open={isOpened}>
	<summary>{summary} ({selectedOptions.size})</summary>
	<form>
		<fieldset>
			<ul>
				{#each options as option (option.value)}
					<li>
						<label for={option.value}
							>{option.label}
							<input
								type="checkbox"
								id={option.value}
								name={option.value}
								value={option.value}
								checked={selectedOptions.has(option.value)}
								oninput={(event: Event) =>
									onCheckboxChange((event.target as HTMLInputElement).checked, option.value)}
							/></label
						>
					</li>
				{/each}
			</ul>
			<button onclick={clearAll} class="clear-btn" disabled={selectedOptions.size === 0}>
				Limpiar
			</button>
		</fieldset>
	</form>
</details>

<style>
	details {
		position: relative;
		border: 1px solid var(--border-color);
		border-radius: var(--radius-md);
		display: inline-flex;
		flex-direction: column;
		cursor: pointer;
		width: 200px;

		summary {
			display: flex;
			flex-direction: row;
			justify-content: space-between;
			align-items: center;
			padding: var(--spacing-sm);
		}
	}

	details summary::marker {
		display: none;
		font-size: 0;
	}

	details summary::-webkit-details-marker {
		display: none;
		font-size: 0;
	}

	details summary::after {
		content: '\25BC' / '';
		display: inline-block;
		font-size: 0.6rem;
		height: 1rem;
		line-height: 1rem;
		margin-left: 0.5rem;
		position: relative;
		transition: transform 0.25s;
	}

	details[open] summary::after {
		top: -0.15rem;
		transform: rotate(180deg);
	}

	form {
		position: absolute;
		top: 100%;
		left: 0;
		box-sizing: border-box;
		display: flex;
		background-color: var(--secondary-bg);
		border: 1px solid var(--border-color);
		border-radius: 0 0 var(--radius-md) var(--radius-md);
		border-top: 0;
		width: calc(100% + 2px);
		padding-left: var(--spacing-sm);
		padding-right: var(--spacing-sm);
		margin-top: -4px;
		margin-left: -1px;
		padding-top: var(--spacing-sm);
		padding-bottom: var(--spacing-sm);
		z-index: 3;

		fieldset {
			border: 0;
			padding: 0;
			width: 100%;

			ul {
				list-style: none;
				margin: 0;
				padding: 0;
				overflow-y: auto;
				max-height: 200px;

				li {
					border-radius: var(--border-radius);
					margin: 0;
					padding: 4px 2px;

					label {
						display: flex;
						flex-grow: 1;
						justify-content: space-between;
						cursor: pointer;
					}

					input {
						cursor: pointer;
					}
				}
			}

			.clear-btn {
				margin-top: var(--spacing-sm);
				padding: 0;
				width: 100%;
			}
		}
	}
</style>
