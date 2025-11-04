<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import Container from '$lib/components/ui/Container.svelte';
	import InputField from '$lib/components/ui/InputField.svelte';
	import { useFirebaseService } from '$lib/services/firebase-service';
	import { Character } from '$lib/types/character';
	import { get } from 'svelte/store';
	import ModifiersList from '../elements/ModifiersList.svelte';

	type Props = {
		character: Character;
		onChange: (character: Character) => void;
		allowPartyChange;
	};

	let { character, onChange, allowPartyChange }: Props = $props();

	// Firebase helper used to fetch party metadata (ownerId) when Party ID is entered.
	const firebase = useFirebaseService();

	// Estado local: nombre del grupo (si existe)
	let partyName: string | null = $state(null);

	// Cargar el nombre del grupo cuando hay un partyId inicial o cambie
	$effect(() => {
		const pid = character?.party?.partyId ?? null;
		if (!pid) {
			partyName = null;
			return;
		}
		(async () => {
			try {
				await firebase.initFirebase();
				const party = await firebase.loadParty(pid as string);
				console.log('[SettingsTab] Getting party name');
				partyName = party?.name ?? null;
			} catch {
				partyName = null;
			}
		})();
	});

	/**
	 * When the Party ID field changes we set only the canonical `partyId`.
	 * We may read the party document to show information, but we DO NOT write a nested
	 * `character.party` object. `partyOwnerId` is populated by the persistent save flow.
	 */
	async function onPartyIdChange(value: string | null) {
		const pid: string | null = value?.toString()?.trim() || null;
		// Capture previous partyId so we can attempt to remove the character from that party if needed.
		const prevPid = character.party.partyId;

		// If empty, clear partyId and remove character from previous party members mapping (best-effort)
		if (!pid) {
			// Clear local fields so UI reflects the change immediately
			character.party.partyId = null;
			character.party.ownerId = null;
			partyName = null;
			onChange(character);

			// Best-effort removal from party members subcollection (if any)
			if (prevPid && character.id) {
				try {
					const current: any = get(firebase.user as any);
					const uid = current ? current.uid : null;
					// Prefer concrete helper if available
					if (uid && typeof (firebase as any).removePartyMember === 'function') {
						await (firebase as any).removePartyMember(prevPid, uid, character.id);
						console.debug('[SettingsTab] removePartyMember succeeded', {
							prevPid,
							uid,
							cid: character.id,
						});
					}
				} catch (e) {
					console.warn('[SettingsTab] removePartyMember failed (awaited)', e);
				}
			}

			return;
		}

		// Always set the legacy partyId field so older code reading that works too
		character.party.partyId = pid;

		try {
			await firebase.initFirebase();
			const party = await firebase.loadParty(pid);
			character.party.ownerId = party?.ownerId ?? null;
			partyName = party?.name ?? null;
			// Read-only: we fetched party info for UX only. We DO NOT persist a nested
			// The canonical field `character.partyId` is set above; `partyOwnerId` will be denormalized
			// by the save flow (server/service) when the character is persisted.
		} catch (err) {
			// Best-effort: log the failure to read party info
			console.warn('[SettingsTab] Failed to read party info', err);
			character.party = {
				partyId: null,
				ownerId: null,
			};
			partyName = null;
		} finally {
			// Notify parent about the change so the character is persisted like other fields
			onChange(character);

			// Best-effort: add this character to the party.members mapping so it appears in the party UI.
			// This call will be awaited so we can surface an error if it fails (visible feedback).
			try {
				const current: any = get(firebase.user as any);
				const uid = current ? current.uid : null;
				if (uid && pid && character.id) {
					// call the service helper and await it; surface error if happens
					try {
						// Use the concrete helper if available
						if (typeof (firebase as any).setPartyMember === 'function') {
							await (firebase as any).setPartyMember(pid, uid, character.id);
							console.debug('[SettingsTab] setPartyMember succeeded', {
								pid,
								uid,
								cid: character.id,
							});
						}
					} catch (e) {
						console.warn('[SettingsTab] setPartyMember failed (awaited)', e);
						alert('No se pudo registrar el personaje en el grupo (permiso denegado o error).');
					}
				}
			} catch {
				/* ignore errors in best-effort background task */
			}
		}
	}

	const joinParty = async () => {
		const partyId = prompt('Introduce el ID del grupo al que quieres unirte:');
		if (!partyId) return;
		onPartyIdChange(partyId);
	};

	const leaveParty = async () => {
		const proceed = confirm('¿Seguro que quieres abandonar el grupo actual?');
		if (!proceed) return;
		onPartyIdChange(null);
	};

	const goToParty = () => {
		goto(resolve(`/parties?partyId=${character.party.partyId}`));
	};
</script>

{#if allowPartyChange}
	<Container title="Grupo">
		<div class="party">
			<InputField
				label="Grupo Actual"
				placeholder="Ninguno, pidele a tu DJ el ID del grupo"
				value={partyName ?? character.party.partyId ?? ''}
				readonly={true}
				fullWidth={true}
			/>
			<div class="buttons">
				{#if !character.party.partyId}
					<button onclick={joinParty}>Unirse a un Grupo</button>
				{:else}
					<button onclick={leaveParty}>Abandonar Grupo</button>
					<button onclick={goToParty}>Ver Grupo</button>
				{/if}
			</div>
		</div>
	</Container>
{/if}

<Container title="General">
	<div class="general">
		<InputField
			label="URL del Retrato"
			value={character.img ?? ''}
			fullWidth={true}
			placeholder="https://..."
			textAlign="left"
			onChange={(value) => {
				const strValue = value.toString();
				if (strValue.length > 0) {
					character.img = strValue;
				} else {
					character.img = null;
				}
				onChange(character);
			}}
		/>
	</div>
</Container>
<Container title="Modificadores">
	<div class="modifiers">
		<ModifiersList
			modifiers={character.modifiers}
			onChange={(modifiers) => {
				character.modifiers = modifiers;
				onChange(character);
			}}
		/>
		<small class="available-variables">
			<em>Varaibles disponibles: cuerpo, reflejos, mente, instinto, presencia.</em>
		</small>
	</div>
</Container>

<style>
	.party {
		display: flex;
		flex-direction: column;
		justify-content: center;
		align-items: center;
		gap: var(--spacing-md);

		.buttons {
			display: flex;
			flex-direction: row;
			justify-content: space-evenly;
			align-items: center;
			width: 100%;
			gap: var(--spacing-md);
		}
	}

	.general {
		display: flex;
		flex-direction: column;
	}

	.modifiers {
		display: flex;
		flex-direction: column;

		.available-variables {
			margin-top: var(--spacing-md);
		}
	}
</style>
