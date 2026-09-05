<script lang="ts">
	import { useDiceRollerService } from '$lib/services/dice-roller-service';
	import type { CardRollContext } from '$lib/types/cards/card-roll-context';
	import {
		convertCardDescriptionLineBreaks,
		sanitizeCardDescriptionMarkdown,
		sanitizeCardDescriptionMarkdownInline,
	} from '$lib/utils/card-description-sanitizer';
	import type { CardInlineDiceFormulaPart } from '$lib/utils/card-inline-dice-formulas';
	import { parseCardInlineDiceFormulaParts } from '$lib/utils/card-inline-dice-formulas';
	import type { CardInlineDifficultyPart } from '$lib/utils/card-inline-difficulties';
	import { parseCardInlineDifficultyParts } from '$lib/utils/card-inline-difficulties';
	import InlineDifficulty from './InlineDifficulty.svelte';

	type Props = {
		description: string;
		rollContext?: CardRollContext;
	};

	type CardDescriptionPart =
		CardInlineDiceFormulaPart | Extract<CardInlineDifficultyPart, { type: 'difficulty' }>;

	type CardFormulaPart = Extract<CardInlineDiceFormulaPart, { type: 'formula' }>;

	let { description, rollContext = undefined }: Props = $props();

	let { rollExpression } = useDiceRollerService();

	const readOnlyPart: CardDescriptionPart = $derived({ type: 'text', text: description });

	/**
	 * Splits the description into inline render parts in source order:
	 * sanitized prose, real dice formula buttons and calculated difficulties.
	 * Difficulty spans are split first so the dice parser never sees an ND
	 * part and cannot turn it into a partial formula button.
	 */
	const buildParts = (text: string, variables: Record<string, number>): CardDescriptionPart[] => {
		const parts: CardDescriptionPart[] = [];

		for (const difficultyPart of parseCardInlineDifficultyParts(text, variables)) {
			if (difficultyPart.type === 'text') {
				parts.push(...parseCardInlineDiceFormulaParts(difficultyPart.text, variables));
			} else {
				parts.push(difficultyPart);
			}
		}

		return parts;
	};

	const parts = $derived(
		rollContext ? buildParts(description, rollContext.variables) : [readOnlyPart],
	);

	const rollFormula = (part: CardFormulaPart) => {
		if (!rollContext) return;

		rollExpression({
			expression: part.expression,
			variables: rollContext.variables,
			title: selectFormulaTitle(part.display),
		});
	};

	/**
	 * Presentation-only transform for the button label: replaces the `e`/`E`
	 * explosive suffix with 💥 only when it directly follows an explicit dice
	 * token. The roll payload keeps `part.expression` untouched, so prose and
	 * plain damage dice never change.
	 */
	const EXPLOSIVE_DICE_SUFFIX_PATTERN = /\b(\d+[dD]\d+)[eE]\b/g;
	const EXPLOSIVE_DICE_SUFFIX_TEST_PATTERN = new RegExp(EXPLOSIVE_DICE_SUFFIX_PATTERN.source);

	const isExplosiveDiceDisplay = (display: string): boolean =>
		EXPLOSIVE_DICE_SUFFIX_TEST_PATTERN.test(display);

	const toExplosiveDisplay = (display: string): string =>
		display.replace(EXPLOSIVE_DICE_SUFFIX_PATTERN, '$1💥');

	// Routes the roll title: explicit explosive dice attacks use the optional
	// attack title when provided; every other formula keeps the default title.
	const selectFormulaTitle = (display: string): string => {
		if (!rollContext) return '';
		if (!isExplosiveDiceDisplay(display)) return rollContext.title;
		return rollContext.attackTitle ?? rollContext.title;
	};

	/**
	 * Text conversion strategies, in render order: sanitize the Markdown prose
	 * to safe HTML, then map its line breaks to spacer spans. Additional
	 * strategies for future rendering needs slot in here.
	 */
	const renderTextPart = (text: string): string => {
		const sanitized = rollContext
			? sanitizeCardDescriptionMarkdownInline(text)
			: sanitizeCardDescriptionMarkdown(text);

		return convertCardDescriptionLineBreaks(sanitized);
	};
</script>

<div class="card-description">
	{#each parts as part, index (index)}
		{#if part.type === 'text'}
			{@html renderTextPart(part.text)}
		{:else if part.type === 'formula'}
			<button class="inline-roll" type="button" onclick={() => rollFormula(part)}>
				{toExplosiveDisplay(part.display)} 🎲
			</button>
		{:else}
			<InlineDifficulty difficulty={part} />
		{/if}
	{/each}
</div>

<style>
	.card-description {
		flex-grow: 1;
		margin: 0;
		text-shadow:
			-2px 0 #ded1b599,
			0 2px #ded1b599,
			0 -2px #ded1b599,
			1px 1px #ded1b599,
			-1px -1px #ded1b599,
			1px -1px #ded1b599,
			-1px 1px #ded1b599;
		height: 100px;
		overflow-y: auto;
		scrollbar-width: thin;
		scrollbar-color: #888 transparent;
		color: black;

		& :global(p) {
			margin: 0;
		}

		& :global(.line-break) {
			display: block;
			height: var(--spacing-xs);
		}
		& :global(.line-jump) {
			display: block;
			height: var(--spacing-sm);
		}
		.inline-roll {
			display: inline;
			margin: 0 0.125rem;
			padding: 0.1rem var(--spacing-xs);
			border: 1px solid var(--border-color);
			background: var(--secondary-bg);
			font: inherit;
			cursor: pointer;
		}
	}
</style>
