/**
 * Parties service - manages parties state and sync with Firebase
 *
 * Responsibilities:
 * - Maintain a Svelte writable store with the current user's visible parties.
 * - Persist parties to localStorage as primary local cache (through the subscription).
 * - When a user is authenticated and Firebase is enabled, listen to remote parties
 *   and persist local changes to Firestore via the firebase-service.
 *
 * This file was restored to the simpler behavior: no immediate localStorage writes
 * on create/save/delete and no local->remote eager sync. Persistence is handled
 * by the subscription to the store (same pattern as characters-service).
 */

import { createParty as factoryCreateParty } from '$lib/factories/party-factory';
import { useFirebaseService } from '$lib/services/firebase-service';
import type { Character } from '$lib/types/character';
import { Party } from '$lib/types/party';
import { get, writable } from 'svelte/store';

const STORAGE_KEY = 'arcana:parties';
const PENDING_DELETES_KEY = 'arcana:pendingPartyDeletes';
const UPDATE_STORE_DEBOUNCE_MS = 100;

const state = {
	partiesStore: writable<Party[]>([]),
	partiesAlreadyLoaded: false,
	scheduledStoreUpdate: null as NodeJS.Timeout | null,
};

let currentUserId: string | null = null;
let unsubscribeAuth: (() => void) | null = null;
let unsubscribeRemote: (() => void) | null = null;
let storeUnsub: (() => void) | null = null;
let applyingRemoteUpdate = false;

const firebase = useFirebaseService();

// pending deletes persisted locally so deletes survive reloads / offline
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
		console.warn('[parties-service] Failed to persist pending deletes', e);
	}
};

/**
 * Process queued deletes for the given user.
 * Attempts each queued delete; on success removes it from the queue.
 */
const processPendingDeletes = async (userId: string) => {
	if (!userId) return;
	if (!firebase.isEnabled()) return;

	for (const id of [...pendingDeletes]) {
		try {
			await firebase.deleteParty(id);
			const idx = pendingDeletes.indexOf(id);
			if (idx !== -1) {
				pendingDeletes.splice(idx, 1);
				persistPendingDeletes();
			}
			console.info('[parties-service] Processed pending delete for', id);
		} catch (err) {
			console.warn('[parties-service] Failed to process pending delete for', id, err);
			// leave in queue for retry later
		}
	}
};

/**
 * Subscribe persistence for the parties store.
 * Persist to localStorage always, and attempt to save to Firestore when possible.
 *
 * This subscription will not echo back remote-originated snapshots because we guard
 * with `applyingRemoteUpdate`.
 */
const subscribePersistence = () => {
	if (storeUnsub) return;
	storeUnsub = state.partiesStore.subscribe(async (parties: Party[]) => {
		// If the update originated from remote snapshot, do not echo back
		if (applyingRemoteUpdate) return;

		// Persist local cache first
		try {
			localStorage.setItem(STORAGE_KEY, JSON.stringify(parties));
		} catch (err) {
			console.warn('[parties-service] Error saving parties to localStorage:', err);
		}

		// Attempt to persist to Firestore when signed in and firebase enabled
		if (currentUserId && firebase.isEnabled()) {
			try {
				for (const p of parties) {
					try {
						await firebase.saveParty(p);
					} catch (err) {
						console.error('[parties-service] Failed saving party', p?.id, err);
						// continue with other parties
					}
				}
			} catch (err) {
				console.error('[parties-service] Error persisting parties to cloud:', err);
			}
		}
	});
};

const stopPersistence = () => {
	if (storeUnsub) {
		try {
			storeUnsub();
		} catch {
			/* ignore */
		}
		storeUnsub = null;
	}
};

const updatePartiesStore = (newParties: Party[]) => {
	for (const p of get(state.partiesStore)) {
		p.unsubscribeCharacterListener();
		p.unsubscribeCharacterListener = () => {};
	}
	if (!currentUserId) return;
	const accessibleParties = newParties.filter((p) => p.isAccessible(currentUserId!));
	for (const p of accessibleParties) {
		p.unsubscribeCharacterListener = firebase.listenCharactersByIds(
			p.getCharactersFullIdentifiers(),
			(characters: Character[]) => {
				console.log('[parties-service] detected character change for party', p.id);
				state.partiesStore.update((parties) => {
					const index = parties.findIndex((x) => x.id === p.id);
					if (index !== -1) {
						parties[index].characters = characters;
						parties[index] = parties[index].copy();
					}
					return [...parties];
				});
			},
		);
	}
	state.partiesStore.set(newParties);
};

