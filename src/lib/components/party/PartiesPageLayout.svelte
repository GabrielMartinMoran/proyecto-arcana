<script lang="ts">
	import Container from '$lib/components/ui/Container.svelte';
	import InputField from '$lib/components/ui/InputField.svelte';
	import { useFirebaseService } from '$lib/services/firebase-service';
	import { Party } from '$lib/types/party';
	import { onMount } from 'svelte';
	import { get } from 'svelte/store';

	type Props = {
		// Service created by `usePartiesService()`; expected shape:
		// { loadParties, parties (store), createParty, saveParty, deleteParty, cleanup }
		service: any;
		readonly?: boolean;
	};

	let { service, readonly = false }: Props = $props();

	const firebase = useFirebaseService();
	const { user } = firebase;

	// Local UI state (use Svelte runes $state for reactive locals)
	let selectedPartyId: string | null = $state(null);
	let editingParty: Party | null = $state(null);
	let isSaving = $state(false);
	let isDeleting = $state(false);

	// Auto-save scheduling (debounce) so changes persist without pressing Save.
	let __saveTimeout: ReturnType<typeof setTimeout> | null = null;
	const scheduleSave = (delay = 800) => {
		// Defer if there's no editing party
		if (!editingParty) return;
		try {
			if (__saveTimeout) clearTimeout(__saveTimeout);
		} catch {
			/* ignore */
		}
		__saveTimeout = setTimeout(async () => {
			__saveTimeout = null;
			isSaving = true;
			try {
				// saveEditingParty is defined later; call it to persist current editingParty
				await (saveEditingParty as any)();
			} catch (err) {
				console.error('[parties-page] auto-save failed:', err);
			} finally {
				isSaving = false;
			}
		}, delay);
	};

	// convenience reference to store returned by service
	const partiesStore = service.parties;

	// load parties when component mounts
	onMount(async () => {
		try {
			await service.loadParties();
		} catch (err) {
			console.warn('[PartiesPageLayout] loadParties failed:', err);
		}
	});

	// derived helpers removed — not used in this layout

	// select a party and create an editable copy
	const selectParty = (party: Party | null) => {
		selectedPartyId = party ? party.id : null;
		editingParty = party ? new Party(party as any) : null;
	};

	// create a new party and select it
	const createParty = async () => {
		try {
			const created: Party = await service.createParty?.('Nuevo Grupo');
			if (created) selectParty(created);
		} catch (err) {
			console.error('[PartiesPageLayout] createParty failed', err);
			alert('Error creando el grupo');
		}
	};

	// save the current editing party
	const saveEditingParty = async () => {
		if (!editingParty) return;
		isSaving = true;
		try {
			// ensure ownerId set when user is signed in
			const u = get(user);
			if (u && (!editingParty.ownerId || editingParty.ownerId === '')) {
				editingParty.ownerId = u.uid;
			}
			await service.saveParty(editingParty);
			// refresh editing copy from store to reflect any normalization
			const fresh = (get(partiesStore) as Party[]).find((p) => p.id === editingParty!.id);
			editingParty = fresh ? new Party(fresh as any) : new Party(editingParty as any);
			selectedPartyId = editingParty.id;
		} catch (err) {
			console.error('[PartiesPageLayout] saveEditingParty failed', err);
			alert('Error guardando el grupo');
		} finally {
			isSaving = false;
		}
	};

	// delete selected party
	const deleteSelectedParty = async () => {
		if (!selectedPartyId) return;
		const proceed = confirm(`¿Eliminar el grupo seleccionado? Esta acción no se puede deshacer.`);
		if (!proceed) return;
		isDeleting = true;
		try {
			await service.deleteParty(selectedPartyId);
			selectParty(null);
		} catch (err) {
			console.error('[PartiesPageLayout] deleteSelectedParty failed', err);
			alert('Error eliminando el grupo');
		} finally {
			isDeleting = false;
		}
	};

	// notes helpers
	const addNote = () => {
		if (!editingParty) return;
		const id = crypto.randomUUID();
		editingParty.notes.push({ id, title: 'Nueva nota', content: '' });
		// force reactive update
		editingParty = new Party(editingParty as any);
		// schedule auto-save
		scheduleSave();
	};

	const removeNote = (noteId: string) => {
		if (!editingParty) return;
		editingParty.notes = editingParty.notes.filter((n) => n.id !== noteId);
		editingParty = new Party(editingParty as any);
		// schedule auto-save
		scheduleSave();
	};

	// members helpers
	let newMemberUserId = $state('');
	let newMemberCharId = $state('');

	const addMember = () => {
		if (!editingParty) return;
		if (!newMemberUserId || !newMemberCharId) return;
		const arr = editingParty.members[newMemberUserId] ?? [];
		if (!arr.includes(newMemberCharId)) arr.push(newMemberCharId);
		editingParty.members[newMemberUserId] = arr;
		editingParty = new Party(editingParty as any);
		newMemberUserId = '';
		newMemberCharId = '';
		// schedule auto-save
		scheduleSave();
	};

	const removeMemberCharacter = (userId: string, charId: string) => {
		if (!editingParty) return;
		const arr = editingParty.members[userId] ?? [];
		const idx = arr.indexOf(charId);
		if (idx !== -1) arr.splice(idx, 1);
		if (arr.length === 0) delete editingParty.members[userId];
		else editingParty.members[userId] = arr;
		editingParty = new Party(editingParty as any);
		// schedule auto-save
		scheduleSave();
	};
