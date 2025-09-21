<script lang="ts">
	type Option = {
		label: string;
		value: any;
	};

	type Props = {
		value: any;
		options: Option[];
		onChange?: (value: any) => void;
	};

	let { value, options, onChange = () => {} }: Props = $props();

	let innerValue = $state(value);
</script>

<div class="fieldgroup">
	<select bind:value={innerValue} onchange={() => onChange(innerValue)}>
		{#each options as option (option.label)}
			<option value={option.value}>{option.label}</option>
		{/each}
	</select>
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
	}
</style>