/**
 * Start listening to remote parties for the given user id.
 * Replaces local store when snapshots are received.
 */
const startRemoteListener = (userId: string) => {
	console.debug('[parties-service] startRemoteListener called for', userId);
	if (unsubscribeRemote) {
		try {
			unsubscribeRemote();
		} catch {
			/* ignore */
		}
		unsubscribeRemote = null;
	}

	try {
		unsubscribeRemote = firebase.listenToUserParties(userId, (parties: Party[]) => {
			try {
				console.debug(
					'[parties-service] remote snapshot received for user',
					userId,
					'count=',
					parties?.length,
				);
			} catch {
				/* ignore debug formatting errors */
			}
			applyingRemoteUpdate = true;
			try {
				if (state.scheduledStoreUpdate) {
					clearTimeout(state.scheduledStoreUpdate);
				}
				state.scheduledStoreUpdate = setTimeout(() => {
					state.scheduledStoreUpdate = null;
					updatePartiesStore(parties);
				}, UPDATE_STORE_DEBOUNCE_MS);
			} finally {
				applyingRemoteUpdate = false;
				console.debug('[parties-service] applied remote snapshot for user', userId);
			}
		});
	} catch (err) {
		console.error('[parties-service] listenToUserParties setup failed for', userId, err);
	}
};

const stopRemoteListener = () => {
	if (unsubscribeRemote) {
		try {
			for (const p of get(state.partiesStore)) {
				p.unsubscribeCharacterListener();
			}
			unsubscribeRemote();
		} catch {
			/* ignore */
		}
		unsubscribeRemote = null;
	}
};

/**
 * Public service factory
 */
