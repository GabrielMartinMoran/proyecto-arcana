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
	import Container from '../ui/Container.svelte';
	import TitleField from '../ui/TitleField.svelte';

	type Props = {
		party: Party;
		readonly: boolean;
		onChange: (party: Party) => void;
	};

	let { party, readonly, onChange }: Props = $props();

	const firebase = useFirebaseService();
	const user = firebase.user;

	let selectedCharacterId: string | null = $derived(page.url.searchParams.get('characterId'));
	let currentCharacterSheetTab: string = $derived(
		page.url.searchParams.get('sheetTab') ?? CONFIG.DEFAULT_CHARACTER_SHEET_TAB,
	);
	let currentPartySheetTab: string = $derived(
		page.url.searchParams.get('tab') ?? CONFIG.DEFAULT_PARTY_SHEET_TAB,
	);

	let selectedCharacter: Character | undefined = $derived(
		party?.characters.find((c) => c.id === selectedCharacterId),
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
		selectedCharacter = party.characters.find((c) => c.id === charId);
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

	// Save a member's character (used by owner editing someone else's char)
	async function saveMemberCharacter(memberUserId: string, character: Character) {
		try {
			await firebase.saveCharactersForUser(memberUserId, [character]);
		} catch (err) {
			console.error('[parties-page] saveMemberCharacter failed', err);
		}
	}

	// Remove currently selected character from the party members map and persist.
	// Only updates the party locally and triggers a save; callers should ensure
	// appropriate permissions (UI already limits visibility).
	async function removeSelectedCharacterFromParty() {
		if (!party || !selectedCharacterId || !selectedCharacter) return;
		const proceed = confirm(
			`¿Seguro que quieres eliminar a '${selectedCharacter.name}' del grupo?`,
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
			await saveMemberCharacter(owner, selectedCharacter);

			// 3) Actualizar localmente para que la UI refleje el cambio ya (aunque el doc ya quedó bien)
			const arr = party.members[owner] ?? [];
			const idx = arr.indexOf(selectedCharacterId);
			if (idx !== -1) arr.splice(idx, 1);
			if (arr.length === 0) delete party.members[owner];
			else party.members[owner] = arr;

			party = party.copy();
			onChange(party);
		} catch (err) {
			console.error('[parties-page] removeSelectedCharacterFromParty failed', err);
		}

		// 4) Limpiar selección de la UI/URL
		selectedCharacterId = null;
		selectedCharacter = undefined;
		page.url.searchParams.delete('characterId');
		page.url.searchParams.delete('tab');
		goto(`?${page.url.searchParams.toString()}`);
	}

	// Reactive safe members alias to avoid null checks in templates/helpers
	let safeMembers: Record<string, string[]> = $derived(party ? party.members : {});
	// Helper: find owner userId for charId inside party (uses safeMembers)
	const getCharacterOwner = (charId: string) => {
		for (const uid of Object.keys(safeMembers)) {
			if ((safeMembers[uid] || []).includes(charId)) return uid;
		}
		return null;
	};

	const copyPartyId = () => {
		navigator.clipboard.writeText(party.id);
		alert(
			'ID de invitación copiado al portapapeles!\n\nPásaselo a tus jugadores para que agreguen sus personajes al grupo desde la pestaña de configuración de las hojas de personaje.',
		);
	};
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
				onChange(party.copy());
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
		<span class="spacer"></span>
		<button onclick={copyPartyId}> Copiar ID de invitación </button>
	</div>

	{#if currentPartySheetTab === 'members'}
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

				{#if Object.keys(party?.members ?? {}).length === 0}
					<div class="empty">
						<p>No hay miembros en este grupo!</p>
						<p>
							Pueder invitar a otros personajes copiando el ID de invitación y compartiendolo con
							ellos.
						</p>
					</div>
				{:else if selectedCharacter}
					<Container>
						<CharacterSheet
							character={selectedCharacter}
							readonly={readonly && getCharacterOwner(selectedCharacter.id) !== $user?.uid}
							onChange={async (character: Character) => {
								const u = get(user);
								const characterOwner = getCharacterOwner(character.id);
								if (!characterOwner) {
									console.error('No owner found for character', character.id);
									return;
								}
								if (u && u.uid === party.ownerId) {
									console.log('Saving member character as owner');
									await saveMemberCharacter(characterOwner, character);
								} else if (u && u.uid === characterOwner) {
									console.log('Saving other user character');
									await firebase.saveCharactersForUser(characterOwner, [character]);
								}
							}}
							currentTab={currentCharacterSheetTab}
							onTabChange={onCharacterSheetTabChange}
							allowPartyChange={false}
						/>
						{#if !readonly}
							<div class="actions">
								<button
									class="danger"
									onclick={async () => {
										await removeSelectedCharacterFromParty();
									}}
								>
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
	{:else}
		<div class="notes-tab">
			<Container title="Notas">
				<Notes notes={party.notes} {readonly} onChange={(notes) => onNotesChange(notes)} />
			</Container>
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

		.members-tab {
			display: flex;
			flex-direction: column;
			gap: var(--spacing-md);

			.tabs {
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
		}

		.spacer {
			flex-grow: 1;
		}
	}
</style>
