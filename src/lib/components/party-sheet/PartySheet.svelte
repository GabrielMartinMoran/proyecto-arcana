<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { dialogService } from '$lib/services/dialog-service.svelte';
	import { useFirebaseService } from '$lib/services/firebase-service';
	import type { Character } from '$lib/types/character';
	import { Party } from '$lib/types/party';
	import { get } from 'svelte/store';
	import { CONFIG } from '../../../config';
	import TitleField from '../ui/TitleField.svelte';
	import PartyMembersTab from './tabs/PartyMembersTab.svelte';
	import PartyNotesTab from './tabs/PartyNotesTab.svelte';
	import PartySeeAsMDTab from './tabs/PartySeeAsMDTab.svelte';

	type Props = {
		party: Party;
		readonly: boolean;
		onChange: (party: Party) => void;
	};

	let { party, readonly, onChange }: Props = $props();

	const firebase = useFirebaseService();
	const { user } = firebase;

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

	const copyPartyId = async () => {
		await navigator.clipboard.writeText(party.id);
		await dialogService.alert(
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
		<button
			class:selected={currentPartySheetTab === 'see_as_md'}
			onclick={() => onPartySheetTabChange('see_as_md')}
		>
			Ver como MD
		</button>
		<span class="spacer"></span>
		<button onclick={copyPartyId}> Copiar ID de invitación </button>
	</div>

	{#if currentPartySheetTab === 'members'}
		<PartyMembersTab {party} {readonly} {onChange} />
	{:else if currentPartySheetTab === 'see_as_md'}
		<PartySeeAsMDTab {party} {readonly} {onChange} />
	{:else}
		<PartyNotesTab {party} {readonly} {onChange} />
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
