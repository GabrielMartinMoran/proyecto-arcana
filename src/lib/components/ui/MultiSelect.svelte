<script lang="ts">
	import { clickOutsideDetector } from '$lib/utils/outside-click-detector';

	type Option = {
		label: string;
		value: any;
	};

	type Group = {
		group: string;
		options: Option[];
	};

	type Props = {
		summary: string;
		value: any[];
		options: Option[] | Group[];
		onChange: (values: any[]) => void;
	};

	let { summary, options, onChange, value }: Props = $props();

	let selectedCount = $derived(value.length);

	const isGrouped = (opts: Option[] | Group[]): opts is Group[] => {
		return opts.length > 0 && 'group' in opts[0];
	};

	const isSelected = (optionValue: any) => value.includes(optionValue);

	const onCheckboxChange = (checked: boolean, optionValue: any) => {
		if (checked) {
			if (!isSelected(optionValue)) {
				onChange([...value, optionValue]);
			}
			return;
		}

		onChange(value.filter((selectedValue) => selectedValue !== optionValue));
	};

	let isOpened = $state(false);

	const onOutsideClick = () => {
		isOpened = false;
	};

	const clearAll = () => {
		onChange([]);
	};
</script>

{#snippet optionRow(option: Option)}
	<li>
		<label
			>{option.label}
			<input
				type="checkbox"
				name={option.value}
				value={option.value}
				bind:checked={
					() => isSelected(option.value), (checked) => onCheckboxChange(checked, option.value)
				}
			/></label
		>
	</li>
{/snippet}

<div class="multi-select" use:clickOutsideDetector={{ onOutsideClick }}>
	<button
		type="button"
		class="summary"
		aria-expanded={isOpened}
		onclick={() => (isOpened = !isOpened)}>{summary} ({selectedCount})</button
	>
	{#if isOpened}
		<form>
			<fieldset>
				<ul>
					{#if isGrouped(options)}
						{#each options as group (group.group)}
							<li class="group-header">{group.group}</li>
							{#each group.options as option (option.value)}
								{@render optionRow(option)}
							{/each}
						{/each}
					{:else}
						{#each options as option (option.value)}
							{@render optionRow(option)}
						{/each}
					{/if}
				</ul>
				<button type="button" onclick={clearAll} class="clear-btn" disabled={selectedCount === 0}>
					Limpiar
				</button>
			</fieldset>
		</form>
	{/if}
</div>

<style>
	.multi-select {
		position: relative;
		border: 1px solid var(--border-color);
		border-radius: var(--radius-md);
		display: inline-flex;
		flex-direction: column;
		cursor: pointer;
		width: 200px;

		.summary {
			display: flex;
			flex-direction: row;
			justify-content: space-between;
			align-items: center;
			padding: var(--spacing-sm);
			border: 0;
			background: transparent;
			cursor: pointer;
			width: 100%;
		}
	}

	.summary::after {
		content: '\25BC' / '';
		display: inline-block;
		font-size: 0.6rem;
		height: 1rem;
		line-height: 1rem;
		margin-left: 0.5rem;
		position: relative;
		transition: transform 0.25s;
	}

	.summary[aria-expanded='true']::after {
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

				.group-header {
					font-weight: bold;
					cursor: default;
					padding: 4px 2px;
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
