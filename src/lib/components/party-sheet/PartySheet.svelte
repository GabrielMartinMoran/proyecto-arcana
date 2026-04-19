<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { dialogService } from '$lib/services/dialog-service.svelte';
	import { Party } from '$lib/types/party';
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

	let currentPartySheetTab: string = $derived(
		page.url.searchParams.get('tab') ?? CONFIG.DEFAULT_PARTY_SHEET_TAB,
	);

	const onPartySheetTabChange = (tab: string) => {
		page.url.searchParams.set('tab', tab);
		goto(`?${page.url.searchParams.toString()}`);
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
