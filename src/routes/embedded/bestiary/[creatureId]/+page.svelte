<script lang="ts">
	import Statblock from '$lib/components/statblock/Statblock.svelte';
	import RollModal from '$lib/components/RollModal.svelte';
	import { useCreaturesService } from '$lib/services/creatures-service';
	import { useDiceRollerService } from '$lib/services/dice-roller-service';
	import { page } from '$app/stores';
	import { onMount } from 'svelte';
	import { get } from 'svelte/store';
	import type { Creature } from '$lib/types/creature';
	import '../../../../app.css';
	import { useFoundryVTTService } from '$lib/services/foundryvtt-service';

	// Services
	const { loadCreatures, creatures } = useCreaturesService();

	const { isInsideFoundry, syncCreatureState } = useFoundryVTTService();

	// Initialize dice service so the statblock's roll buttons / modal can work
	useDiceRollerService();

	// Local state
	let creatureId: string | undefined = undefined;
	let creature: Creature | undefined = undefined;
	let loading = true;
	let error: string | null = null;

	const setCreature = (cr: Creature) => {
		creature = cr;
		if (isInsideFoundry()) {
			syncCreatureState(creature);
		}
	};

	onMount(async () => {
		// Obtain route param client-side
		try {
			const p = get(page);
			creatureId = p?.params?.creatureId;
		} catch {
			// ignore
		}

		loading = true;
		error = null;

		if (!creatureId) {
			loading = false;
			error = 'ID de criatura inválida.';
			return;
		}

		try {
			await loadCreatures();
			const list = get(creatures) || [];
			const found = list.find((c) => c && (c.id === creatureId || c.name === creatureId));
			if (found) {
				setCreature(found);
			} else {
				error = 'No se encontró la criatura.';
			}
		} catch (e) {
			console.error('[bestiary-embed] error loading creatures', e);
			error = 'Error al cargar el bestiario.';
		} finally {
			loading = false;
		}
	});
</script>

<svelte:head>
	<title>Creatura embebida</title>
	<meta name="viewport" content="width=device-width, initial-scale=1" />
</svelte:head>

<div class="page">
	{#if loading}
		<div class="status">Cargando criatura...</div>
	{:else if error}
		<div class="status">{error}</div>
	{:else if creature}
		<Statblock {creature} />
		<RollModal />
	{:else}
		<div class="status">Criatura no disponible.</div>
	{/if}
</div>

<style>
	:global(html, body) {
		height: 100%;
		margin: 0;
	}
	.page {
		display: flex;
		flex-direction: column;
		padding: 0.5rem;
		box-sizing: border-box;
		min-height: 100vh;
		background: var(--background, #fff);
	}
	.status {
		padding: 0.75rem;
		border: 1px solid #ddd;
		border-radius: 6px;
	}
</style>
