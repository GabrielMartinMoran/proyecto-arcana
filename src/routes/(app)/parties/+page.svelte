<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { onDestroy } from 'svelte';
	import { get } from 'svelte/store';

	import Container from '$lib/components/ui/Container.svelte';

	import { resolve } from '$app/paths';
	import PartySheet from '$lib/components/party-sheet/PartySheet.svelte';
	import { useFirebaseService } from '$lib/services/firebase-service';
	import { usePartiesService } from '$lib/services/parties-service';
	import { Party } from '$lib/types/party';
	import { CONFIG } from '../../../config';

	// Services
	const firebase = useFirebaseService();

	let {
		parties,
		loadParties,
		deleteParty: deletePartyInSvc,
		saveParty: savePartyInSvc,
		createParty: createPartyInSvc,
	} = usePartiesService();

	// Destructure only the stores we need for UI subscription
	const { user, firebaseReady } = firebase;

	// URL sync: reflect ?partyId= in the page
	let selectedPartyId: string | null = $derived(page.url.searchParams.get('partyId'));

	// Local UI state
	let selectedParty: Party | undefined = $derived($parties.find((p) => p.id === selectedPartyId));

	let isSaving = $state(false);

	// -------------------------------
	const onUserChange = async () => {
		if (!get(firebaseReady)) return;
		if (!get(user)) {
			goto(resolve('/'));
			return;
		}
		await loadParties();
	};

	const unsubscribeFromUser = user.subscribe(async () => await onUserChange());
	const unsubscribeFromFirebaseReady = firebaseReady.subscribe(async (firebaseReady) => {
		if (!firebaseReady) return;
		setTimeout(() => {
			onUserChange();
		}, CONFIG.NO_USER_REDIRECT_DELAY);
	});
	const unsubscribeFromPartiesStore = parties.subscribe(async (parties) => {
		if (!selectedPartyId) return;
		selectedParty = parties.find((p) => p.id === selectedPartyId);
	});

	onDestroy(() => {
		unsubscribeFromUser();
		unsubscribeFromFirebaseReady();
		unsubscribeFromPartiesStore();
	});
	// -------------------------------

	// Handler for sheet tab changes (keeps URL in sync)

	// Debounced auto-save
	let saveTimer: ReturnType<typeof setTimeout> | null = null;
	const AUTOSAVE_DELAY = 500;

	function scheduleSave() {
		if (!selectedParty) return;
		if (saveTimer) clearTimeout(saveTimer);
		saveTimer = setTimeout(async () => {
			saveTimer = null;
			await doSaveParty();
		}, AUTOSAVE_DELAY);
	}

	async function doSaveParty() {
		if (!selectedParty) return;
		isSaving = true;
		try {
			// Ensure ownerId set if logged
			const u = get(user);
			if (u && (!selectedParty.ownerId || selectedParty.ownerId === '')) {
				selectedParty.ownerId = u.uid;
			}
			await savePartyInSvc(selectedParty);
			// refresh from store (to get normalized server form)
			const fresh = get(parties).find((p) => p.id === selectedParty!.id);
			selectedParty = fresh ? fresh.copy() : selectedParty.copy();
		} catch (err) {
			console.error('[parties-page] save failed', err);
		} finally {
			isSaving = false;
		}
	}

	const openParty = (party: Party) => {
		selectedPartyId = party.id;
		selectedParty = party;

		page.url.searchParams.set('partyId', party.id);
		page.url.searchParams.delete('characterId');
		page.url.searchParams.delete('sheetTab');
		page.url.searchParams.delete('tab');
		goto(`?${page.url.searchParams.toString()}`);
	};

	// Create party
	async function createParty() {
		const created = await createPartyInSvc('Nuevo Grupo');
		openParty(created);
	}

	// Delete party
	async function deleteParty() {
		if (!selectedParty) return;
		const ok = confirm(`¿Eliminar el grupo "${selectedParty.name}"?`);
		if (!ok) return;
		try {
			await deletePartyInSvc(selectedParty.id);
		} catch (err) {
			console.error('[parties-page] delete failed', err);
			alert('Error al eliminar el grupo');
		}
		selectedPartyId = null;
		selectedParty = undefined;
		page.url.searchParams.delete('partyId');
		goto(`?${page.url.searchParams.toString()}`);
	}
</script>

