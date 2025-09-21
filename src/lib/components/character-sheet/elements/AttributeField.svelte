<script lang="ts">
	import InputField from '$lib/components/ui/InputField.svelte';

	type Props = {
		name: string;
		value: number;
		readonly: boolean;
		onDiceRoll: () => void;
		onChange: (value: number) => void;
	};

	let { name, value, readonly, onDiceRoll, onChange }: Props = $props();
</script>

<InputField
	label={name}
	{value}
	{readonly}
	onChange={(value) => onChange(Number(value))}
	button={{
		icon: '🎲',
		onClick: onDiceRoll,
		title: 'Tirar',
	}}
/>
