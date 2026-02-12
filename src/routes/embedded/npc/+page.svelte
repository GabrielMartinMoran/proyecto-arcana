<script lang="ts">
	import CodeEditor from './CodeEditor.svelte';
	import EditorToolbar from './EditorToolbar.svelte';
	import CreatureImportModal from './CreatureImportModal.svelte';
	import Statblock from '$lib/components/statblock/Statblock.svelte';
	import RollModal from '$lib/components/RollModal.svelte';
	import { mapCreature } from '$lib/mappers/creature-mapper';
	import { load as yamlLoad } from 'js-yaml';
	import { onMount } from 'svelte';
	import { replaceState } from '$app/navigation';
	import type { Creature } from '$lib/types/creature';
	import '../../../app.css';
	import { useFoundryVTTService } from '$lib/services/foundryvtt-service';
	import { dialogService } from '$lib/services/dialog-service.svelte';

	// UI state
	let activeTab: 'yaml' | 'sheet' | 'mixed' = $state('mixed');
	let yamlText = $state('');
	let parseError: string | null = $state(null);
	let creature: Creature | undefined = $state(undefined);
	let readonlyMode = $state(false);
	let importModalOpen = $state(false);
	let editorKey = $state(0);

	let parseTimeout: ReturnType<typeof setTimeout> | null = null;
	const PARSE_DEBOUNCE_MS = 400;

	let urlUpdateTimeout: ReturnType<typeof setTimeout> | null = null;
	const URL_UPDATE_INTERVAL = 2000;
	let lastUrlUpdate = 0;

	const SAMPLE_YAML = `# Ejemplo de criatura (editar aquí)
name: Goblin
tier: 1
attributes:
  body: 2
  reflexes: 3
  mind: 1
  instinct: 2
  presence: 1
stats:
  maxHealth: 8
  evasion:
    value: 1
    note: null
  physicalMitigation:
    value: 0
    note: null
  magicalMitigation:
    value: 0
    note: null
  speed:
    value: 6
    note: null
languages: []
attacks:
  - name: Mordisco
    bonus: 1
    damage: 1d6
    note: null
traits:
  - name: Astuto
    detail: Sumar +1 a iniciativas en grupo
actions:
  - name: Ataque múltiple
    detail: Ataca dos veces
    uses: null
reactions: []
interactions: []
behavior: Actúa en pequeños grupos para emboscar.
img: null
`;

	const { isInsideFoundry, syncCreatureState } = useFoundryVTTService();

	const setCreature = (cr: Creature) => {
		creature = cr;
		if (isInsideFoundry()) {
			syncCreatureState(creature);
		}
	};

	function tryParseAndSetCreature(text: string) {
		parseError = null;
		if (!text || !text.trim()) {
			creature = undefined;
			return;
		}

		try {
			const parsed = yamlLoad(text);

			let candidate: any = null;
			if (parsed && typeof parsed === 'object' && Array.isArray((parsed as any).creatures)) {
				candidate = (parsed as any).creatures[0] ?? null;
			} else if (parsed && typeof parsed === 'object') {
				candidate = parsed;
			} else {
				throw new Error('YAML no contiene un objeto válido de criatura.');
			}

			if (!candidate) {
				throw new Error('No se encontró una criatura en el YAML proporcionado.');
			}

			const mapped = mapCreature(candidate);
			setCreature(mapped);
		} catch (err) {
			creature = undefined;
			const msg = err && (err as any).message ? (err as any).message : String(err);
			parseError = `Error al parsear YAML: ${msg}`;
		}
	}

	$effect(() => {
		const text = yamlText;

		if (parseTimeout) clearTimeout(parseTimeout);
		parseTimeout = setTimeout(() => {
			tryParseAndSetCreature(text);
			parseTimeout = null;
		}, PARSE_DEBOUNCE_MS);

		// Throttle URL updates
		try {
			const now = Date.now();
			const doUpdate = () => {
				try {
					const enc = encodeURIComponent(text);
					const u = new URL(window.location.href);
					if (enc && enc.length > 0) u.searchParams.set('yaml', enc);
					else u.searchParams.delete('yaml');
					if (readonlyMode) u.searchParams.set('readonly', '1');
					replaceState(u.toString(), {});
					lastUrlUpdate = Date.now();
				} catch {
					// ignore URL update errors
				}
			};

			if (now - lastUrlUpdate >= URL_UPDATE_INTERVAL) {
				if (urlUpdateTimeout) {
					clearTimeout(urlUpdateTimeout);
					urlUpdateTimeout = null;
				}
				doUpdate();
			} else {
				const remaining = URL_UPDATE_INTERVAL - (now - lastUrlUpdate);
				if (!urlUpdateTimeout) {
					urlUpdateTimeout = setTimeout(() => {
						doUpdate();
						urlUpdateTimeout = null;
					}, remaining);
				}
			}
		} catch {
			// ignore throttle/url errors
		}
	});

	onMount(() => {
		try {
			const u = new URL(window.location.href);
			const param = u.searchParams.get('yaml');
			const ro = u.searchParams.get('readonly');
			readonlyMode = ro === '1';

			if (param) {
				try {
					yamlText = decodeURIComponent(param);
				} catch {
					yamlText = SAMPLE_YAML;
				}
			} else {
				yamlText = SAMPLE_YAML;
			}
		} catch {
			yamlText = SAMPLE_YAML;
			readonlyMode = false;
		}

		if (readonlyMode) activeTab = 'sheet';
	});

	function handleImport(importedYaml: string) {
		yamlText = importedYaml;
		editorKey++;
		activeTab = 'mixed';
	}

	async function handleReset() {
		const confirmed = await dialogService.confirm(
			'¿Reiniciar al ejemplo por defecto? Se perderán los cambios actuales.',
			{ title: 'Confirmar reinicio', confirmLabel: 'Reiniciar', cancelLabel: 'Cancelar' }
		);

		if (confirmed) {
			yamlText = SAMPLE_YAML;
			editorKey++;
		}
	}

	async function handleCopyLink() {
		try {
			const enc = encodeURIComponent(yamlText);
			const u = new URL(window.location.href);
			if (enc && enc.length > 0) u.searchParams.set('yaml', enc);
			else u.searchParams.delete('yaml');
			if (readonlyMode) u.searchParams.set('readonly', '1');
			const full = u.toString();
			await navigator.clipboard.writeText(full);
			await dialogService.alert('Enlace copiado al portapapeles.');
		} catch (e) {
			console.warn('[embedded npc] copyShareURL failed', e);
			await dialogService.alert('No se pudo copiar la URL.');
		}
	}

	async function handleCopyIframe() {
		try {
			const enc = encodeURIComponent(yamlText);
			const u = new URL(window.location.href);
			if (enc && enc.length > 0) u.searchParams.set('yaml', enc);
			else u.searchParams.delete('yaml');
			u.searchParams.set('readonly', '1');
			const iframeCode = `<iframe src="${u.toString()}" width="100%" height="600" style="border:none;"></iframe>`;
			await navigator.clipboard.writeText(iframeCode);
			await dialogService.alert('Código iframe copiado al portapapeles.');
		} catch (e) {
			console.warn('[embedded npc] copyIframe failed', e);
			await dialogService.alert('No se pudo copiar el código iframe.');
		}
	}

	function handleDownload() {
		const blob = new Blob([yamlText], { type: 'text/yaml' });
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = `${(creature?.name ?? 'creature').replace(/\s+/g, '_')}.yml`;
		document.body.appendChild(a);
		a.click();
		a.remove();
		URL.revokeObjectURL(url);
	}
