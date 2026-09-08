<script lang="ts">
	import Modal from '$lib/components/ui/Modal.svelte';
	import type { Card } from '$lib/types/cards/card';
	import type { CharacterCard } from '$lib/types/character';
	import {
		getOwnedParentCandidates,
		validateCardAssociation,
	} from '$lib/utils/card-association-utils';
	import { getCardTypeName } from '$lib/utils/card-utils';
	import { capitalize } from '$lib/utils/formatting';

	const PARENT_SELECT_ID = 'card-association-parent-select';
	const PARENT_SELECT_LABEL = 'Vinculada a';
	const NO_PARENT_SELECT_VALUE = '';
	const HELP_MESSAGE_ID = 'card-association-help';
	const ERROR_MESSAGE_ID = 'card-association-error';
	const SLOT_CHOICE_ID = 'card-association-slot-choice';
	const SLOT_CHOICE_HELP_ID = 'card-association-slot-choice-help';
	const SLOT_CHOICE_LABEL = 'No consume una Ranura de Carta Activa';
	const SLOT_CHOICE_HELP =
		'La carta activable se mantiene en Cartas Activas sin ocupar una ranura.';

	type Props = {
		opened: boolean;
		child: CharacterCard | null;
		characterCards: CharacterCard[];
		allCards: Card[];
		onClose: () => void;
		onSave: (childId: string, parentId: string | null, doesNotConsumeActiveSlot: boolean) => void;
	};

	let { opened, child, characterCards, allCards, onClose, onSave }: Props = $props();

	let selectedParentId = $state(NO_PARENT_SELECT_VALUE);
	let doesNotConsumeActiveSlot = $state(false);
	let saveError: string | null = $state(null);
	let parentSelect: HTMLSelectElement | undefined = $state();
	let previouslyFocusedElement: HTMLElement | null = null;

	const childDefinition = $derived(
		child ? allCards.find((card) => card.id === child.id) : undefined,
	);

	// The explicit no-slot choice is only meaningful for activable children;
	// effects, consumibles and other types never consume a slot by definition.
	const isChildActivable = $derived(childDefinition?.type === 'activable');

	const existingParentId = $derived.by(() => {
		const value = child?.grantedBy;
		return value !== null && value !== undefined && value.trim() !== '' ? value : null;
	});

	const candidates = $derived(
		child ? getOwnedParentCandidates(child, characterCards, allCards) : [],
	);

	const fulfillingCandidates = $derived(
		candidates.filter((candidate) => candidate.fulfillsRequirement),
	);

	const resolveInitialParentId = (): string => {
		const currentParent = existingParentId;
		if (currentParent && candidates.some((candidate) => candidate.card.id === currentParent)) {
			return currentParent;
		}
		return fulfillingCandidates.length === 1
			? fulfillingCandidates[0].card.id
			: NO_PARENT_SELECT_VALUE;
	};

	$effect(() => {
		if (opened && child) {
			selectedParentId = resolveInitialParentId();
			doesNotConsumeActiveSlot = child.doesNotConsumeActiveSlot === true;
			saveError = null;
		}
	});

	$effect(() => {
		if (!opened) return;
		previouslyFocusedElement =
			document.activeElement instanceof HTMLElement ? document.activeElement : null;
		parentSelect?.focus();

		const handleKeydown = (event: KeyboardEvent) => {
			if (event.key === 'Escape') {
				event.preventDefault();
				onClose();
			}
		};
		window.addEventListener('keydown', handleKeydown);

		return () => {
			window.removeEventListener('keydown', handleKeydown);
			previouslyFocusedElement?.focus();
		};
	});

	const handleParentSelectionChange = (event: Event) => {
		selectedParentId = (event.currentTarget as HTMLSelectElement).value;
		saveError = null;
	};

	const handleSlotChoiceChange = (event: Event) => {
		doesNotConsumeActiveSlot = (event.currentTarget as HTMLInputElement).checked;
	};

	const handleSave = () => {
		if (!child) return;
		// The empty option is the single unlink action: it clears the link
		// without validating an empty parent and is idempotent for unlinked cards.
		if (selectedParentId === NO_PARENT_SELECT_VALUE) {
			onSave(child.id, null, false);
			return;
		}
		const validation = validateCardAssociation(child.id, selectedParentId, characterCards);
		if (!validation.valid) {
			saveError = validation.message;
			return;
		}
		onSave(child.id, selectedParentId, doesNotConsumeActiveSlot);
	};
