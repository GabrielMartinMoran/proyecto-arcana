<script lang="ts">
	type Props = {
		label?: string;
		labelWidth?: 'normalized' | 'fit';
		value: number | string;
		max?: number;
		readonly?: boolean;
		onChange?: (value: number | string) => void;
		placeholder?: string;
		textAlign?: 'left' | 'center';
		width?: 'small' | 'normal' | 'large' | 'full';
		button?: {
			icon: string;
			onClick: () => void;
			title: string;
			disabled?: boolean;
		};
	};

	let {
		label = undefined,
		labelWidth = 'normalized',
		value,
		max,
		readonly = false,
		onChange = () => {},
		button = undefined,
		placeholder = '',
		textAlign = 'center',
		width = 'normal',
	}: Props = $props();

	let innerValue = $derived(value);
</script>

<div class="fieldgroup" class:width-full={width === 'full'}>
	{#if label}
		<label class={labelWidth}>{label}</label>
	{/if}
	<span
		class="field"
		class:width-small={width === 'small'}
		class:width-large={width === 'large'}
		class:inputAlone={max === undefined && button === undefined && width !== 'full'}
		class:inputWithButton={button !== undefined}
		class:width-full={width === 'full'}
		class:readonly
	>
		<input
			type={typeof value === 'number' ? 'number' : 'text'}
			bind:value={innerValue}
			disabled={readonly}
			class:alone={max === undefined && button === undefined}
			class:withButton={button !== undefined}
			class:withButtonAndMax={max !== undefined && button !== undefined}
			class={`text-align-${textAlign}`}
			{max}
			min={0}
			{placeholder}
			oninput={() => {
				if (max !== undefined && typeof innerValue === 'number') {
					innerValue = Math.min(innerValue, max);
				}
				onChange(innerValue);
			}}
		/>
		{#if max !== undefined}
			<span class="divider">/</span>
			<span class="max" class:withButton={button !== undefined}>{max}</span>
		{/if}
		{#if button}
			<button
				class="button"
				onclick={button.onClick}
				title={button.title}
				disabled={button.disabled}
			>
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
		gap: var(--spacing-md);

		label {
			text-align: left;

			&.normalized {
				width: 7rem;
			}

			&.fit {
				width: fit-content;
			}
		}

		.field {
			position: relative;
			display: flex;
			align-items: center;
			justify-content: space-between;
			gap: var(--spacing-sm);
			border: 1px solid var(--border-color);
			border-radius: var(--radius-md);
			min-width: var(--input-width-normal);
			width: var(--input-width-normal);
			background-color: var(--secondary-bg);

			&.readonly {
				background-color: var(--disabled-bg);
			}

			&.inputAlone {
				width: var(--input-width-normal);
			}

			&.width-small {
				min-width: var(--input-width-small);
				width: var(--input-width-small);
			}

			&.width-large {
				min-width: var(--input-width-large);
				width: var(--input-width-large);
			}

			&.inputWithButton {
				gap: 0;
			}

			input {
				position: relative;
				border: none;
				padding-left: var(--spacing-md);
				margin-right: 0rem;
				padding-right: 0rem;
				flex: 1;

				&[type='number']::-webkit-outer-spin-button,
				&[type='number']::-webkit-inner-spin-button {
					display: none;
				}

				&.text-align-center {
					text-align: center;
				}

				&.text-align-left {
					text-align: left;
				}

				&.alone {
					padding-right: var(--spacing-md);
					text-align: center;
				}

				&.withButton {
					flex: 1;
					text-align: center;
					padding-right: var(--spacing-md);
					margin-right: var(--spacing-md);
					margin-left: var(--spacing-md);
				}

				&.withButtonAndMax {
					padding-right: 0;
					margin-right: 0;
					margin-left: 0;
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

				&.withButton {
					padding-right: 3.5rem;
					padding-left: var(--spacing-sm);
				}
			}

			button {
				position: absolute;
				border: none;
				width: 2rem;
				right: var(--spacing-xs);
				background: transparent;
				padding: 0;
			}
		}
	}

	.width-full {
		width: 100% !important;
		flex: 1;
	}
</style>