export const usePartiesService = () => {
	/**
	 * Load parties into the store.
	 * - Subscribes to auth state.
	 * - If a user is signed in and firebase enabled, starts remote listener.
	 * - Otherwise loads cached local parties from localStorage.
	 */
	const loadParties = async () => {
		if (state.partiesAlreadyLoaded) return;

		try {
			await firebase.initFirebase();
		} catch (err) {
			// Continue with local persistence if firebase init fails
			console.warn(
				'[parties-service] Firebase init error (continuing with local persistence):',
				err,
			);
		}

		try {
			unsubscribeAuth = await firebase.onAuthState(async (user) => {
				const previousUser = currentUserId;
				currentUserId = user ? user.uid : null;

				// If switching users, stop previous listener
				if (previousUser && previousUser !== currentUserId) {
					stopRemoteListener();
				}

				// If we have a signed user and firebase is enabled, start remote listener
				if (currentUserId && firebase.isEnabled()) {
					try {
						startRemoteListener(currentUserId);
						// Try to process pending deletes in background
						processPendingDeletes(currentUserId).catch((err) => {
							console.warn('[parties-service] processPendingDeletes failed:', err);
						});
					} catch (err) {
						console.error('[parties-service] Error starting remote listener:', err);
					}
				} else {
					// No remote user: stop any remote listener and load from localStorage
					stopRemoteListener();

					const rawLoaded = (() => {
						try {
							return localStorage.getItem(STORAGE_KEY);
						} catch {
							return null;
						}
					})();

					if (rawLoaded) {
						try {
							const parties = JSON.parse(rawLoaded);
							state.partiesStore.set(parties.map((x: any) => new Party(x)));
						} catch (err) {
							console.error('[parties-service] Error parsing parties JSON:', err);
						}
					} else {
						state.partiesStore.set([]);
					}
				}
			});
		} catch (err) {
			console.warn(
				'[parties-service] Auth listener setup error (continuing with local persistence):',
				err,
			);
			const rawLoaded = (() => {
				try {
					return localStorage.getItem(STORAGE_KEY);
				} catch {
					return null;
				}
			})();
			if (rawLoaded) {
				try {
					const parties = JSON.parse(rawLoaded);
					state.partiesStore.set(parties.map((x: any) => new Party(x)));
				} catch (err) {
					console.error('[parties-service] Error parsing parties JSON:', err);
				}
			}
		}

		// Ensure we persist local changes to the appropriate backend
		subscribePersistence();

		state.partiesAlreadyLoaded = true;
	};

	/**
	 * Create a new party, persist locally and attempt cloud save if possible.
	 */
	const createParty = async (name?: string): Promise<Party> => {
		const p = factoryCreateParty(currentUserId ?? undefined);
		if (name) p.name = name;
		// If we have a user id, set ownerId explicitly
		if (currentUserId) p.ownerId = currentUserId;

		console.debug('[parties-service] creating party locally', {
			id: p.id,
			ownerId: p.ownerId,
			name: p.name,
		});

		// Update local store
		state.partiesStore.update((parties) => {
			const out = [...parties, new Party(p)];
			try {
				console.debug('[parties-service] local parties count after create', out.length);
			} catch {}
			return out;
		});

		// Attempt immediate cloud save (best-effort)
		if (currentUserId && firebase.isEnabled()) {
			try {
				console.debug('[parties-service] attempting immediate cloud save for party', p.id);
				await firebase.saveParty(p);
				console.debug('[parties-service] immediate cloud save successful for party', p.id);
			} catch (err) {
				console.warn(
					'[parties-service] Failed to save party immediately, will rely on background sync:',
					p.id,
					err,
				);
			}
		}

		return new Party(p);
	};

	/**
	 * Save/update a single party (local + cloud attempt)
	 */
	const saveParty = async (party: Party) => {
		if (!party || !party.id) throw new Error('party.id required');

		console.debug('[parties-service] saveParty called for', party.id);

		// Update local store immediately
		state.partiesStore.update((parties) => {
			const idx = parties.findIndex((x) => x.id === party.id);
			const copy = new Party(party);
			let out: Party[];
			if (idx === -1) {
				out = [...parties, copy];
			} else {
				out = [...parties];
				out[idx] = copy;
			}
			try {
				console.debug(
					'[parties-service] local parties count after save',
					out.length,
					'partyId=',
					party.id,
				);
			} catch {}
			return out;
		});

		// Attempt cloud save
		if (currentUserId && firebase.isEnabled()) {
			try {
				console.debug('[parties-service] attempting cloud save for party', party.id);
				await firebase.saveParty(party);
				console.debug('[parties-service] cloud save successful for party', party.id);
			} catch (err) {
				console.error('[parties-service] Error saving party to cloud for', party.id, err);
			}
		}
	};

	/**
	 * Delete a party locally and attempt remote deletion. If remote deletion fails, queue it.
	 */
	const deleteParty = async (partyId: string) => {
		console.debug('[parties-service] deleteParty called for', partyId);

		// Remove from local store
		state.partiesStore.update((parties) => {
			const toDelete = parties.find((p) => p.id === partyId);
			if (toDelete) {
				toDelete.unsubscribeCharacterListener();
			}
			const out = parties.filter((p) => p.id !== partyId);
			try {
				console.debug('[parties-service] local parties count after delete', out.length);
			} catch {}
			return out;
		});

		// Queue pending delete so it survives reloads
		try {
			if (!pendingDeletes.includes(partyId)) {
				pendingDeletes.push(partyId);
				persistPendingDeletes();
				console.debug('[parties-service] queued pending delete for', partyId);
			}
		} catch (e) {
			console.warn('[parties-service] Failed to queue pending delete:', e);
		}

		// Try immediate cloud deletion if possible
		if (currentUserId && firebase.isEnabled()) {
			try {
				console.debug('[parties-service] attempting immediate cloud delete for', partyId);
				await firebase.deleteParty(partyId);
				// remove from pending deletes if successful
				const idx = pendingDeletes.indexOf(partyId);
				if (idx !== -1) {
					pendingDeletes.splice(idx, 1);
					persistPendingDeletes();
				}
				console.debug('[parties-service] immediate cloud delete successful for', partyId);
			} catch (err) {
				console.warn(
					'[parties-service] Immediate cloud delete failed, queued for retry:',
					partyId,
					err,
				);
			}
		}
	};

	return {
		loadParties,
		parties: state.partiesStore,
		createParty,
		saveParty,
		deleteParty,
		cleanup: () => {
			// Cleanup subscriptions and listeners
			if (unsubscribeAuth) {
				try {
					unsubscribeAuth();
				} catch {
					/* ignore */
				}
				unsubscribeAuth = null;
			}
			stopRemoteListener();
			stopPersistence();
		},
	};
};
