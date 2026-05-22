<script lang="ts">
	import { useDiceRollerService } from '$lib/services/dice-roller-service';
	import { parseInlineDiceFormulaParts } from '$lib/utils/inline-dice-formulas';

	type Props = { text: string; rollTitle: string };
	let { text, rollTitle }: Props = $props();

	let { rollExpression } = useDiceRollerService();
	let parts = $derived(parseInlineDiceFormulaParts(text));

	const rollInlineFormula = (expression: string) => {
		rollExpression({ expression, title: rollTitle });
	};
</script>

{#each parts as part, index (`${part.type}-${index}`)}
	{#if part.type === 'text'}
		{part.text}
	{:else}
		<button class="inline-roll" type="button" onclick={() => rollInlineFormula(part.expression)}>
			{part.display} 🎲
		</button>
	{/if}
{/each}

<style>
	.inline-roll {
		display: inline;
		margin: 0 0.125rem;
		padding: 0.1rem var(--spacing-xs);
		border: 1px solid var(--border-color);
		background: var(--secondary-bg);
		font: inherit;
		cursor: pointer;
	}
</style>
