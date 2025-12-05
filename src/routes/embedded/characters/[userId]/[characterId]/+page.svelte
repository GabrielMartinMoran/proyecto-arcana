<script lang="ts">
	import CharacterSheet from '$lib/components/character-sheet/CharacterSheet.svelte';
	import RollModal from '$lib/components/RollModal.svelte';
	import { useFirebaseService } from '$lib/services/firebase-service';
	import { useRollTargetService } from '$lib/services/roll-target-service';
	import { useDiceRollerService } from '$lib/services/dice-roller-service';
	import { page } from '$app/stores';
	import { onMount, onDestroy } from 'svelte';
	import { Character } from '$lib/types/character';
	import { get } from 'svelte/store';
	import { useFoundryVTTService } from '$lib/services/foundryvtt-service';
	import '../../../../../app.css';

	// route params (will be retrieved on client mount)
	let userId: string | undefined = undefined;
	let characterId: string | undefined = undefined;

	// services
	const firebase = useFirebaseService();
	const rollTarget = useRollTargetService();
	// Initialize dice roller service so roll modal and target subscription are active
	const dice = useDiceRollerService();

	const { isInsideFoundry, syncCharacterState } = useFoundryVTTService();

	// Local UI state
	let loading: boolean = true;
	let error: string | null = null;
	let errorDetails: string | null = null;
	let character: Character | undefined = undefined;
	let unsubscribeShared: (() => void) | null = null;

	let currentTab: string = 'general';

	function shortMsg(e: unknown): string {
		try {
			if (!e) return String(e);
			if (typeof e === 'string') return e;
			const anyE: any = e;
			if (anyE?.message) return String(anyE.message);
			return String(anyE);
		} catch {
			return String(e);
		}
	}

	async function trySetRollTargetFromCharacter(ch: Character | undefined) {
		try {
			if (!ch || !ch.party || !ch.party.partyId) {
				try {
					(rollTarget as any).setPersonalTarget();
				} catch {
					/* ignore */
				}
				return;
			}
			const pid = ch.party.partyId;
			try {
				const p = await (firebase as any).loadParty(pid);
				const pname = p && p.name ? p.name : undefined;
				try {
					(rollTarget as any).setPartyTarget(pid, pname);
				} catch {
					/* ignore */
				}
			} catch {
				try {
					(rollTarget as any).setPartyTarget(pid);
				} catch {
					/* ignore */
				}
			}
		} catch {
			/* ignore */
		}
	}

	async function persistCharacter(updated: Character) {
		try {
			const u: any = get(firebase.user as any);
			if (!u) return;
			if (
				u.uid === userId ||
				(updated.party && updated.party.ownerId && u.uid === updated.party.ownerId)
			) {
				await (firebase as any).saveCharactersForUser(userId as string, [updated]);
				if (isInsideFoundry()) {
					syncCharacterState(updated);
				}
			}
		} catch (e) {
			console.error('[embed-character] save failed', e);
			errorDetails = shortMsg(e);
		}
	}

	function handleTabChange(tab: string) {
		currentTab = tab || 'general';
		try {
			const u = new URL(window.location.href);
			if (tab) u.searchParams.set('tab', tab);
			else u.searchParams.delete('tab');
			history.replaceState(history.state, '', u.toString());
		} catch {
			/* ignore */
		}
	}

	function canEdit(): boolean {
		try {
			const u: any = get(firebase.user as any);
			if (!u || !character) return false;
			if (u.uid === userId) return true;
			if (character.party && character.party.ownerId && u.uid === character.party.ownerId)
				return true;
			return false;
		} catch {
			return false;
		}
	}

	const setCharacter = (ch: Character) => {
		character = ch;
		if (isInsideFoundry()) {
			syncCharacterState(character);
		}
	};

	onMount(async () => {
		// retrieve params from page store (client-side)
		try {
			const p = get(page);
			userId = p?.params?.userId;
			characterId = p?.params?.characterId;
		} catch {
			// fallback: leave undefined
		}

		// init tab from URL if present
		try {
			currentTab = new URL(window.location.href).searchParams.get('tab') ?? 'general';
		} catch {
			currentTab = 'general';
		}

		loading = true;
		error = null;
		errorDetails = null;

		if (!userId || !characterId) {
			loading = false;
			error = 'Parámetros de ruta inválidos.';
			return;
		}

		try {
			await firebase.initFirebase();
		} catch (e) {
			console.error('[embed-character] initFirebase failed', e);
			loading = false;
			error = 'No se pudo inicializar los servicios.';
			errorDetails = shortMsg(e);
			return;
		}

		// ensure listener function exists
		if (!firebase || typeof (firebase as any).listenCharactersByIds !== 'function') {
			console.error('[embed-character] listenCharactersByIds not available', { firebase });
			loading = false;
			error = 'No se pudo suscribir al personaje.';
			errorDetails = 'listenCharactersByIds missing';
			return;
		}

		try {
			const unsub = (firebase as any).listenCharactersByIds(
				[{ userId, characterId }],
				async (chars: any[]) => {
					try {
						const foundRaw = (chars || []).find((c) => c && c.id === characterId);
						if (foundRaw) {
							try {
								setCharacter(new Character(foundRaw));
							} catch (e) {
								console.error('[embed-character] Character constructor failed', e, { foundRaw });
								loading = false;
								error = 'Ocurrió un error al procesar los datos del personaje.';
								errorDetails = shortMsg(e);
								return;
							}
							loading = false;
							error = null;
							await trySetRollTargetFromCharacter(character);
							return;
						}

						// fallback: explicit load
						try {
							const list = await (firebase as any).loadCharactersForUser(userId);
							const fb = (list || []).find((c: any) => c && c.id === characterId);
							if (fb) {
								try {
									setCharacter(new Character(fb));
								} catch (e) {
									console.error('[embed-character] Character ctor (fallback) failed', e, { fb });
									loading = false;
									error = 'Ocurrió un error al procesar los datos del personaje.';
									errorDetails = shortMsg(e);
									return;
								}
								loading = false;
								error = null;
								await trySetRollTargetFromCharacter(character);
								return;
							} else {
								loading = false;
								error = 'No se encontró el personaje.';
								return;
							}
						} catch (fallbackErr) {
							console.error('[embed-character] fallback loadCharactersForUser failed', fallbackErr);
							loading = false;
							error = 'No se encontró el personaje. Revisa la consola.';
							errorDetails = shortMsg(fallbackErr);
							return;
						}
					} catch (listenerErr) {
						console.error('[embed-character] listener callback error', listenerErr);
						loading = false;
						error = 'Ocurrió un error al cargar el personaje.';
						errorDetails = shortMsg(listenerErr);
					}
				},
			);
			unsubscribeShared = typeof unsub === 'function' ? unsub : null;
		} catch (subscribeErr) {
			console.error('[embed-character] subscribe failed', subscribeErr);
			loading = false;
			error = 'No se pudo suscribir al personaje.';
			errorDetails = shortMsg(subscribeErr);
			return;
		}
	});

	onDestroy(() => {
		if (unsubscribeShared) {
			try {
				unsubscribeShared();
			} catch {
				/* ignore */
			}
			unsubscribeShared = null;
		}
		try {
			(rollTarget as any).setPersonalTarget();
		} catch {
			/* ignore */
		}
	});