<section class="parties-page">
	<div class="list" role="navigation" aria-label="Lista de grupos">
		<div class="header">
			<button onclick={createParty} title="Crear">➕</button>
			<button
				onclick={deleteParty}
				title="Eliminar"
				disabled={$user?.uid !== selectedParty?.ownerId}>🗑️</button
			>
		</div>

		<div class="content">
			{#if $parties.length === 0}
				<div class="empty">No tienes grupos. Crea uno con ➕</div>
			{/if}
			{#each $parties as party (party.id)}
				<button
					class="party-item"
					class:selected={selectedPartyId === party.id}
					onclick={() => openParty(party)}
				>
					{#if party.ownerId}
						<span
							class="owner"
							title={`${party.ownerId === $user?.uid ? 'Dueño' : 'Miembro'} del grupo`}
							>{party.ownerId === $user?.uid ? '👑' : '👤'}</span
						>
					{/if}
					<span class="name">{party.name}</span>
				</button>
			{/each}
		</div>
	</div>

	<div class="viewport">
		{#if selectedParty}
			<PartySheet
				party={selectedParty}
				readonly={$user?.uid !== selectedParty?.ownerId}
				onChange={(party) => {
					if (!selectedParty) return;
					selectedParty = party;
					scheduleSave();
				}}
			/>
		{:else}
			<Container title="Selecciona un grupo">
				<p>Selecciona un grupo de la lista o crea uno nuevo con ➕</p>
			</Container>
		{/if}
		<!-- Controls -->
		<div class="controls">
			<span class="muted">{isSaving ? 'Guardando...' : ''}</span>
		</div>
	</div>
</section>

<style>
	.parties-page {
		display: flex;
		flex-direction: row;
		gap: var(--spacing-md);
		flex-grow: 1;
		justify-content: center;
		width: 100%;

		.list {
			display: flex;
			flex-direction: column;
			align-items: center;
			justify-content: start;
			border: 1px solid var(--border-color);
			padding: var(--spacing-md);
			border-radius: var(--radius-md);
			background-color: var(--secondary-bg);
			width: 300px;

			.header {
				display: flex;
				flex-direction: row;
				align-items: center;
				justify-content: space-between;
				width: 100%;
				border-bottom: 1px solid var(--border-color);
				padding-bottom: var(--spacing-sm);
				gap: var(--spacing-sm);
			}

			.content {
				display: flex;
				flex-direction: column;
				align-items: center;
				justify-content: start;
				width: 100%;
				gap: var(--spacing-sm);
				padding-top: var(--spacing-md);

				.party-item {
					cursor: pointer;
					width: 100%;
					height: 3rem;
					display: flex;
					flex-direction: row;
					align-items: center;
					justify-content: left;
					gap: var(--spacing-sm);

					.owner {
						width: 2rem;
						height: 2rem;
						border-radius: 50%;
						background: var(--background-color);
						background-color: #d9d9d9;
						display: flex;
						align-items: center;
						justify-content: center;
					}

					.name {
						padding: 0px;
						overflow: hidden;
						white-space: nowrap;
						text-overflow: ellipsis;
						width: calc(100% - 4rem);
					}
				}
			}
		}

		.viewport {
			flex: 1;
		}

		.sheet {
			display: flex;
			flex-direction: column;
			gap: var(--spacing-md);
			width: 100%;
		}

		.header-row {
			display: flex;
			gap: var(--spacing-md);
			align-items: center;
		}

		.tabs {
			display: flex;
			flex-direction: row;
			flex-wrap: wrap;
			gap: var(--spacing-sm);
		}

		/* Character sheet container: allow absolute-positioned controls inside */
		.sheet {
			position: relative;
		}

		.character-sheet-wrap {
			position: relative;
		}

		.remove-from-group {
			position: absolute;
			right: 1rem;
			bottom: 1rem;
			background: var(--danger);
			color: white;
			border: none;
			padding: 0.5rem 0.75rem;
			border-radius: var(--radius-sm);
			cursor: pointer;
		}

		.remove-from-group:disabled {
			opacity: 0.6;
			cursor: not-allowed;
		}

		.members-layout {
			display: flex;
			flex-direction: row;
			gap: var(--spacing-md);
			margin-top: var(--spacing-md);
		}

		.members-list {
			display: flex;
			flex-direction: column;
			gap: var(--spacing-sm);
		}

		.members-sheets {
			display: flex;
			flex-direction: column;
			gap: var(--spacing-md);
		}

		.member-block {
			border: 1px solid var(--border-color);
			padding: var(--spacing-sm);
			border-radius: var(--radius-sm);
			background: var(--background-color);
		}

		.controls {
			display: flex;
			align-items: center;
			gap: var(--spacing-sm);
			margin-top: var(--spacing-md);
		}

		.spacer {
			flex: 1;
		}

		.empty {
			color: var(--muted-text);
			padding: var(--spacing-md);
		}

		.error {
			color: var(--danger);
		}
	}

	@media screen and (max-width: 768px) {
		.parties-page {
			flex-wrap: wrap;
		}

		.list {
			width: 100% !important;
			height: fit-content;

			.content {
				max-height: 150px;
				overflow-y: scroll;
			}
		}
	}
</style>
