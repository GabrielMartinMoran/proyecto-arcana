<script lang="ts">
	import Container from '$lib/components/ui/Container.svelte';
	import InputField from '$lib/components/ui/InputField.svelte';
	import { useFirebaseService } from '$lib/services/firebase-service';
	import { Character } from '$lib/types/character';
	import { get } from 'svelte/store';
	import ModifiersList from '../elements/ModifiersList.svelte';

	type Props = {
		character: Character;
		onChange: (character: Character) => void;
	};

	let { character, onChange }: Props = $props();

	// Firebase helper used to fetch party metadata (ownerId) when Party ID is entered.
	const firebase = useFirebaseService();

	/**
	 * When the Party ID field changes we set only the canonical `partyId`.
	 * We may read the party document to show information, but we DO NOT write a nested
	 * `character.party` object. `partyOwnerId` is populated by the persistent save flow.
	 */
	async function onPartyIdChange(value: string) {
		const pid = value?.toString()?.trim();
		// Capture previous partyId so we can attempt to remove the character from that party if needed.
		const prevPid = character.party.partyId;

		// If empty, clear partyId and remove character from previous party members mapping (best-effort)
		if (!pid) {
			// Clear local fields so UI reflects the change immediately
			character.party.partyId = null;
			character.party.ownerId = null;
			onChange(character);

			// Best-effort removal from party members subcollection (if any)
			if (prevPid && character.id) {
				try {
					const current = get(firebase.user as any);
					const uid = current ? current.uid : null;
					// Prefer concrete helper if available
					if (uid && typeof (firebase as any).removePartyMember === 'function') {
						await (firebase as any).removePartyMember(prevPid, uid, character.id);
						console.debug('[SettingsTab] removePartyMember succeeded', {
							prevPid,
							uid,
							cid: character.id,
						});
					} else {
						// Fallback: try to update the party document members map directly (best-effort)
						try {
							const partyDoc = await (firebase as any).loadParty(prevPid);
							if (partyDoc) {
								const existingMembers = partyDoc.members ?? {};
								const arr = Array.isArray(existingMembers[uid]) ? existingMembers[uid] : [];
								const idx = arr.indexOf(character.id);
								if (idx !== -1) arr.splice(idx, 1);
								if (arr.length === 0) delete existingMembers[uid];
								else existingMembers[uid] = arr;
								// Try to persist back to server; use saveParty if exposed
								if (typeof (firebase as any).saveParty === 'function') {
									await (firebase as any).saveParty({ ...partyDoc, members: existingMembers });
								}
							}
						} catch (e2) {
							console.warn('[SettingsTab] fallback removePartyMember/saveParty failed', e2);
						}
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
			// Read-only: we fetched party info for UX only. We DO NOT persist a nested object here.
			// The canonical field `character.partyId` is set above; `partyOwnerId` will be denormalized
			// by the save flow (server/service) when the character is persisted.
		} catch (err) {
			// Best-effort: log the failure to read party info
			console.warn('[SettingsTab] Failed to read party info', err);
			character.party = {
				partyId: null,
				ownerId: null,
			};
		} finally {
			// Notify parent about the change so the character is persisted like other fields
			onChange(character);

			// Best-effort: add this character to the party.members mapping so it appears in the party UI.
			// This call will be awaited so we can surface an error if it fails (visible feedback).
			try {
				const current = get(firebase.user as any);
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
						} else {
							// Fallback: try to update the party document members map directly
							try {
								const partyDoc = await (firebase as any).loadParty(pid);
								if (partyDoc) {
									// If the party doc exposes members map, merge locally and try save via parties service
									const existingMembers = partyDoc.members ?? {};
									const arr = Array.isArray(existingMembers[uid]) ? existingMembers[uid] : [];
									if (!arr.includes(character.id)) {
										arr.push(character.id);
										existingMembers[uid] = arr;
										// Try to persist back to server; use saveParty if exposed
										if (typeof (firebase as any).saveParty === 'function') {
											await (firebase as any).saveParty({ ...partyDoc, members: existingMembers });
										}
									}
								}
							} catch (e2) {
								console.warn('[SettingsTab] fallback setPartyMember/saveParty failed', e2);
								try {
									alert('No se pudo añadir el personaje a la lista de miembros del grupo.');
								} catch {}
							}
						}
					} catch (e) {
						console.warn('[SettingsTab] setPartyMember failed (awaited)', e);
						try {
							alert('No se pudo registrar el personaje en el grupo (permiso denegado o error).');
						} catch {}
					}
				}
			} catch (e) {
				/* ignore errors in best-effort background task */
			}
		}
	}
</script>

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
		<InputField
			label="Party ID"
			value={character.party.partyId ?? ''}
			fullWidth={true}
			placeholder="ID del grupo (opcional)"
			textAlign="left"
			onChange={(value) => {
				// When party id changes, set partyId. partyOwnerId will be denormalized on save.
				onPartyIdChange(String(value));
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
