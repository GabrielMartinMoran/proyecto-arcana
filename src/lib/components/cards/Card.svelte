<script lang="ts">
	import type { Card } from '$lib/types/card';
	import { removeDiacritics } from '$lib/utils/formatting';
	import { marked } from 'marked';

	type Props = {
		card: Card;
	};

	let { card }: Props = $props();

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
	<div class="header">
		<div class="chips">
			<span class="chip">Nivel {card.level}</span>
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
		</div>
	</div>
	<div class="footer">
		<span class="requirements">REQUERIMIENTOS</span>
		<div class="requirements-list">
			<span>{card.requirements.length > 0 ? card.requirements.join(', ') : '-'}</span>
		</div>
	</div>
</div>

<style>
	.card {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		width: 350px;
		min-height: 400px;
		border-radius: var(--radius-md);
		border: 1px solid;
		padding: var(--spacing-md);
		background-color: var(--secondary-bg);
		box-shadow: var(--shadow-sm);
		transition:
			transform 0.2s ease,
			box-shadow 0.2s ease,
			border-color 0.2s ease;

		&:hover {
			transform: translateY(-5px);
			border: 2px solid;
			box-shadow: var(--shadow-md);
		}

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
			}

			h3 {
				padding: var(--spacing-sm);
				margin: 0;
			}
		}

		.body {
			flex: 1;
			display: flex;
			flex-direction: column;
			align-items: center;
			justify-content: start;
			padding: var(--spacing-sm);

			.description {
				flex-grow: 1;
				margin: 0;

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
			}
		}

		.footer {
			display: flex;
			flex-direction: column;
			align-items: start;
			justify-content: center;
			width: 100%;
			border-top: 1px dashed var(--border-color);
			padding: var(--spacing-sm);
			padding-bottom: 0;

			.requirements {
				font-size: 0.8rem;
				color: var(--text-secondary);
				text-transform: uppercase;
				letter-spacing: 0.08em;
			}

			.requirements-list {
				padding-left: var(--spacing-xs);
				padding-right: var(--spacing-xs);
			}
		}
	}

	.chip {
		display: flex;
		flex-direction: row;
		align-items: center;
		justify-content: center;
		border-radius: 999px;
		border: 1px solid var(--border-color);
		padding: 0.25rem 0.5rem;
		font-size: 0.8rem;
	}
</style>
