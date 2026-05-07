<script lang="ts">
	type Option = {
		label: string;
		value: any;
	};

	type Props = {
		value: any;
		options: Option[];
		onChange?: (value: any) => void;
		width?: 'normal' | 'large' | 'full';
	};

	let { value, options, onChange = () => {}, width = 'normal' }: Props = $props();

	let innerValue = $derived(value);
</script>

<div
	class="fieldgroup"
	class:width-normal={width === 'normal'}
	class:width-large={width === 'large'}
	class:width-full={width === 'full'}
>
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

		&.width-normal {
			width: var(--input-width-normal);
		}

		&.width-large {
			width: var(--input-width-large);
		}

		&.width-full {
			width: 100%;
			flex: 1;
		}
	}
</style>
