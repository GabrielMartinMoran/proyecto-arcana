<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { onMount } from 'svelte';
	import { get } from 'svelte/store';

	import Container from '$lib/components/ui/Container.svelte';

	import PartySheet from '$lib/components/party-sheet/PartySheet.svelte';
	import { useFirebaseService } from '$lib/services/firebase-service';
	import { usePartiesService } from '$lib/services/parties-service';
	import { Party } from '$lib/types/party';

	// Services
	const firebase = useFirebaseService();
	const partiesSvc = usePartiesService();

	// Stores
	const parties = partiesSvc.parties;
	const user = firebase.user;

	// URL sync: reflect ?partyId= in the page
	let selectedPartyId: string | null = $derived(page.url.searchParams.get('partyId'));

	// Local UI state
	let editingParty: Party | null = $state(null);
	let membersUnsub: (() => void) | null = null;
	let isSaving = $state(false);

	// Handler for sheet tab changes (keeps URL in sync)

	// Debounced auto-save
	let saveTimer: ReturnType<typeof setTimeout> | null = null;
	const AUTOSAVE_DELAY = 700;

	function scheduleSave() {
		if (!editingParty) return;
		if (saveTimer) clearTimeout(saveTimer);
		saveTimer = setTimeout(async () => {
			saveTimer = null;
			await doSaveParty();
		}, AUTOSAVE_DELAY);
	}

	async function doSaveParty() {
		if (!editingParty) return;
		isSaving = true;
		try {
			// Ensure ownerId set if logged
			const u = get(user);
			if (u && (!editingParty.ownerId || editingParty.ownerId === '')) {
				editingParty.ownerId = u.uid;
			}
			await partiesSvc.saveParty(editingParty);
			// refresh from store (to get normalized server form)
			const fresh = get(parties).find((p) => p.id === editingParty!.id);
			editingParty = fresh ? new Party(fresh) : new Party(editingParty as any);
		} catch (err) {
			console.error('[parties-page] save failed', err);
		} finally {
			isSaving = false;
		}
	}

	// Load parties initially and start listeners
	onMount(async () => {
		await partiesSvc.loadParties();
		// If URL has a partyId, select it
		const pid = $derived(page.url.searchParams.get('partyId'));
		if (pid) {
			selectedPartyId = pid;
			const p = get(parties).find((x) => x.id === pid);
			if (p) editingParty = new Party(p);
		}
	});

	// When user clicks a party in list: update URL and selection
	async function openParty(party: Party) {
		// cleanup any previous members listener
		try {
			if (membersUnsub) {
				membersUnsub();
				membersUnsub = null;
			}
		} catch {
			/* ignore */
		}

		if (!party) {
			editingParty = null;
			selectedPartyId = null;
			// remove partyId from URL
			page.url.searchParams.delete('partyId');
			goto(`?${page.url.searchParams.toString()}`);
			return;
		}

		selectedPartyId = party.id;
		editingParty = new Party(party);

		// update URL
		page.url.searchParams.set('partyId', party.id);
		goto(`?${page.url.searchParams.toString()}`);

		// Best-effort: include characters that have been joined to this party by setting partyId
		// in their character documents. We query across users to find characters referencing this party
		// and merge them into the party.members map so they appear in the UI immediately.
		try {
			// Try to load characters that reference this party across users
			const items = await firebase.loadCharactersByParty(party.id);
			// items: { userId, character }
			for (const it of items) {
				const uid = it.userId ?? '';
				const ch = it.character;
				if (!uid || !ch || !ch.id) continue;
				const arr = editingParty.members[uid] ?? [];
				if (!arr.includes(ch.id)) arr.push(ch.id);
				editingParty.members[uid] = arr;
			}
			// refresh reactive object
			editingParty = new Party(editingParty as any);
		} catch (err) {
			console.warn('[parties-page] loadCharactersByParty failed (non-blocking):', err);
			// Fallback: try to read party.members subcollection or top-level members directly and merge
			try {
				// Try reading subcollection members documents first
				const membersMap = (firebase as any).loadPartyMembers
					? await (firebase as any).loadPartyMembers(party.id)
					: null;
				if (membersMap && typeof membersMap === 'object' && Object.keys(membersMap).length > 0) {
					for (const uid of Object.keys(membersMap)) {
						const ids = Array.isArray(membersMap[uid]) ? membersMap[uid] : [];
						const arr = editingParty.members[uid] ?? [];
						for (const cid of ids) {
							if (!arr.includes(cid)) arr.push(cid);
						}
						editingParty.members[uid] = arr;
					}
					editingParty = new Party(editingParty as any);
				} else {
					// fallback to reading top-level members map in party doc
					const pd = await firebase.loadParty(party.id);
					if (pd && pd.members) {
						for (const uid of Object.keys(pd.members)) {
							const ids = Array.isArray(pd.members[uid]) ? pd.members[uid] : [];
							const arr = editingParty.members[uid] ?? [];
							for (const cid of ids) {
								if (!arr.includes(cid)) arr.push(cid);
							}
							editingParty.members[uid] = arr;
						}
						editingParty = new Party(editingParty as any);
					} else {
						// No members found in fallback; original error already logged above
					}
				}
			} catch (fallbackErr) {
				console.warn('[parties-page] fallback load of party.members failed:', fallbackErr);
			}
		}

		// Attach real-time listener to members subcollection so new member docs are observed immediately.
		try {
			if ((firebase as any).listenPartyMembers) {
				membersUnsub = (firebase as any).listenPartyMembers(
					party.id,
					(membersMap: Record<string, string[]>) => {
						// merge membersMap into editingParty.members
						if (!editingParty) return;
						for (const uid of Object.keys(membersMap)) {
							const ids = Array.isArray(membersMap[uid]) ? membersMap[uid] : [];
							const arr = editingParty.members[uid] ?? [];
							for (const cid of ids) {
								if (!arr.includes(cid)) arr.push(cid);
							}
							editingParty.members[uid] = arr;
						}
						// refresh reactive object
						editingParty = new Party(editingParty as any);
					},
				);
			}
		} catch (listenErr) {
			console.warn('[parties-page] failed to attach members subcollection listener:', listenErr);
		}
	}

	// Create party
	async function createParty() {
		const created = await partiesSvc.createParty('Nuevo Grupo');
		openParty(created);
	}

	// Delete party
	async function deleteParty() {
		if (!editingParty) return;
		const ok = confirm(`¿Eliminar el grupo "${editingParty.name}"?`);
		if (!ok) return;
		isDeleting = true;
		try {
			await partiesSvc.deleteParty(editingParty.id);

			// cleanup attached members listener if any
			try {
				if (membersUnsub) {
					membersUnsub();
					membersUnsub = null;
				}
			} catch {
				/* ignore */
			}

			editingParty = null;
			page.url.searchParams.delete('partyId');
			goto(`?${page.url.searchParams.toString()}`);
		} catch (err) {
			console.error('[parties-page] delete failed', err);
			alert('Error al eliminar el grupo');
		} finally {
			isDeleting = false;
		}
	}

	// Members: the party stores members as map userId -> [charId,...]

	// When selecting a different party id externally (URL change), update editingParty
	$effect(() => {
		const pid = page.url.searchParams.get('partyId');
		if (pid && (!editingParty || editingParty.id !== pid)) {
			const p = get(parties).find((x) => x.id === pid);
			if (p) {
				editingParty = new Party(p);
				selectedPartyId = pid;
			} else {
				// if not in local store, clear selection
				editingParty = null;
				selectedPartyId = null;
			}
		}
	});
</script>

<section class="parties-page">
	<div class="list" role="navigation" aria-label="Lista de grupos">
		<div class="header">
			<button onclick={createParty} title="Crear">➕</button>
			<button onclick={deleteParty} title="Eliminar" disabled={$user?.uid !== editingParty?.ownerId}
				>🗑️</button
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
						<span class="owner" title="Owner">{party.ownerId === $user?.uid ? '👑' : '👥'}</span>
					{/if}
					<span class="name">{party.name}</span>
				</button>
			{/each}
		</div>
	</div>

	<div class="viewport">
		{#if editingParty}
			<PartySheet
				party={editingParty}
				readonly={$user?.uid !== editingParty?.ownerId}
				onChange={(party) => {
					if (!editingParty) return;
					editingParty = party;
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