</script>

<section class="parties-page">
	<div class="list">
		<div class="header">
			<h2>Grupos</h2>
			<div class="actions">
				{#if !readonly}
					<button onclick={createParty} title="Crear grupo">➕</button>
				{/if}
				<button onclick={() => selectParty(null)} title="Cerrar selección">✖</button>
			</div>
		</div>

		<div class="content">
			{#if $partiesStore.length === 0}
				<div class="empty">No tienes grupos. Crea uno con ➕</div>
			{/if}

			{#each $partiesStore as party (party.id)}
				<button
					class="party-item"
					class:selected={selectedPartyId === party.id}
					onclick={() => selectParty(party)}
				>
					<span class="name">{party.name}</span>
					{#if party.ownerId}
						<span class="owner" title="Owner">{party.ownerId === $user?.uid ? '👑' : '👥'}</span>
					{/if}
				</button>
			{/each}
		</div>
	</div>

	<div class="viewport">
		{#if editingParty}
			<Container title="Detalle del Grupo">
				<div class="sheet">
					<div class="row">
						<InputField
							label="Nombre"
							value={editingParty?.name ?? ''}
							fullWidth={true}
							onChange={(v) => {
								if (!editingParty) return;
								editingParty.name = String(v);
								editingParty = new Party(editingParty as any);
								// schedule auto-save for name change
								scheduleSave();
							}}
						/>
					</div>

					<div class="row two-columns">
						<div>
							<label for="notes">Notas</label>
							<div class="notes">
								{#each editingParty?.notes ?? [] as note (note.id)}
									<div class="note">
										<InputField
											label="Título"
											value={note.title}
											onChange={(v) => {
												note.title = String(v);
												editingParty = new Party(editingParty as any);
												// schedule auto-save for note title changes
												scheduleSave();
											}}
										/>
										<textarea
											id="notes"
											class="note-content"
											bind:value={note.content}
											oninput={() => {
												editingParty = new Party(editingParty as any);
												// schedule auto-save for note content edits
												scheduleSave();
											}}
										></textarea>
										<button class="small" onclick={() => removeNote(note.id)}>Eliminar</button>
									</div>
								{/each}
								{#if !readonly}
									<button onclick={addNote}>➕ Añadir nota</button>
								{/if}
							</div>
						</div>

						<div>
							<label for="members">Miembros</label>
							<div class="members">
								{#if Object.keys(editingParty?.members ?? {}).length === 0}
									<div class="empty">Sin miembros</div>
								{/if}
								{#each Object.keys(editingParty?.members ?? {}) as userId (userId)}
									<div class="member-block">
										<div class="member-header">
											<strong>{userId}</strong>
										</div>
										<ul>
											{#each editingParty?.members?.[userId] ?? [] as charId (charId)}
												<li>
													{charId}
													{#if !readonly}
														<button
															class="small"
															onclick={() => removeMemberCharacter(userId, charId)}
														>
															Eliminar
														</button>
													{/if}
												</li>
											{/each}
										</ul>
									</div>
								{/each}

								{#if !readonly}
									<div class="add-member">
										<InputField
											label="UserId"
											value={newMemberUserId}
											onChange={(v) => (newMemberUserId = String(v))}
										/>
										<InputField
											label="CharacterId"
											value={newMemberCharId}
											onChange={(v) => (newMemberCharId = String(v))}
										/>
										<button onclick={addMember}>Añadir miembro</button>
									</div>
								{/if}
							</div>
						</div>
					</div>

					<div class="controls">
						{#if !readonly}
							<button class="save" onclick={saveEditingParty} disabled={isSaving}>
								{#if isSaving}Guardando...{:else}Guardar{/if}
							</button>
							<button class="danger" onclick={deleteSelectedParty} disabled={isDeleting}>
								Eliminar
							</button>
						{:else}
							<span class="muted">Modo sólo lectura</span>
						{/if}
					</div>
				</div>
			</Container>
		{:else}
			<Container title="Selecciona un grupo">
				<p>Selecciona un grupo de la lista o crea uno nuevo con ➕</p>
			</Container>
		{/if}
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
		padding: var(--spacing-md);
		box-sizing: border-box;
	}

	.list {
		width: 320px;
		border: 1px solid var(--border-color);
		padding: var(--spacing-md);
		border-radius: var(--radius-md);
		background-color: var(--secondary-bg);
		display: flex;
		flex-direction: column;
	}

	.header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: var(--spacing-sm);
	}

	.actions button {
		margin-left: var(--spacing-sm);
	}

	.content {
		display: flex;
		flex-direction: column;
		gap: var(--spacing-sm);
		max-height: calc(100vh - 200px);
		overflow-y: auto;
	}

	.empty {
		color: var(--muted-text);
		padding: var(--spacing-md);
	}

	.party-item {
		display: flex;
		flex-direction: row;
		justify-content: space-between;
		align-items: center;
		padding: var(--spacing-sm);
		border-radius: var(--radius-sm);
		border: none;
		background: transparent;
		cursor: pointer;
	}

	.party-item.selected {
		background: var(--selected-bg);
		border-left: 4px solid var(--selected-border);
	}

	.viewport {
		flex: 1;
	}

	.sheet {
		display: flex;
		flex-direction: column;
		gap: var(--spacing-md);
	}

	.row {
		display: flex;
		flex-direction: column;
		gap: var(--spacing-sm);
	}

	.two-columns {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: var(--spacing-md);
	}

	.notes .note {
		border: 1px solid var(--border-color);
		padding: var(--spacing-sm);
		border-radius: var(--radius-sm);
		margin-bottom: var(--spacing-sm);
		background: var(--background-color);
	}

	.note-content {
		min-height: 5rem;
		width: 100%;
	}

	.members .member-block {
		border: 1px solid var(--border-color);
		padding: var(--spacing-sm);
		border-radius: var(--radius-sm);
		margin-bottom: var(--spacing-sm);
		background: var(--background-color);
	}

	.add-member {
		display: flex;
		flex-direction: column;
		gap: var(--spacing-sm);
		margin-top: var(--spacing-sm);
	}

	.controls {
		display: flex;
		gap: var(--spacing-sm);
		align-items: center;
	}

	.save {
		background: var(--primary);
		color: white;
		border: none;
		padding: 0.6rem 1rem;
		border-radius: var(--radius-sm);
	}

	.danger {
		background: var(--danger);
		color: white;
		border: none;
		padding: 0.6rem 1rem;
		border-radius: var(--radius-sm);
	}

	.muted {
		color: var(--muted-text);
	}
</style>
