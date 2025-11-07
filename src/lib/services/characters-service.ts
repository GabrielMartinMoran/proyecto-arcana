import { resolve } from '$app/paths';
import { useFirebaseService } from '$lib/services/firebase-service';
import { Character } from '$lib/types/character';
import { get, writable } from 'svelte/store';

const STORAGE_KEY = 'arcana:characters';
const PENDING_DELETES_KEY = 'arcana:pendingCharacterDeletes';
const UPDATE_STORE_DEBOUNCE_MS = 500;
const LOCAL_EDIT_GUARD_MS = 1500;

const state = {
	charactersStore: writable<Character[]>([]),
	exampleCharactersStore: writable<Character[]>([]),
	charactersAlreadyLoaded: false,
	exampleCharactersAlreadyLoaded: false,
};

let currentUserId: string | null = null;
let unsubscribeAuth: (() => void) | null = null;
let unsubscribeRemote: (() => void) | null = null;
let storeUnsub: (() => void) | null = null;
let applyingRemoteUpdate = false;
let scheduledStoreUpdate = null as NodeJS.Timeout | null;

// Track last local edit timestamps per character to guard against remote snapshot overwrites
const lastLocalEditAt: Record<string, number> = {};
const prevSnapshotById: Map<string, string> = new Map();

const firebase = useFirebaseService();

// pending deletes queue persisted locally so deletions survive reloads
const pendingDeletes: string[] = (() => {
	try {
		const raw = (() => {
			try {
				return localStorage.getItem(PENDING_DELETES_KEY);
			} catch {
				return null;
			}
		})();
		return raw ? JSON.parse(raw) : [];
	} catch {
		return [];
	}
})();

const persistPendingDeletes = () => {
	try {
		localStorage.setItem(PENDING_DELETES_KEY, JSON.stringify(pendingDeletes));
	} catch (e) {
		console.warn('[characters-service] Failed to persist pending deletes', e);
	}
};

/**
 * Try to process pending deletes for the given user.
 * We attempt each queued delete; on success we remove it from the queue and persist.
 * Failures are logged and retried later (on next sign-in or next processing attempt).
 */
const processPendingDeletes = async (userId: string) => {
	if (!userId) return;
	if (!firebase.isEnabled()) return;

	// Work on a copy so we can modify the original during iteration
	for (const id of [...pendingDeletes]) {
		try {
			await firebase.deleteCharacterForUser(userId, id);
			// remove from pendingDeletes and persist
			const idx = pendingDeletes.indexOf(id);
			if (idx !== -1) {
				pendingDeletes.splice(idx, 1);
				persistPendingDeletes();
			}
			console.info('[characters-service] Successfully processed pending delete for', id);
		} catch (err) {
			console.warn('[characters-service] Failed to process pending delete for', id, err);
			// Leave it in the queue for retry later
		}
	}
};

/**
 * Subscribe persistence for the characters store.
 * When a user is logged in and Firebase is enabled, saves to Firestore.
 * Otherwise falls back to localStorage.
 *
 * The subscription is idempotent (only one subscription will exist).
 */
const subscribePersistance = () => {
	if (storeUnsub) return;
	storeUnsub = state.charactersStore.subscribe(async (characters: Character[]) => {
		// If the update originated from remote snapshot, do not echo back
		if (applyingRemoteUpdate) return;

		// Mark locally edited characters (by comparing with previous snapshots)
		try {
			const now = Date.now();
			for (const c of characters) {
				if (!c || !c.id) continue;
				const snap = JSON.stringify(c);
				const prev = prevSnapshotById.get(c.id);
				if (prev !== snap) {
					// Record the local edit time so remote snapshots arriving shortly after
					// will preserve the local edit. Do NOT update prevSnapshotById here:
					// prevSnapshotById must reflect what was actually persisted to the backend
					// so change detection for incremental saves stays accurate.
					lastLocalEditAt[c.id] = now;
				}
			}
			// Cleanup entries for characters that are no longer present
			const currentIds = new Set(characters.map((c) => c.id));
			for (const key of Array.from(prevSnapshotById.keys())) {
				if (!currentIds.has(key)) {
					prevSnapshotById.delete(key);
					delete lastLocalEditAt[key];
				}
			}
		} catch {
			/* ignore marking errors */
		}

		// Serialize once and always persist locally first so reloads reflect the latest local state
		const serialized = JSON.stringify(characters);
		try {
			localStorage.setItem(STORAGE_KEY, serialized);
		} catch (err) {
			console.warn('Error saving characters to localStorage:', err);
		}

		// Then attempt to persist to Firestore if user is signed-in and firebase is enabled.
		// Failures here should not revert the local state (we keep localStorage as source of truth until sync).
		try {
			if (currentUserId && firebase.isEnabled()) {
				// Save into Firestore, non-blocking
				if (scheduledStoreUpdate) {
					clearTimeout(scheduledStoreUpdate);
				}
				// Persist only characters that actually changed since the last saved snapshot.
				// We detect changes by comparing the serialized snapshot stored in prevSnapshotById.
				// This avoids sending the whole user characters array to Firestore when only a
				// subset of characters were modified.
				scheduledStoreUpdate = setTimeout(async () => {
					scheduledStoreUpdate = null;
					try {
						console.debug('[characters-service] preparing changed characters save (debounced)');
						const start = Date.now();
						const toSave: Character[] = [];
						const now = Date.now();
						for (const c of characters) {
							if (!c || !c.id) continue;
							const snap = JSON.stringify(c);
							const prev = prevSnapshotById.get(c.id);
							if (prev !== snap) {
								// Mark as changed locally; we'll update prevSnapshotById only when the save succeeds
								toSave.push(c);
								lastLocalEditAt[c.id] = now;
							}
						}
						const ids = toSave.map((t) => t.id);
						console.debug('[characters-service] changed characters detected', {
							count: toSave.length,
							ids,
						});
						// Only send changed characters to the backend; the backend performs upserts per-character.
						if (toSave.length > 0 && currentUserId && firebase.isEnabled()) {
							try {
								await firebase.saveCharactersForUser(currentUserId!, toSave);
								// On success, update prevSnapshotById for the saved characters so future diffs are minimal
								for (const s of toSave) {
									if (s?.id) prevSnapshotById.set(s.id, JSON.stringify(s));
								}
								const duration = Date.now() - start;
								console.debug('[characters-service] saved changed characters to remote', {
									count: toSave.length,
									ids,
									duration,
								});
							} catch (err) {
								console.error(
									'[characters-service] Error saving changed characters to remote:',
									err,
								);
								// On failure, ensure these ids remain candidates for the next save attempt by
								// not updating prevSnapshotById (we didn't set it yet), so they will be retried.
							}
						} else {
							console.debug('[characters-service] no changed characters to save');
						}
					} catch (err) {
						console.error('[characters-service] Error preparing changed characters save:', err);
					}
				}, UPDATE_STORE_DEBOUNCE_MS);
			}
		} catch (error) {
			console.error('Error persisting characters to cloud:', error);
		}
	});
};

