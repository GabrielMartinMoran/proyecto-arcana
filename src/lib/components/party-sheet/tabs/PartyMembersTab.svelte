<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import CharacterSheet from '$lib/components/character-sheet/CharacterSheet.svelte';
	import Container from '$lib/components/ui/Container.svelte';
	import { dialogService } from '$lib/services/dialog-service.svelte';
	import { useFirebaseService } from '$lib/services/firebase-service';
	import { usePartiesService } from '$lib/services/parties-service';
	import type { Character } from '$lib/types/character';
	import { Party } from '$lib/types/party';
	import { get } from 'svelte/store';
	import { CONFIG } from '../../../../config';

	type Props = {
		party: Party;
		readonly: boolean;
		onChange: (party: Party) => void;
	};

	let { party, readonly, onChange }: Props = $props();

	const firebase = useFirebaseService();
	const partiesService = usePartiesService();
	const { user } = firebase;

	let selectedCharacterId: string | null = $derived(page.url.searchParams.get('characterId'));
	let currentCharacterSheetTab: string = $derived(
		page.url.searchParams.get('sheetTab') ?? CONFIG.DEFAULT_CHARACTER_SHEET_TAB,
	);

	let selectedCharacter: Character | undefined = $derived(
		party?.characters.find((c) => c.id === selectedCharacterId),
	);

	// Reactive safe members alias to avoid null checks in templates/helpers
	let safeMembers: Record<string, string[]> = $derived(party ? party.members : {});

	// Helper: find owner userId for charId inside party (uses safeMembers)
	const getCharacterOwner = (charId: string) => {
		for (const uid of Object.keys(safeMembers)) {
			if ((safeMembers[uid] || []).includes(charId)) return uid;
		}
		return null;
	};

	const canEditCharacter = (charId: string) => {
		const u = get(user);
		const characterOwner = getCharacterOwner(charId);
		return Boolean(u && characterOwner && (u.uid === party.ownerId || u.uid === characterOwner));
	};

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

	async function saveEditedMemberCharacter(memberUserId: string, character: Character) {
		try {
			await partiesService.savePartyMemberCharacter(party.id, memberUserId, character);
		} catch (err) {
			console.error('[PartyMembersTab] saveEditedMemberCharacter failed', err);
		}
	}

	async function saveRemovedMemberCharacter(memberUserId: string, character: Character) {
		try {
			await firebase.saveCharactersForUser(memberUserId, [character]);
		} catch (err) {
			console.error('[PartyMembersTab] saveRemovedMemberCharacter failed', err);
		}
	}

	// Remove currently selected character from the party members map and persist.
	// Only updates the party locally and triggers a save; callers should ensure
	// appropriate permissions (UI already limits visibility).
	async function removeSelectedCharacterFromParty() {
		if (!party || !selectedCharacterId || !selectedCharacter) return;
		const proceed = await dialogService.confirm(
			`¿Seguro que quieres eliminar a '${selectedCharacter.name}' del grupo?`,
			{ title: 'Confirmar eliminación', confirmLabel: 'Eliminar', cancelLabel: 'Cancelar' },
		);
		if (!proceed) return;
		const owner = getCharacterOwner(selectedCharacterId);
		const u = get(user);
		if (!owner || !u || u.uid !== party.ownerId) return;

		try {
			// 1) Borrar membresía en Firebase (esto SÍ borra la key members.<owner> si queda vacía)
			await firebase.removePartyMember(party.id, owner, selectedCharacterId);

			// 2) Actualizar el character: limpiar partyId y persistir al dueño del character
			selectedCharacter.party.partyId = null;
			selectedCharacter.party.ownerId = null;
			await saveRemovedMemberCharacter(owner, selectedCharacter);

			// 3) Actualizar localmente para que la UI refleje el cambio ya (aunque el doc ya quedó bien)
			const arr = party.members[owner] ?? [];
			const idx = arr.indexOf(selectedCharacterId);
			if (idx !== -1) arr.splice(idx, 1);
			if (arr.length === 0) delete party.members[owner];
			else party.members[owner] = arr;

			party = party.copy();
			onChange(party);
		} catch (err) {
			console.error('[PartyMembersTab] removeSelectedCharacterFromParty failed', err);
		}

		// 4) Limpiar selección de la UI/URL
		selectedCharacterId = null;
		page.url.searchParams.delete('characterId');
		page.url.searchParams.delete('tab');
		goto(`?${page.url.searchParams.toString()}`);
	}
</script>

<div class="members-tab">
	<Container title="Miembros">
		<!-- Horizontal character tabs above the character sheet.
				 Use the same .tabs / .tab classes as the character sheet so styles match. -->
		<div class="tabs">
			{#each party.characters as character (character.id)}
				<button
					class="tab"
					class:selected={selectedCharacterId === character.id}
					onclick={() => selectCharacter(character.id)}
				>
					{character.name}
				</button>
			{/each}
		</div>

		{#if selectedCharacter}
			<Container>
				<CharacterSheet
					character={selectedCharacter}
					readonly={!canEditCharacter(selectedCharacter.id)}
					onChange={async (character: Character) => {
						const characterOwner = getCharacterOwner(character.id);
						if (!characterOwner) {
							console.error('[PartyMembersTab] No owner found for character', character.id);
							return;
						}
						if (canEditCharacter(character.id)) {
							await saveEditedMemberCharacter(characterOwner, character);
						}
					}}
					currentTab={currentCharacterSheetTab}
					onTabChange={onCharacterSheetTabChange}
					allowPartyChange={false}
				/>
				{#if !readonly}
					<div class="actions">
						<button class="danger" onclick={removeSelectedCharacterFromParty}>
							Eliminar del grupo
						</button>
					</div>
				{/if}
			</Container>
		{:else}
			<div class="empty">Selecciona un personaje arriba para ver su ficha aquí.</div>
		{/if}
	</Container>
</div>

<style>
	.members-tab {
		display: flex;
		flex-direction: column;
		gap: var(--spacing-md);
	}

	.members-tab .tabs {
		display: flex;
		flex-direction: row;
		flex-wrap: wrap;
		gap: var(--spacing-sm);
		margin-bottom: var(--spacing-sm);
	}

	.actions {
		display: flex;
		flex-direction: row;
		justify-content: end;
		align-items: center;
		gap: var(--spacing-md);
		margin-top: var(--spacing-md);
	}

	.empty {
		color: var(--muted-text);
		padding: var(--spacing-md);
		text-align: center;
	}
</style>
