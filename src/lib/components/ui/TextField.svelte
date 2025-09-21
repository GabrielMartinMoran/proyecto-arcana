<script lang="ts">
	const ROWS = 6;

	type Props = {
		label: string;
		value: string;
		readonly: boolean;
		placeholder?: string;
		onChange: (value: string) => void;
	};

	let { label, value, readonly, placeholder = '', onChange }: Props = $props();

	let innerValue = $state(value);
</script>

<div class="fieldgroup">
	<label>{label}</label>
	<span class="field">
		<textarea
			bind:value={innerValue}
			disabled={readonly}
			{placeholder}
			oninput={() => onChange(innerValue)}
			rows={ROWS}
		/>
	</span>
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
				resize: vertical;
				padding: var(--spacing-md);
			}
		}
	}
</style>