/**
 * Stop persistence subscription (used in cleanup paths, not strictly necessary in SPA).
 */
const stopPersistance = () => {
	if (storeUnsub) {
		try {
			storeUnsub();
		} catch {
			/* ignore */
		}
		storeUnsub = null;
	}
};

/**
 * Start listening to remote characters for the given user id.
 * The listener will replace the local store when snapshots are received.
 */
const startRemoteListener = (userId: string) => {
	// Ensure previous listener removed
	if (unsubscribeRemote) {
		try {
			unsubscribeRemote();
		} catch {
			/* ignore */
		}
		unsubscribeRemote = null;
	}

	unsubscribeRemote = firebase.listenCharactersForUser(userId, (characters: Character[]) => {
		// Avoid triggering the persistance subscription while applying remote update
		applyingRemoteUpdate = true;
		try {
			// Merge remote snapshot with local edits: only update affected characters so UI is stable
			const local = get(state.charactersStore) as Character[];
			const now = Date.now();

			// Build quick lookup of remote entries
			const remoteById = new Map<string, any>();
			for (const c of characters) {
				if (c?.id) remoteById.set(c.id, c);
			}

			// Start from a copy of local array so we only modify affected entries
			const updated = [...local];

			// Update or add remote entries
			for (const c of characters) {
				const id = c?.id;
				if (!id) continue;
				const recentLocalEdit =
					lastLocalEditAt[id] !== undefined && now - lastLocalEditAt[id] < LOCAL_EDIT_GUARD_MS;
				if (recentLocalEdit) {
					// Preserve recent local edit
					continue;
				}
				const inst = new Character(c);
				// Update snapshot tracker with the applied value
				prevSnapshotById.set(id, JSON.stringify(inst));
				const idx = updated.findIndex((l) => l?.id === id);
				if (idx !== -1) {
					updated[idx] = inst;
				} else {
					updated.push(inst);
				}
			}

			// Remove local entries that no longer exist remotely (unless recently edited locally)
			for (let i = updated.length - 1; i >= 0; i--) {
				const id = updated[i]?.id;
				if (!id) continue;
				if (!remoteById.has(id)) {
					const recentLocalEdit =
						lastLocalEditAt[id] !== undefined && now - lastLocalEditAt[id] < LOCAL_EDIT_GUARD_MS;
					if (!recentLocalEdit) {
						updated.splice(i, 1);
						prevSnapshotById.delete(id);
					}
				}
			}

			// Apply merged result (only changed items will cause component updates)
			state.charactersStore.set(updated);
		} finally {
			// Small safeguard: allow future local modifications to persist
			applyingRemoteUpdate = false;
		}
	});
};

const stopRemoteListener = () => {
	if (unsubscribeRemote) {
		try {
			unsubscribeRemote();
		} catch {
			/* ignore */
		}
		unsubscribeRemote = null;
	}
};

