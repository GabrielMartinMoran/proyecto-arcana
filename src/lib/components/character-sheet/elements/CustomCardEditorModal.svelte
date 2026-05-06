<script lang="ts">
	import Card from '$lib/components/cards/Card.svelte';
	import CodeEditor from '$lib/components/ui/CodeEditor.svelte';
	import Modal from '$lib/components/ui/Modal.svelte';
	import { mapCustomAbilityCard, mapCustomItemCard } from '$lib/mappers/card-mapper';
	import type { Card as CardType } from '$lib/types/cards/card';
	import { cardToYaml } from '$lib/utils/card-to-yaml';
	import { load as yamlLoad } from 'js-yaml';

	type Props = {
		opened: boolean;
		cardType: 'ability' | 'item';
		existingCard?: CardType;
		onClose: () => void;
		onSave: (card: CardType) => void;
	};

	let { opened, cardType, existingCard, onClose, onSave }: Props = $props();

	const DEFAULT_ABILITY_TEMPLATE = `name: Nueva Habilidad
level: 1
tags: []
requirements: null
description: ''
uses:
  qty: 0
  type: null
type: efecto`;

	const DEFAULT_ITEM_TEMPLATE = `name: Nuevo Objeto Mágico
level: 1
tags: []
requirements: null
description: ''
uses:
  qty: 0
  type: null
type: efecto
cost: '0'`;

	let yamlText = $state('');
	let parseError: string | null = $state(null);
	let parsedCard: CardType | null = $state(null);
	let parseTimeout: ReturnType<typeof setTimeout> | null = null;

	const getInitialYaml = () => {
		if (existingCard) {
			return cardToYaml(existingCard);
		}
		return cardType === 'ability' ? DEFAULT_ABILITY_TEMPLATE : DEFAULT_ITEM_TEMPLATE;
	};

	$effect(() => {
		if (opened) {
			yamlText = getInitialYaml();
			parseError = null;
			parsedCard = null;
			// Trigger initial parse after a short delay
			if (parseTimeout) clearTimeout(parseTimeout);
			parseTimeout = setTimeout(() => {
				tryParseYaml(yamlText);
			}, 400);
		}
	});

	const tryParseYaml = (text: string) => {
		parseError = null;
		parsedCard = null;
		if (!text || !text.trim()) {
			parseError = 'El YAML está vacío';
			return;
		}

		try {
			const parsed = yamlLoad(text);
			if (cardType === 'ability') {
				parsedCard = mapCustomAbilityCard(parsed, existingCard?.id);
			} else {
				parsedCard = mapCustomItemCard(parsed, existingCard?.id);
			}
		} catch (err) {
			const msg = err && (err as any).message ? (err as any).message : String(err);
			parseError = msg;
		}
	};

	const handleYamlChange = (text: string) => {
		yamlText = text;
		if (parseTimeout) clearTimeout(parseTimeout);
		parseTimeout = setTimeout(() => {
			tryParseYaml(text);
		}, 400);
	};

	const handleSave = () => {
		if (parsedCard) {
			onSave(parsedCard);
		}
	};
</script>

<Modal {opened} title="Editor de Carta Personalizada" {onClose}>
	<div class="editor-layout">
		<div class="editor-pane">
			<CodeEditor value={yamlText} onChange={handleYamlChange} language="yaml" />
			{#if parseError}
				<div class="error">{parseError}</div>
			{/if}
		</div>
		<div class="preview-pane">
			{#if parsedCard}
				<Card card={parsedCard} />
			{:else}
				<div class="preview-placeholder">
					<em>La previsualización aparecerá cuando el YAML sea válido</em>
				</div>
			{/if}
		</div>
	</div>

	{#snippet footer()}
		<div class="footer-actions">
			<button onclick={handleSave} disabled={!parsedCard || !!parseError}>Guardar</button>
			<button onclick={onClose}>Cancelar</button>
		</div>
	{/snippet}
</Modal>

<style>
	.editor-layout {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 1rem;
		min-height: 400px;
	}

	.editor-pane {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.preview-pane {
		display: flex;
		justify-content: center;
		align-items: flex-start;
	}

	.preview-placeholder {
		display: flex;
		justify-content: center;
		align-items: center;
		height: 100%;
		color: var(--text-secondary);
		font-style: italic;
	}

	.error {
		color: var(--danger);
		font-size: 0.9rem;
	}

	.footer-actions {
		display: flex;
		justify-content: space-between;
		flex: 1;
		gap: 0.5rem;
	}

	@media (max-width: 768px) {
		.editor-layout {
			grid-template-columns: 1fr;
			grid-template-rows: auto auto;
		}
	}
</style>
