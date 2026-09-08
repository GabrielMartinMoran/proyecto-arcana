<script lang="ts">
	import type { Card } from '$lib/types/cards/card';
	import type { CardRollContext } from '$lib/types/cards/card-roll-context';
	import type { ItemCard } from '$lib/types/cards/item-card';
	import { getCardTypeName } from '$lib/utils/card-utils';
	import { capitalize, removeDiacritics } from '$lib/utils/formatting';
	import { formatRequirements } from '$lib/utils/requirement-expression';
	import type { Snippet } from 'svelte';
	import CardDescription from './CardDescription.svelte';

	type Props = {
		card: Card;
		isOvercharged?: boolean;
		isExhausted?: boolean;
		isCustom?: boolean;
		rollContext?: CardRollContext;
		// Linked-card presentation. Absent values keep the default card render
		// (library and custom previews); CardsList provides them from the
		// character state using the pure association helpers.
		linkedParentName?: string | null;
		linkedParentInactive?: boolean;
		linkedParentOrphan?: boolean;
		showSlotExemption?: boolean;
		children?: Snippet;
	};

	let {
		card,
		isOvercharged = false,
		isExhausted = false,
		isCustom = false,
		rollContext = undefined,
		linkedParentName = undefined,
		linkedParentInactive = false,
		linkedParentOrphan = false,
		showSlotExemption = false,
		children = undefined,
	}: Props = $props();

	const composeLinkBadgeLabel = (
		parentName: string,
		parentInactive: boolean,
		parentOrphan: boolean,
		slotExemption: boolean,
	): string => {
		if (slotExemption)
			return `Carta vinculada a ${parentName}. No consume una Ranura de Carta Activa`;
		if (parentInactive) return `Carta vinculada a ${parentName}. Origen inactivo`;
		if (parentOrphan) return `Carta vinculada a ${parentName}. Vinculación pendiente`;
		return `Carta vinculada a ${parentName}`;
	};

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

<div
	class="card"
	class:overcharged={isOvercharged}
	class:exhausted={isExhausted && !isOvercharged}
	style:border-color={getBorderColor(card.tags)}
>
	<div class="bg" style:background-image={`url(${card.img})`}></div>
	<div class="inner">
		<div class="header">
			<div class="chips">
				<span class="chip">{getCardTypeName(card)}</span>
				<span class="chip">Nivel {card.level}</span>
				<span class="spacer"></span>
				<span class="chip">{capitalize(card.type)}</span>
			</div>
			<h3>{card.name}</h3>
		</div>
		<div class="body">
			<CardDescription description={card.description} {rollContext} />
			<div class="tags">
				{#each card.tags as tag (tag)}
					<span class="chip">{tag}</span>
				{/each}
				{#if card.uses.type}
					{#if card.uses.type === 'LONG_REST'}
						<span class="chip">Usos: {card.uses.qty ?? '?'} por día de descanso</span>
					{:else if card.uses.type === 'DAY'}
						<span class="chip">Usos: {card.uses.qty ?? '?'} por día</span>
					{:else if card.uses.type === 'RELOAD'}
						<span class="chip">Usos: 1 (Recarga {card.uses.qty ?? '?'}+)</span>
					{:else if card.uses.type === 'USES'}
						<span class="chip">Usos: {card.uses.qty ?? '?'}</span>
					{/if}
				{/if}
				{#if card.cardType === 'item'}
					<span class="chip">Costo: {(card as ItemCard).cost} de oro</span>
				{/if}
				{#if isCustom}
					<span class="chip custom-badge">Personalizada</span>
				{/if}
				{#if linkedParentName !== undefined}
					{#if linkedParentName !== null}
						<span
							class="chip link-badge"
							aria-label={composeLinkBadgeLabel(
								linkedParentName,
								linkedParentInactive,
								linkedParentOrphan,
								showSlotExemption,
							)}>🔗 {linkedParentName}</span
						>
					{:else}
						<span
							class="chip link-badge"
							aria-label="Vinculación pendiente. El vínculo no está vigente"
							>🔗 Vinculación pendiente</span
						>
					{/if}
					{#if linkedParentOrphan && linkedParentName !== null}
						<span class="chip link-status-badge">Vinculación pendiente</span>
					{/if}
					{#if linkedParentInactive}
						<span class="chip link-status-badge">Origen inactivo</span>
					{/if}
					{#if showSlotExemption}
						<span class="chip link-always-active-badge">Activación gratuita</span>
					{/if}
				{/if}
			</div>
		</div>
		<div class="footer">
			<span class="requirements">REQUERIMIENTOS</span>
			<div class="requirements-list">
				<span>{formatRequirements(card.requirements)}</span>
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
		box-sizing: border-box;
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
			border-color 0.2s ease,
			background-color 0.5s ease;
		overflow: hidden;

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

		&:hover {
			transform: scale(1.01);

			box-shadow: var(--shadow-lg);
			background-color: #ffffff;
			color: black;

			.bg {
				opacity: 0.35;
				transition: 0.2s;
			}

			.description {
				text-shadow: 5px 5px 5px #aaaabb;
				transition: 0.2s;
			}
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
					padding-bottom: var(--spacing-xs);
					margin: 0;
				}
			}

			.body {
				flex: 1;
				display: flex;
				flex-direction: column;
				justify-content: start;
				padding: var(--spacing-sm);
				padding-top: var(--spacing-xs);
				font-size: 0.8rem;
				width: 100%;

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
					min-width: 0;
				}
			}
		}
	}

	.chip {
		display: flex;
		box-sizing: border-box;
		flex-direction: row;
		align-items: center;
		justify-content: center;
		border-radius: 999px;
		border: 1px solid black;
		background-color: #ded1b5;
		padding: 0.2rem 0.4rem;
		font-size: 0.8rem;
	}

	.custom-badge {
		background-color: var(--custom-card-badge-bg);
	}

	.link-status-badge,
	.link-badge {
		background-color: var(--linked-card-badge-bg);
	}

	.link-always-active-badge {
		background-color: var(--card-always-active-badge-bg);
	}

	.spacer {
		flex: 1;
	}

	/*.card.overcharged::before {
		content: '';
		position: absolute;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		background-color: var(--overcharge-overlay);
		z-index: 3;
		pointer-events: none;
	}

	.card.overcharged .description {
		color: var(--overcharge-text);
	}*/

	.card::before {
		transition: background-color 0.5s ease;
	}

	.card.overcharged::before {
		content: '';
		position: absolute;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		background-color: var(--overcharge-overlay);
		z-index: 3;
		pointer-events: none;
	}

	.card.overcharged .description {
		color: var(--overcharge-text);
	}

	.card.exhausted {
		background-color: var(--exhausted-overlay);
	}
</style>