</script>

<Modal {opened} title="Vincular carta" {onClose}>
	{#if child && childDefinition}
		<p class="child-name">{childDefinition.name}</p>
		<div class="field">
			<label for={PARENT_SELECT_ID}>{PARENT_SELECT_LABEL}</label>
			<select
				id={PARENT_SELECT_ID}
				onchange={handleParentSelectionChange}
				aria-describedby={saveError !== null ? ERROR_MESSAGE_ID : HELP_MESSAGE_ID}
				aria-invalid={saveError !== null}
				bind:this={parentSelect}
			>
				<option value="">— Sin vinculación —</option>
				{#each candidates as candidate (candidate.card.id)}
					<option value={candidate.card.id} selected={selectedParentId === candidate.card.id}>
						{candidate.card.name} ({getCardTypeName(candidate.card)} Nivel {candidate.card.level} - {capitalize(
							candidate.card.type,
						)} -
						{[...candidate.card.tags, candidate.isCustom ? 'Personalizada' : undefined]
							.filter((x) => x)
							.join(', ')}) {candidate.fulfillsRequirement
							? ' [Requerimiento cumplido]'
							: ''}</option
					>
				{/each}
			</select>
			<p id={HELP_MESSAGE_ID} class="help">
				Una carta activable vinculada puede marcarse para no consumir una Ranura de Carta Activa.
				Los efectos y otros tipos conservan su comportamiento actual.
			</p>
			{#if saveError !== null}
				<p id={ERROR_MESSAGE_ID} class="error" role="alert">{saveError}</p>
			{/if}
		</div>
		{#if isChildActivable}
			<div class="slot-choice">
				<label class="slot-choice-label" for={SLOT_CHOICE_ID}>
					<input
						type="checkbox"
						id={SLOT_CHOICE_ID}
						class="slot-choice-input"
						checked={doesNotConsumeActiveSlot}
						onchange={handleSlotChoiceChange}
						aria-describedby={SLOT_CHOICE_HELP_ID}
					/>
					<span class="slot-choice-text">{SLOT_CHOICE_LABEL}</span>
				</label>
				<p id={SLOT_CHOICE_HELP_ID} class="slot-choice-help">
					{SLOT_CHOICE_HELP}
				</p>
			</div>
		{/if}
	{:else}
		<p class="empty">La carta seleccionada ya no está en la colección del personaje.</p>
	{/if}

	{#snippet footer()}
		<div class="footer-actions">
			<button onclick={handleSave}>Guardar</button>
			<button onclick={onClose}>Cancelar</button>
		</div>
	{/snippet}
</Modal>

<style>
	.child-name {
		margin: 0 0 var(--spacing-md);
		font-size: 1.1rem;
		font-weight: bold;
	}

	.field {
		display: flex;
		flex-direction: column;
		gap: var(--spacing-sm);
		margin: var(--spacing-sm) 0;
	}

	.field label {
		font-weight: bold;
	}

	.help {
		margin: 0;
		color: var(--text-secondary);
		font-size: 0.85rem;
	}

	.error {
		margin: 0;
		color: var(--danger);
		font-size: 0.9rem;
	}

	.slot-choice {
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		gap: var(--spacing-xs);
		margin: var(--spacing-sm) 0;
		padding: var(--spacing-sm);
		border: 1px solid var(--border-color);
		border-radius: var(--radius-md);
		background: var(--secondary-bg);
		transition: border-color 0.15s ease;
	}

	.slot-choice:focus-within {
		border-color: var(--accent-default);
		box-shadow: var(--shadow-sm);
	}

	.slot-choice-label {
		display: flex;
		align-items: center;
		gap: var(--spacing-sm);
		cursor: pointer;
		line-height: 1.4;
	}

	.slot-choice-input {
		flex-shrink: 0;
		accent-color: var(--accent-default);
	}

	.slot-choice-text {
		white-space: normal;
	}

	.slot-choice-help {
		margin: 0;
		color: var(--text-secondary);
		font-size: 0.85rem;
		line-height: 1.4;
	}

	.empty {
		color: var(--text-secondary);
		font-style: italic;
	}

	.footer-actions {
		display: flex;
		justify-content: space-between;
		flex: 1;
		gap: 0.5rem;
	}
</style>