</script>

<svelte:head>
	<title>NPC Custom (embebido)</title>
	<meta name="viewport" content="width=device-width, initial-scale=1" />
</svelte:head>

<svelte:body class:npc-readonly={readonlyMode} />

<div class="embedded-npc" class:readonly={readonlyMode}>
	<EditorToolbar
		{activeTab}
		onTabChange={(tab) => (activeTab = tab)}
		onImport={() => (importModalOpen = true)}
		onReset={handleReset}
		onCopyLink={handleCopyLink}
		onCopyIframe={handleCopyIframe}
		onDownload={handleDownload}
		readonly={readonlyMode}
	/>

	<CreatureImportModal
		bind:open={importModalOpen}
		onSelect={handleImport}
		onClose={() => (importModalOpen = false)}
	/>

	{#if readonlyMode}
		<div class="sheet">
			{#if creature}
				<Statblock {creature} />
				<RollModal />
			{:else}
				<div class="status">No hay una criatura válida para mostrar.</div>
			{/if}
		</div>
	{:else if activeTab === 'yaml'}
		<div class="editor">
			{#key editorKey}
				<CodeEditor bind:value={yamlText} language="yaml" />
			{/key}
			{#if parseError}
				<div class="error">{parseError}</div>
			{:else if creature}
				<div class="ok">
					Criatura válida: <strong>{creature.name}</strong> (tier {creature.tier})
				</div>
			{/if}
		</div>
	{:else if activeTab === 'mixed'}
		<div class="mixed-view">
			<div class="editor-panel">
				{#key editorKey}
					<CodeEditor bind:value={yamlText} language="yaml" />
				{/key}
				{#if parseError}
					<div class="error">{parseError}</div>
				{:else if creature}
					<div class="ok">
						Criatura válida: <strong>{creature.name}</strong> (tier {creature.tier})
					</div>
				{/if}
			</div>
			<div class="preview-panel">
				{#if creature}
					<Statblock {creature} />
					<RollModal />
				{:else}
					<div class="status">No hay una criatura válida para mostrar.</div>
				{/if}
			</div>
		</div>
	{:else}
		<div class="sheet">
			{#if creature}
				<Statblock {creature} />
				<RollModal />
			{:else}
				<div class="status">No hay una criatura válida para mostrar.</div>
			{/if}
		</div>
	{/if}
</div>

<style>
	:global(html, body) {
		height: 100%;
		margin: 0;
	}

	/* Override global height styles when in readonly mode */
	:global(body.npc-readonly),
	:global(html:has(body.npc-readonly)) {
		height: auto !important;
		min-height: auto !important;
	}

	.embedded-npc {
		min-height: 100vh;
		padding: 0.75rem;
		box-sizing: border-box;
		background: var(--background, #fff);
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.embedded-npc.readonly {
		min-height: auto;
		height: auto;
		display: block; /* Let content flow naturally */
	}

	.editor {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.mixed-view {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 0.75rem;
		flex: 1;
		overflow: hidden;
	}

	.editor-panel,
	.preview-panel {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		overflow-y: auto;
	}

	@media (max-width: 768px) {
		.mixed-view {
			grid-template-columns: 1fr;
			grid-template-rows: auto auto;
		}
	}

	.error {
		color: var(--danger);
	}

	.ok {
		color: var(--muted-text);
	}

	.sheet {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.status {
		padding: 0.75rem;
		border: 1px solid var(--border-color);
		border-radius: 6px;
		background: var(--secondary-bg);
	}
</style>
