<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		activeTab: 'yaml' | 'sheet' | 'mixed';
		onTabChange: (tab: 'yaml' | 'sheet' | 'mixed') => void;
		onImport?: () => void;
		onReset?: () => void;
		onCopyLink?: () => void;
		onCopyIframe?: () => void;
		onDownload?: () => void;
		readonly?: boolean;
	}

	let {
		activeTab,
		onTabChange,
		onImport,
		onReset,
		onCopyLink,
		onCopyIframe,
		onDownload,
		readonly = false,
	}: Props = $props();
</script>

<div class="toolbar">
	{#if !readonly}
		<div class="tabs">
			<button class:active={activeTab === 'mixed'} onclick={() => onTabChange('mixed')}>
				Mixta
			</button>
			<button class:active={activeTab === 'sheet'} onclick={() => onTabChange('sheet')}>
				Ficha
			</button>
			<button class:active={activeTab === 'yaml'} onclick={() => onTabChange('yaml')}>
				YAML
			</button>
		</div>

		<div class="spacer"></div>

		<div class="actions">
			{#if onImport}
				<button onclick={onImport} title="Importar del Bestiario">📚</button>
			{/if}
			{#if onReset}
				<button onclick={onReset} title="Reiniciar al ejemplo">🔄</button>
			{/if}
			{#if onCopyLink}
				<button onclick={onCopyLink} title="Copiar enlace">🔗</button>
			{/if}
			{#if onCopyIframe}
				<button onclick={onCopyIframe} title="Copiar código iframe">&lt;/&gt;</button>
			{/if}
			{#if onDownload}
				<button onclick={onDownload} title="Descargar YAML">⬇️</button>
			{/if}
		</div>
	{/if}
</div>

<style>
	.toolbar {
		display: flex;
		gap: 0.5rem;
		align-items: center;
	}

	.tabs {
		display: flex;
		gap: 0.5rem;
	}

	.actions {
		display: flex;
		gap: 0.5rem;
	}

	.spacer {
		flex: 1;
	}

	button {
		padding: 0.35rem 0.6rem;
		border-radius: 6px;
		border: 1px solid var(--border-color);
		background: var(--secondary-bg);
		cursor: pointer;
	}

	button.active {
		background: var(--selected-bg);
		border-color: var(--selected-border);
	}

	button:hover:not(.active) {
		background: var(--background);
	}
</style>
