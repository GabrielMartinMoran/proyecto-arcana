<script lang="ts">
	const DEFAULT_ROWS = 6;

	type Props = {
		label?: string;
		value: string;
		readonly: boolean;
		placeholder?: string;
		maxRows?: number | 'unlimited';
		autoResize?: boolean;
		onChange: (value: string) => void;
	};

	let {
		label = undefined,
		value,
		readonly,
		placeholder = '',
		maxRows = DEFAULT_ROWS,
		autoResize = false,
		onChange,
	}: Props = $props();

	let innerValue = $derived(value);
</script>

<div class="fieldgroup" class:expanded={maxRows === 'unlimited'}>
	{#if label}
		<label>{label}</label>
	{/if}
	<div class="field" class:expanded={maxRows === 'unlimited'}>
		<textarea
			bind:value={innerValue}
			disabled={readonly}
			{placeholder}
			oninput={() => onChange(innerValue)}
			rows={maxRows === 'unlimited' ? undefined : maxRows}
			class:expanded={maxRows === 'unlimited'}
			class:auto-resize={autoResize}
		/>
	</div>
</div>

<style>
	.fieldgroup {
		display: flex;
		flex-direction: column;
		gap: var(--spacing-sm);
		width: 100%;

		.field {
			display: flex;
			width: 100%;

			textarea {
				width: 100%;
				border: none;
				border: 1px solid var(--border-color);
				border-radius: var(--radius-md);
				resize: none;
				padding: var(--spacing-md);
			}
		}
	}

	.expanded {
		flex-grow: 1;
	}

	textarea.auto-resize {
		field-sizing: content;
		min-height: 3rem;
	}
</style>
