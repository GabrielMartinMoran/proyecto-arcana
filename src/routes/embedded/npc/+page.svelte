<script lang="ts">
	import { replaceState } from '$app/navigation';
	import { page } from '$app/state';
	import RollModal from '$lib/components/RollModal.svelte';
	import Statblock from '$lib/components/statblock/Statblock.svelte';
	import { mapCreature } from '$lib/mappers/creature-mapper';
	import { dialogService } from '$lib/services/dialog-service.svelte';
	import { useFoundryVTTService } from '$lib/services/foundryvtt-service';
	import { hashParams } from '$lib/stores/hash-params.svelte';
	import type { Creature } from '$lib/types/creature';
	import { buildNpcUrl } from '$lib/utils/build-npc-url';

	import { load as yamlLoad } from 'js-yaml';
	import { onMount } from 'svelte';
	import '../../../app.css';
	import CodeEditor from './CodeEditor.svelte';
	import CreatureImportModal from './CreatureImportModal.svelte';
	import EditorToolbar from './EditorToolbar.svelte';

	const isReadonly = () => {
		const url = page.url;
		return url.searchParams.get('readonly') === '1' || hashParams.get('readonly') === '1';
	};

	const SAMPLE_YAML = `# Ejemplo de criatura (editar aquí)
name: Goblin
lineage: Goblinoide
tier: 1
size: Mediano
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

	const PARSE_DEBOUNCE_MS = 400;
	const URL_UPDATE_DEBOUNCE_MS = 300;

	let parseTimeout: ReturnType<typeof setTimeout> | null = null;
	let urlUpdateTimeout: ReturnType<typeof setTimeout> | null = null;

	// UI state
	let activeTab: 'yaml' | 'sheet' | 'mixed' = $state('mixed');
	let yamlText = $state(hashParams.get('yaml') ?? SAMPLE_YAML);
	let parseError: string | null = $state(null);
	let creature: Creature | undefined = $state(undefined);
	let readonlyMode = $state(isReadonly());
	let importModalOpen = $state(false);
	let editorKey = $state(0);

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
		const readonly = readonlyMode;

		if (parseTimeout) clearTimeout(parseTimeout);
		parseTimeout = setTimeout(() => {
			tryParseAndSetCreature(text);
			parseTimeout = null;
		}, PARSE_DEBOUNCE_MS);

		if (urlUpdateTimeout) clearTimeout(urlUpdateTimeout);
		urlUpdateTimeout = setTimeout(() => {
			try {
				const u = new URL(window.location.href);
				const newUrl = buildNpcUrl(u, text, readonly);

				const currentHash = hashParams.param;
				const nextHash = new URLSearchParams(new URL(newUrl).hash.replace(/^#/, ''));
				if (currentHash.toString() === nextHash.toString()) return;

				replaceState(newUrl, {});
				hashParams.sync();
			} catch {
				// ignore URL update errors
			}
			urlUpdateTimeout = null;
		}, URL_UPDATE_DEBOUNCE_MS);
	});

	onMount(() => {
		tryParseAndSetCreature(yamlText);
		if (readonlyMode) {
			activeTab = 'sheet';
		}

		const handleHashChange = () => {
			const yaml = hashParams.get('yaml');
			if (yaml !== null && yaml !== yamlText) {
				yamlText = yaml;
			}
			readonlyMode = isReadonly();
		};

		window.addEventListener('hashchange', handleHashChange);
		return () => window.removeEventListener('hashchange', handleHashChange);
	});

	function handleImport(importedYaml: string) {
		yamlText = importedYaml;
		editorKey++;
		activeTab = 'mixed';
	}

	async function handleReset() {
		const confirmed = await dialogService.confirm(
			'¿Reiniciar al ejemplo por defecto? Se perderán los cambios actuales.',
			{ title: 'Confirmar reinicio', confirmLabel: 'Reiniciar', cancelLabel: 'Cancelar' },
		);

		if (confirmed) {
			yamlText = SAMPLE_YAML;
			editorKey++;
		}
	}

	async function handleCopyLink() {
		try {
			const u = new URL(window.location.href);
			const full = buildNpcUrl(u, yamlText, readonlyMode);
			await navigator.clipboard.writeText(full);
			await dialogService.alert('Enlace copiado al portapapeles.');
		} catch (e) {
			console.warn('[embedded npc] copyShareURL failed', e);
			await dialogService.alert('No se pudo copiar la URL.');
		}
	}

	async function handleCopyIframe() {
		try {
			const u = new URL(window.location.href);
			const full = buildNpcUrl(u, yamlText, true);
			const iframeCode = `<iframe src="${full}" width="100%" height="600" style="border:none;"></iframe>`;
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
