<script lang="ts">
	import Statblock from '$lib/components/statblock/Statblock.svelte';
	import RollModal from '$lib/components/RollModal.svelte';
	import { mapCreature } from '$lib/mappers/creature-mapper';
	import { load as yamlLoad } from 'js-yaml';
	import { onMount } from 'svelte';
	import type { Creature } from '$lib/types/creature';
	import '../../../app.css';
	import { useFoundryVTTService } from '$lib/services/foundryvtt-service';

	// UI state
	let activeTab: 'yaml' | 'sheet' = 'yaml';
	let yamlText: string = '';
	let parseError: string | null = null;
	let creature: Creature | undefined = undefined;
	// If readonlyMode is true (query param readonly=1) we hide editor/tabs and show only the sheet.
	let readonlyMode: boolean = false;

	let parseTimeout: ReturnType<typeof setTimeout> | null = null;
	const PARSE_DEBOUNCE_MS = 400;

	// URL update throttle: we update the `yaml` query param automatically but
	// throttled so the URL changes don't happen on every keystroke and won't
	// cause visible UI jumps. This is independent from the parse debounce.
	let urlUpdateTimeout: ReturnType<typeof setTimeout> | null = null;
	const URL_UPDATE_INTERVAL = 2000; // milliseconds
	let lastUrlUpdate = 0;

	// A starter template the user can edit (same shape as entries inside bestiary.yml)
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

	// Parse YAML into creature object using mapCreature for normalization
	function tryParseAndSetCreature(text: string) {
		parseError = null;
		if (!text || !text.trim()) {
			creature = undefined;
			return;
		}

		try {
			const parsed = yamlLoad(text);

			// Allow the user to paste a full bestiary file with a top-level 'creatures' array.
			let candidate: any = null;
			if (parsed && typeof parsed === 'object' && Array.isArray((parsed as any).creatures)) {
				// pick the first creature in the list
				candidate = (parsed as any).creatures[0] ?? null;
			} else if (parsed && typeof parsed === 'object') {
				// assume it's a creature object itself
				candidate = parsed;
			} else {
				throw new Error('YAML no contiene un objeto válido de criatura.');
			}

			if (!candidate) {
				throw new Error('No se encontró una criatura en el YAML proporcionado.');
			}

			// Normalize & validate via mapper (this will throw on invalid data)
			const mapped = mapCreature(candidate);
			setCreature(mapped);
		} catch (err) {
			creature = undefined;
			const msg = err && (err as any).message ? (err as any).message : String(err);
			parseError = `Error al parsear YAML: ${msg}`;
		}
	}

	function onYamlInput(e: Event) {
		const t = (e.target as HTMLTextAreaElement).value;
		yamlText = t;

		// Debounce parsing to avoid over-parsing while typing
		if (parseTimeout) clearTimeout(parseTimeout);
		parseTimeout = setTimeout(() => {
			tryParseAndSetCreature(t);
			parseTimeout = null;
		}, PARSE_DEBOUNCE_MS);

		// Throttle URL updates: update at most once per URL_UPDATE_INTERVAL.
		// If an update is already allowed (lastUrlUpdate sufficiently old), update immediately.
		// Otherwise, schedule a single pending update to occur when the interval has passed.
		try {
			const now = Date.now();
			const doUpdate = () => {
				try {
					const enc = encodeURIComponent(t);
					const u = new URL(window.location.href);
					if (enc && enc.length > 0) u.searchParams.set('yaml', enc);
					else u.searchParams.delete('yaml');
					// Preserve readonly flag if present
					if (readonlyMode) u.searchParams.set('readonly', '1');
					history.replaceState(history.state, '', u.toString());
					lastUrlUpdate = Date.now();
				} catch {
					// ignore any URL update errors (non-browser env)
				}
			};

			// If enough time has passed since last update, update now.
			if (now - lastUrlUpdate >= URL_UPDATE_INTERVAL) {
				// Cancel any pending scheduled update and run immediately.
				if (urlUpdateTimeout) {
					clearTimeout(urlUpdateTimeout);
					urlUpdateTimeout = null;
				}
				doUpdate();
			} else {
				// Otherwise schedule an update to run after the remaining interval.
				const remaining = URL_UPDATE_INTERVAL - (now - lastUrlUpdate);
				if (urlUpdateTimeout) {
					// already scheduled, do nothing
				} else {
					urlUpdateTimeout = setTimeout(() => {
						doUpdate();
						urlUpdateTimeout = null;
					}, remaining);
				}
			}
		} catch {
			// ignore throttle/url errors
		}
	}

	onMount(() => {
		// Initialize textarea and readonly mode from the query params if present (decode); otherwise fallback to sample.
		try {
			const u = new URL(window.location.href);
			const param = u.searchParams.get('yaml');
			const ro = u.searchParams.get('readonly');
			readonlyMode = ro === '1';

			if (param) {
				try {
					yamlText = decodeURIComponent(param);
				} catch {
					// if decoding fails, fallback to sample
					yamlText = SAMPLE_YAML;
				}
			} else {
				yamlText = SAMPLE_YAML;
			}
		} catch {
			// if URL parsing fails (non-browser), fallback to sample
			yamlText = SAMPLE_YAML;
			readonlyMode = false;
		}

		// If readonly mode is active, show the sheet tab by default
		if (readonlyMode) activeTab = 'sheet';

		tryParseAndSetCreature(yamlText);
	});

	// Utility: let user download the current YAML as a file
	function downloadYAML() {
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

	// Copy current YAML into the URL's `yaml` query param and copy the full URL to clipboard.
	function copyShareURL() {
		try {
			const enc = encodeURIComponent(yamlText);
			const u = new URL(window.location.href);
			if (enc && enc.length > 0) u.searchParams.set('yaml', enc);
			else u.searchParams.delete('yaml');
			if (readonlyMode) u.searchParams.set('readonly', '1');
			const full = u.toString();
			navigator.clipboard.writeText(full);
			alert('Enlace copiado al portapapeles.');
		} catch (e) {
			console.warn('[embedded npc] copyShareURL failed', e);
			alert('No se pudo copiar la URL.');
		}
	}
</script>

<svelte:head>
	<title>NPC Custom (embebido)</title>
	<meta name="viewport" content="width=device-width, initial-scale=1" />
</svelte:head>

<div class="embedded-npc">
	{#if !readonlyMode}
		<div class="tabs">
			<button class:active={activeTab === 'yaml'} on:click={() => (activeTab = 'yaml')}>YAML</button
			>
			<button class:active={activeTab === 'sheet'} on:click={() => (activeTab = 'sheet')}
				>Ficha</button
			>
			<div class="spacer"></div>
			<button on:click={copyShareURL} title="Copiar enlace">🔗</button>
			<button on:click={downloadYAML} title="Descargar YAML">⬇️</button>
		</div>
	{/if}

	{#if readonlyMode}
		<div class="sheet">
			{#if creature}
				<Statblock {creature} />
				<RollModal />
			{:else}
				<div class="status">No hay una criatura válida para mostrar. Edita el YAML primero.</div>
			{/if}
		</div>
	{:else if activeTab === 'yaml'}
		<div class="editor">
			<label for="yaml-area" class="visually-hidden">YAML de criatura</label>
			<textarea id="yaml-area" bind:value={yamlText} on:input={onYamlInput}></textarea>
			{#if parseError}
				<div class="error">{parseError}</div>
			{:else if creature}
				<div class="ok">
					Creatura válida: <strong>{creature.name}</strong> (tier {creature.tier})
				</div>
			{/if}
		</div>
	{:else}
		<div class="sheet">
			{#if creature}
				<Statblock {creature} />
				<RollModal />
			{:else}
				<div class="status">No hay una criatura válida para mostrar. Edita el YAML primero.</div>
			{/if}
		</div>
	{/if}
</div>

<style>
	:global(html, body) {
		height: 100%;
		margin: 0;
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
	.tabs {
		display: flex;
		gap: 0.5rem;
		align-items: center;
	}
	.tabs .spacer {
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
		background: var(--primary);
		color: white;
	}
	.editor {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}
	textarea {
		width: 100%;
		min-height: 40vh;
		font-family: monospace;
		font-size: 0.95rem;
		padding: 0.75rem;
		box-sizing: border-box;
		border: 1px solid var(--border-color);
		border-radius: 6px;
		resize: vertical;
		background: var(--secondary-bg);
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
	.visually-hidden {
		position: absolute;
		left: -9999px;
	}
</style>
