<script lang="ts">
	import { clickOutsideDetector } from '$lib/utils/outside-click-detector';

	type Props = {
		summary: string;
		options: {
			label: string;
			value: any;
		}[];
		onChange: (values: any[]) => void;
	};

	let { summary, options, onChange }: Props = $props();

	let selectedOptions = $state(new Set<string>());

	const onCheckboxChange = (checked: boolean, value: string) => {
		if (checked) {
			selectedOptions.add(value);
		} else {
			selectedOptions.delete(value);
		}
		onChange(Array.from(selectedOptions));
	};

	let isOpened = $state(false);

	const onOutsideClick = () => {
		isOpened = false;
	};
</script>

<details use:clickOutsideDetector onoutsideclick={onOutsideClick} bind:open={isOpened}>
	<summary>{summary}</summary>
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
			padding: var(--spacing-md);
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
		padding-left: var(--spacing-md);
		padding-right: var(--spacing-md);
		margin-top: -4px;
		margin-left: -1px;
		z-index: 2;

		fieldset {
			border: 0;
			padding: 0;
			width: 100%;

			ul {
				list-style: none;
				margin: 0;
				padding: 0;
				overflow-y: auto;
				max-height: 100px;

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
		}
	}
</style>
