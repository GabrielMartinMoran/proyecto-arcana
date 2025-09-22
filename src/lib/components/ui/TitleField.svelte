<script lang="ts">
	type Props = {
		value: string;
		readonly: boolean;
		placeholder?: string;
		onChange: (value: string) => void;
	};

	let { value, readonly, placeholder = undefined, onChange }: Props = $props();

	let innerValue = $derived(value);
</script>

<input
	type="text"
	{placeholder}
	bind:value={innerValue}
	oninput={() => onChange(innerValue)}
	disabled={readonly}
/>

<style>
	input {
		border: none;
		border: 1px solid var(--border-color);
		padding: 0.5rem;
		font-size: 1.5rem;
		width: 100%;

		&:disabled {
			background-color: var(--disabled-bg);
		}
	}
</style>