</script>

<svelte:head>
	<title>Ficha embebida</title>
	<meta name="viewport" content="width=device-width, initial-scale=1" />
</svelte:head>

<div class="page">
	{#if loading}
		<div class="status">Cargando personaje...</div>
	{:else if error}
		<div class="status">{error}</div>
		{#if errorDetails}
			<div class="status" style="margin-top:8px; white-space:pre-wrap">{errorDetails}</div>
		{/if}
	{:else if character}
		<CharacterSheet
			{character}
			readonly={!canEdit()}
			onChange={(ch: Character) => {
				// update local, set roll target according to the (possibly changed) character,
				// then persist if allowed. We intentionally don't await setting the target to
				// avoid blocking UI; the dice-roller service will pick up the target change.
				character = ch;
				trySetRollTargetFromCharacter(ch);
				persistCharacter(ch).catch((e) => {
					console.error('[embed-character] persistCharacter error', e);
				});
			}}
			{currentTab}
			onTabChange={handleTabChange}
			allowPartyChange={true}
		/>
		<RollModal />
	{:else}
		<div class="status">Personaje no disponible.</div>
	{/if}
</div>

<style>
	:global(html, body) {
		height: 100%;
		margin: 0;
	}
	.page {
		display: flex;
		flex-direction: column;
		padding: 0.5rem;
		box-sizing: border-box;
		min-height: 100vh;
		background: transparent;
	}
	.status {
		padding: 0.75rem;
		border: 1px solid #ddd;
		border-radius: 6px;
	}
</style>
