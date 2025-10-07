<script lang="ts">
	import type { Card } from '$lib/types/cards/card';
	import type { ItemCard } from '$lib/types/cards/item-card';
	import { removeDiacritics } from '$lib/utils/formatting';
	import { marked } from 'marked';
	import type { Snippet } from 'svelte';

	type Props = {
		card: Card;
		children?: Snippet;
	};

	let { card, children = undefined }: Props = $props();

	const getBorderColor = (tags: string[]) => {
		let first = removeDiacritics(tags.length > 0 ? String(tags[0]).toLowerCase() : '');

		switch (first) {
			case 'arcanista':
				return 'var(--accent-arcanista)';
			case 'combatiente':
				return 'var(--accent-combatiente)';
			case 'picaro':
				return 'var(--accent-picaro)';
			case 'druida':
				return 'var(--accent-druida)';
			case 'sacerdote':
				return 'var(--accent-sacerdote)';
			case 'bardo':
				return 'var(--accent-bardo)';
			case 'dote':
				return 'var(--accent-dote)';
			case 'linaje':
				return 'var(--accent-linaje)';
			default:
				return 'var(--accent-default)';
		}
	};
</script>

<div class="card" style:border-color={getBorderColor(card.tags)}>
	<div class="bg" style:background-image={`url(${card.img})`}></div>
	<div class="inner">
		<div class="header">
			<div class="chips">
				<span class="chip">{card.cardType === 'ability' ? 'Habilidad' : 'Objeto Mágico'}</span>
				<span class="chip">Nivel {card.level}</span>
				<span class="spacer"></span>
				<span class="chip">{card.type.charAt(0).toUpperCase() + card.type.slice(1)}</span>
			</div>
			<h3>{card.name}</h3>
		</div>
		<div class="body">
			<span class="description">
				{@html marked.parse(card.description)}
			</span>
			<div class="tags">
				{#each card.tags as tag (tag)}
					<span class="chip">{tag}</span>
				{/each}
				{#if card.uses.type}
					{#if card.uses.type === 'LONG_REST'}
						<span class="chip">Usos: {card.uses.qty ?? '?'} por día de descanso</span>
					{:else if card.uses.type === 'RELOAD'}
						<span class="chip">Usos: 1 (Recarga {card.uses.qty ?? '?'}+)</span>
					{:else if card.uses.type === 'USES'}
						<span class="chip">Usos: {card.uses.qty ?? '?'}</span>
					{/if}
				{/if}
				{#if card.cardType === 'item'}
					<span class="chip">Costo: {(card as ItemCard).cost} de oro</span>
				{/if}
			</div>
		</div>
		<div class="footer">
			<span class="requirements">REQUERIMIENTOS</span>
			<div class="requirements-list">
				<span>{card.requirements.length > 0 ? card.requirements.join(', ') : '—'}</span>
			</div>
			{#if children !== undefined}
				<div class="controls">
					{@render children()}
				</div>
			{/if}
		</div>
	</div>
</div>

<style>
	.card {
		position: relative;
		display: flex;
		width: 310px;
		height: 450px;
		border-radius: var(--radius-md);
		border: 1px solid;
		padding: var(--spacing-sm);
		box-shadow: var(--shadow-sm);
		transition:
			transform 0.2s ease,
			box-shadow 0.2s ease,
			border-color 0.2s ease;
		overflow: hidden;

		&:hover {
			transform: scale(1.01);
			border: 2px solid;
			box-shadow: var(--shadow-lg);
		}

		.bg {
			position: absolute;
			top: 0;
			left: 0;
			width: 100%;
			height: 100%;
			background-position: 50% 25%;
			background-size: 180%;
			opacity: 0.5;
			z-index: 1;
		}

		.inner {
			flex-grow: 1;
			display: flex;
			flex-direction: column;
			align-items: center;
			justify-content: center;
			z-index: 2;

			.header {
				display: flex;
				flex-direction: column;
				justify-content: space-between;
				width: 100%;

				.chips {
					display: flex;
					flex-direction: row;
					align-items: center;
					justify-content: space-between;
					gap: var(--spacing-sm);
					width: 100%;
					padding-top: var(--spacing-xs);
				}

				h3 {
					padding: var(--spacing-sm);
					padding-top: var(--spacing-md);
					margin: 0;
				}
			}

			.body {
				flex: 1;
				display: flex;
				flex-direction: column;
				justify-content: start;
				padding: var(--spacing-sm);
				font-size: 0.8rem;

				.description {
					flex-grow: 1;
					margin: 0;
					text-shadow: 1px 1px 1px #ded1b5;
					mix-blend-mode: saturation;
					height: 100px;
					overflow-y: auto;
					scrollbar-width: thin;
					scrollbar-color: #888 transparent;

					:global(p) {
						margin: 0;
					}
				}

				.tags {
					display: flex;
					flex-direction: row;
					align-items: center;
					justify-content: start;
					gap: var(--spacing-sm);
					width: 100%;
					flex-wrap: wrap;
					margin-top: var(--spacing-sm);
				}
			}

			.footer {
				display: flex;
				flex-direction: column;
				align-items: start;
				justify-content: center;
				width: 100%;
				border-top: 1px solid black;
				padding: var(--spacing-sm);
				padding-bottom: 0;
				margin-bottom: 0;

				.requirements {
					font-size: 0.8rem;
					color: var(--text-secondary);
					letter-spacing: 0.08em;
				}

				.requirements-list {
					padding-left: var(--spacing-xs);
					padding-right: var(--spacing-xs);
					font-size: 0.8rem;
				}

				.controls {
					display: flex;
					flex-direction: row;
					align-items: center;
					justify-content: space-between;
					gap: var(--spacing-sm);
					width: 100%;

					.spacer {
						/* Used by the children */
						flex-grow: 1;
					}
				}
			}
		}
	}

	.chip {
		display: flex;
		flex-direction: row;
		align-items: center;
		justify-content: center;
		border-radius: 999px;
		border: 1px solid black;
		background-color: #ded1b5;
		padding: 0.25rem 0.5rem;
		font-size: 0.8rem;
	}

	.spacer {
		flex: 1;
	}
</style>
