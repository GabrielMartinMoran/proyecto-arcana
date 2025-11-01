<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { useFirebaseService } from '$lib/services/firebase-service';
	import { Character } from '$lib/types/character';
	import { Party } from '$lib/types/party';
	import { get } from 'svelte/store';
	import { CONFIG } from '../../../config';
	import CharacterSheet from '../character-sheet/CharacterSheet.svelte';
	import Notes from '../character-sheet/elements/Notes.svelte';
	import TitleField from '../ui/TitleField.svelte';

	type Props = {
		party: Party;
		readonly: boolean;
		onChange: (party: Party) => void;
	};

	let { party, readonly, onChange }: Props = $props();

	const firebase = useFirebaseService();
	const user = firebase.user;

	// Member characters cache: map userId -> Character[]
	const memberCharactersCache: Record<string, Character[]> = {};

	let selectedCharacterId: string | null = $derived(page.url.searchParams.get('characterId'));
	let currentCharacterSheetTab: string = $derived(
		page.url.searchParams.get('sheetTab') ?? CONFIG.DEFAULT_CHARACTER_SHEET_TAB,
	);
	let currentPartySheetTab: string = $derived(
		page.url.searchParams.get('tab') ?? CONFIG.DEFAULT_PARTY_SHEET_TAB,
	);

	// Select a character (sync URL so selection survives reload)
	const selectCharacter = (charId: string | null) => {
		if (!charId) {
			page.url.searchParams.delete('characterId');
			page.url.searchParams.delete('sheetTab');
			goto(`?${page.url.searchParams.toString()}`);
			selectedCharacterId = null;
			return;
		}
		page.url.searchParams.set('characterId', charId);
		// default to DEFAULT_TAB when opening a character
		page.url.searchParams.set('sheetTab', CONFIG.DEFAULT_CHARACTER_SHEET_TAB);
		goto(`?${page.url.searchParams.toString()}`);
		selectedCharacterId = charId;
	};

	const onCharacterSheetTabChange = (tab: string) => {
		page.url.searchParams.set('sheetTab', tab);
		goto(`?${page.url.searchParams.toString()}`);
	};

	const onPartySheetTabChange = (tab: string) => {
		page.url.searchParams.set('tab', tab);
		goto(`?${page.url.searchParams.toString()}`);
	};

	const onNotesChange = (notes: { id: string; title: string; content: string }[]) => {
		party.notes = notes;
		onChange(new Party(party));
	};

	// TO REVIEW

	// Load a single character by id (returns { ownerId, character } or null)
	async function loadCharacterById(charId: string | null) {
		if (!charId) return null;
		const owner = ownerOfChar(charId);
		if (!owner) return null;
		const list = await loadMemberCharacters(owner);
		const ch = list.find((c) => c.id === charId) ?? null;
		return ch ? { ownerId: owner, character: ch } : null;
	}

	// Load member characters for a given userId on demand
	async function loadMemberCharacters(userId: string) {
		try {
			// If cache exists, return
			if (memberCharactersCache[userId]) return memberCharactersCache[userId];
			// Use firebase service to load characters for that user
			await firebase.initFirebase();
			const chars = await firebase.loadCharactersForUser(userId);
			memberCharactersCache[userId] = chars;
			return chars;
		} catch (err) {
			console.error('[parties-page] loadMemberCharacters failed', userId, err);
			return [];
		}
	}

	// Helper to find a character object inside a loaded char list by id
	// Used by the template to avoid repeating .find(...) calls.
	function findChar(charList: Character[] | null | undefined, charId: string) {
		if (!charList) return null;
		return charList.find((c) => c.id === charId) ?? null;
	}

	// Save a member's character (used by owner editing someone else's char)
	async function saveMemberCharacter(memberUserId: string, character: Character) {
		try {
			await firebase.saveCharactersForUser(memberUserId, [character]);
			// refresh cache
			memberCharactersCache[memberUserId] = memberCharactersCache[memberUserId].map((c) =>
				c.id === character.id ? new (Character as any)(character) : c,
			);
		} catch (err) {
			console.error('[parties-page] saveMemberCharacter failed', err);
		}
	}

	// Remove currently selected character from the party members map and persist.
	// Only updates the party locally and triggers a save; callers should ensure
	// appropriate permissions (UI already limits visibility).
	async function removeSelectedCharacterFromParty() {
		if (!party || !selectedCharacterId) return;
		const owner = ownerOfChar(selectedCharacterId);
		if (!owner) return;
		// mutate members deterministically
		const arr = party.members[owner] ?? [];
		const idx = arr.indexOf(selectedCharacterId);
		if (idx !== -1) arr.splice(idx, 1);
		if (arr.length === 0) delete party.members[owner];
		else party.members[owner] = arr;
		// refresh reactive object
		party = new Party(party as any);
		// persist immediately
		try {
			onChange(party);
		} catch (err) {
			console.error('[parties-page] removeSelectedCharacterFromParty save failed', err);
		}
		// clear selection from URL and local state
		selectedCharacterId = null;
		page.url.searchParams.delete('characterId');
		page.url.searchParams.delete('tab');
		goto(`?${page.url.searchParams.toString()}`);
	}

	// Reactive safe members alias to avoid null checks in templates/helpers
	let safeMembers: Record<string, string[]> = $derived(party ? party.members : {});
	// Helper: find owner userId for charId inside party (uses safeMembers)
	function ownerOfChar(charId: string) {
		for (const uid of Object.keys(safeMembers)) {
			if ((safeMembers[uid] || []).includes(charId)) return uid;
		}
		return null;
	}