export const useCharactersService = () => {
	const loadCharacters = async () => {
		if (state.charactersAlreadyLoaded) return;

		// Initialize firebase (this is idempotent and safe if firebase is not configured)
		try {
			// initFirebase will be a no-op in development or when config is missing
			await firebase.initFirebase();
		} catch (err) {
			// continue: init is defensive, but log any unexpected error
			console.warn('Firebase init error (continuing with local persistence):', err);
		}

		// Subscribe to auth changes. This keeps the characters store in sync with the signed user.
		// If Firebase is not enabled, onAuthState will immediately callback with null.
		try {
			unsubscribeAuth = await firebase.onAuthState(async (user) => {
				const previousUser = currentUserId;
				currentUserId = user ? user.uid : null;

				// If user changed from one to another, stop previous remote listener
				if (previousUser && previousUser !== currentUserId) {
					stopRemoteListener();
				}

				// If we have a signed user and firebase is enabled, start remote listener
				if (currentUserId && firebase.isEnabled()) {
					try {
						startRemoteListener(currentUserId);
						// Attempt to process any pending deletes for this user in background.
						// Do not block the UI; just schedule and log errors.
						processPendingDeletes(currentUserId).catch((err) => {
							console.warn('[characters-service] processPendingDeletes failed:', err);
						});
					} catch (err) {
						console.error('[characters-service] Error starting remote listener:', err);
					}
				} else {
					// No remote user: stop any remote listener and load local cached characters
					stopRemoteListener();

					// If no user, try to load characters from localStorage as fallback
					const rawLoaded = localStorage.getItem(STORAGE_KEY);
					if (rawLoaded) {
						try {
							const characters = JSON.parse(rawLoaded);
							state.charactersStore.set(characters.map((x) => new Character(x)));
						} catch (error) {
							console.error('Error parsing characters JSON:', error);
						}
					} else {
						// If firebase is enabled but user not signed-in, keep store empty
						state.charactersStore.set([]);
					}
				}
			});
		} catch (err) {
			// If onAuthState throws or init didn't complete, ensure store fallback
			console.warn('Auth listener setup error (continuing with local persistence):', err);
			const rawLoaded = localStorage.getItem(STORAGE_KEY);
			if (rawLoaded) {
				try {
					const characters = JSON.parse(rawLoaded);
					state.charactersStore.set(characters.map((x) => new Character(x)));
				} catch (error) {
					console.error('Error parsing characters JSON:', error);
				}
			}
		}

		// Ensure we persist local changes to the appropriate backend (localStorage or Firestore)
		subscribePersistance();

		state.charactersAlreadyLoaded = true;
	};

	const loadExampleCharacters = async () => {
		if (state.exampleCharactersAlreadyLoaded) return;
		let characters: any[] = [];
		try {
			const response = await fetch(resolve('/docs/example-characters.json'));
			characters = await response.json();
		} catch (error) {
			console.error('Error fetching example characters:', error);
		}
		try {
			state.exampleCharactersStore.set(characters.map((x) => new Character(x)));
		} catch (error) {
			console.error('Error parsing example characters JSON:', error);
		}
		state.exampleCharactersAlreadyLoaded = true;
	};

	/**
	 * Convenience: delete a character locally and in cloud (if user signed in).
	 */
	const deleteCharacter = async (characterId: string) => {
		// Update local store immediately so the UI reflects deletion
		state.charactersStore.update((characters) => characters.filter((c) => c.id !== characterId));

		// Add to pending deletes queue (persist immediately) so deletion survives reloads
		try {
			if (!pendingDeletes.includes(characterId)) {
				pendingDeletes.push(characterId);
				persistPendingDeletes();
			}
		} catch (e) {
			console.warn('[characters-service] Failed to queue pending delete:', e);
		}

		// Try immediate cloud deletion if possible. If it fails, the id remains queued and
		// will be retried by processPendingDeletes when the user signs in / listener starts.
		if (currentUserId && firebase.isEnabled()) {
			try {
				await firebase.deleteCharacterForUser(currentUserId, characterId);
				// remove from pending deletes if successful
				const idx = pendingDeletes.indexOf(characterId);
				if (idx !== -1) {
					pendingDeletes.splice(idx, 1);
					persistPendingDeletes();
				}
			} catch (err) {
				console.warn('[characters-service] Immediate cloud delete failed, queued for retry:', err);
				// Do not attempt to sync the entire characters collection as a fallback here.
				// The single failed delete is already queued in `pendingDeletes` and will be
				// retried when the user signs in or when `processPendingDeletes` runs.
				// Syncing the full set here could overwrite concurrent remote state and is
				// an unnecessary heavy-handed operation for a single failed delete.
			}
		}
	};

	return {
		loadCharacters: loadCharacters,
		loadExampleCharacters: loadExampleCharacters,
		characters: state.charactersStore,
		exampleCharacters: state.exampleCharactersStore,
		deleteCharacter,
		cleanup: () => {
			// Cleanup any active subscriptions/listeners. Safe to call multiple times.
			if (unsubscribeAuth) {
				try {
					unsubscribeAuth();
				} catch {
					/* ignore */
				}
				unsubscribeAuth = null;
			}
			// stop remote listener and persistence subscription
			stopRemoteListener();
			stopPersistance();
		},
	};
};
