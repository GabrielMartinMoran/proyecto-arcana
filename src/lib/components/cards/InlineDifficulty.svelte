<script lang="ts">
	import type { CardInlineDifficultyPart } from '$lib/utils/card-inline-difficulties';

	type DifficultyPart = Extract<CardInlineDifficultyPart, { type: 'difficulty' }>;

	type Props = {
		difficulty: DifficultyPart;
	};

	let { difficulty }: Props = $props();

	const helpTitle = $derived(difficulty.display);
	const accessibleDescription = $derived(
		`Dificultad ND ${difficulty.result}, calculada a partir de: ${difficulty.display}`,
	);
</script>

<span class="inline-difficulty" title={helpTitle}>
	<span class="inline-difficulty__formula" aria-hidden="true">{difficulty.display}</span>
	<span class="inline-difficulty__separator" aria-hidden="true">·</span>
	<span>ND {difficulty.result}</span>
	<span class="inline-difficulty__description">{accessibleDescription}</span>
</span>

<style>
	.inline-difficulty {
		display: inline;
		padding: 0.02rem 0.03rem;
		border: 1px solid var(--border-color);
		border-radius: var(--radius-md);
		background: var(--secondary-bg);
		color: var(--text-primary);
		font: inherit;
		cursor: help;
	}

	.inline-difficulty__formula {
		display: inline;
		color: var(--text-secondary);
	}

	.inline-difficulty__separator {
		display: inline;
		color: var(--text-secondary);
	}

	.inline-difficulty__description {
		position: absolute;
		width: 1px;
		height: 1px;
		padding: 0;
		margin: -1px;
		overflow: hidden;
		clip: rect(0 0 0 0);
		white-space: nowrap;
		border: 0;
	}

	@media (hover: hover) and (pointer: fine) {
		.inline-difficulty__formula,
		.inline-difficulty__separator {
			display: none;
		}
	}
</style>