</script>

<div class="party-sheet">
	<!-- Header: name inline editable -->
	<div class="row header-row">
		<TitleField
			value={party.name}
			{readonly}
			onChange={(v) => {
				if (!party) return;
				party.name = String(v);
				onChange(new Party(party));
			}}
		/>
	</div>

	<!-- Tabs: Miembros / Notas -->
	<div class="tabs">
		<button
			class:selected={currentPartySheetTab === 'members'}
			onclick={() => onPartySheetTabChange('members')}
		>
			Miembros
		</button>
		<button
			class:selected={currentPartySheetTab === 'notes'}
			onclick={() => onPartySheetTabChange('notes')}
		>
			Notas
		</button>
	</div>

	{#if currentPartySheetTab === 'members'}
		<!-- Members layout: single column showing horizontal tabs and the selected character sheet -->
		<div class="members-layout">
			<div class="members-sheePts">
				<h3>Hojas de Miembros</h3>

				<!-- Horizontal character tabs above the character sheet.
							 Use the same .tabs / .tab classes as the character sheet so styles match. -->
				<div class="tabs">
					{#each Object.keys(party.members) as memberUserId (memberUserId)}
						{#await loadMemberCharacters(memberUserId) then charList}
							{#each party.members[memberUserId] as charId (charId)}
								{@const ch = findChar(charList, charId)}
								<button
									class="tab"
									class:selected={selectedCharacterId === charId}
									onclick={() => selectCharacter(charId)}
								>
									{ch ? ch.name : charId}
								</button>
							{/each}
						{:catch}
							<!-- ignore errors for tab rendering -->
						{/await}
					{/each}
				</div>

				{#if selectedCharacterId}
					{#await loadCharacterById(selectedCharacterId) then res}
						{#if res}
							<div class="character-sheet-wrap">
								<CharacterSheet
									character={res.character}
									{readonly}
									onChange={async (updated: Character) => {
										const u = get(user);
										if (u && u.uid === party.ownerId) {
											console.log('Saving member character as owner');
											await saveMemberCharacter(res.ownerId, updated);
										} else if (u && u.uid === res.ownerId) {
											console.log('Saving other user character');
											await firebase.saveCharactersForUser(res.ownerId, [updated]);
										}
									}}
									currentTab={currentCharacterSheetTab}
									onTabChange={onCharacterSheetTabChange}
								/>
								{#if !readonly}
									<button
										class="remove-from-group"
										onclick={async () => {
											await removeSelectedCharacterFromParty();
										}}
									>
										Eliminar del grupo
									</button>
								{/if}
							</div>
						{:else}
							<div class="empty">Personaje no encontrado o no accesible.</div>
						{/if}
					{:catch err}
						<div class="error">Error cargando personaje: {String(err)}</div>
					{/await}
				{:else}
					<div class="empty">Selecciona un personaje arriba para ver su ficha aquí.</div>
				{/if}
			</div>
		</div>
	{:else}
		<!-- Notes tab: reuse existing Notes component -->
		<div class="notes-tab">
			<Notes notes={party.notes} {readonly} onChange={(notes) => onNotesChange(notes)} />
		</div>
	{/if}
</div>

<style>
	.party-sheet {
		display: flex;
		flex-direction: column;
		gap: var(--spacing-md);
		width: 100%;

		.tabs {
			display: flex;
			flex-direction: row;
			flex-wrap: wrap;
			gap: var(--spacing-sm);
		}
	}
</style>
