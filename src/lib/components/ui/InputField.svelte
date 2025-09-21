<script lang="ts">
	type Props = {
		label?: string;
		value: number | string;
		max?: number;
		readonly?: boolean;
		onChange?: (value: number | string) => void;
		fullWidth?: boolean;
		placeholder?: string;
		textAlign?: 'left' | 'center';
		button?: {
			icon: string;
			onClick: () => void;
			title: string;
		};
	};

	let {
		label = undefined,
		value,
		max,
		readonly = false,
		onChange = () => {},
		button = undefined,
		fullWidth = false,
		placeholder = '',
		textAlign = 'center',
	}: Props = $props();

	let innerValue = $state(value);
</script>

<div class="fieldgroup" class:fullWidth>
	{#if label}
		<label>{label}</label>
	{/if}
	<span
		class="field"
		class:inputAlone={max === undefined && button === undefined && !fullWidth}
		class:fullWidth
	>
		<input
			type={typeof value === 'number' ? 'number' : 'text'}
			bind:value={innerValue}
			disabled={readonly}
			class:alone={max === undefined && button === undefined}
			class:fullWidth
			class={`text-align-${textAlign}`}
			{max}
			min={0}
			{placeholder}
			oninput={() => onChange(innerValue)}
		/>
		{#if max !== undefined}
			<span class="divider">/</span>
			<span class="max">{max}</span>
		{:else if button !== undefined && !fullWidth}
			<span class="spacer"> </span>
		{/if}
		{#if button}
			<button class="button" onclick={button.onClick} title={button.title}>
				{button.icon}
			</button>
		{/if}
	</span>
</div>

<style>
	.fieldgroup {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: var(--spacing-sm);

		label {
			width: 8rem;
			text-align: left;
		}

		.field {
			display: flex;
			align-items: center;
			justify-content: space-between;
			gap: var(--spacing-sm);
			border: 1px solid var(--border-color);
			border-radius: var(--radius-md);

			&.inputAlone {
				width: 8.2rem;
			}

			input {
				border: none;
				padding-left: var(--spacing-md);
				margin-right: 0rem;
				padding-right: 0rem;
				width: 3.1rem;

				&.text-align-center {
					text-align: center;
				}

				&.text-align-left {
					text-align: left;
				}

				&.fullWidth,
				&.alone {
					flex: 1;
					padding-right: var(--spacing-md);
				}

				&:disabled {
					background-color: var(--disabled-bg);
				}
			}

			.divider {
				width: 1rem;
				text-align: center;
			}

			.spacer {
				width: 1rem;
			}

			.max {
				padding-right: var(--spacing-md);
				width: 3.1rem;
				text-align: center;
			}

			button {
				border: none;
				width: 3.1rem;
				padding-right: var(--spacing-md);
			}
		}
	}

	.fullWidth {
		width: 100%;
	}
</style>
