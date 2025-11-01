/**
 * Firebase service (Auth + Firestore) - always enabled
 *
 * - Uses dynamic, modular Firebase SDK imports to avoid bundling Firebase when not needed.
 * - Provides a singleton Svelte-style service via `useFirebaseService()`.
 * - Exposes `ready` and `user` writable stores and an async `initFirebase()` method.
 * - Provides auth helpers and Firestore helpers for characters, parties and roll logs.
 *
 * Notes:
 * - The service attempts to initialize Firebase in all environments. If the VITE_FIREBASE_*
 *   variables are missing, initialization will fail; callers should handle errors accordingly.
 */

import { Character } from '$lib/types/character';
import { Party } from '$lib/types/party';
import type { RollLog } from '$lib/types/roll-log';
import { writable, type Writable } from 'svelte/store';

type FirebaseUserLite = {
	uid: string;
	displayName?: string | null;
	email?: string | null;
	photoURL?: string | null;
};

type Unsubscribe = () => void;

function isBrowser(): boolean {
	return typeof window !== 'undefined';
}

declare const __APP_ENV__: { [key: string]: string };

/* ---------------------
   Build-time config read
   --------------------- */
/* We read variables from a global __APP_ENV__ object injected by Vite. */
/* hasBuildConfig removed - callers should use getBuildConfig() directly when needed */

function getBuildConfig(): {
	apiKey: string;
	authDomain?: string;
	projectId: string;
	storageBucket?: string;
	messagingSenderId?: string;
	appId: string;
} | null {
	if (typeof __APP_ENV__ === 'undefined') {
		return null;
	}

	const env = typeof __APP_ENV__ === 'string' ? JSON.parse(__APP_ENV__ as string) : __APP_ENV__;

	if (!env.VITE_FIREBASE_API_KEY) return null;

	return {
		apiKey: env.VITE_FIREBASE_API_KEY,
		authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
		projectId: env.VITE_FIREBASE_PROJECT_ID,
		storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET,
		messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID,
		appId: env.VITE_FIREBASE_APP_ID,
	};
}

/**
 * Factory that builds the firebase service singleton.
 * Keep implementation encapsulated and clean.
 */
function createFirebaseService() {
	// runtime handles (set after init)
	let auth: any = null;
	let db: any = null;

	let initialized = false;
	let initializingPromise: Promise<void> | null = null;

	const ready: Writable<boolean> = writable(false);
	const user: Writable<FirebaseUserLite | null> = writable(null);

	/**
	 * Internal initialization routine.
	 * Idempotent and safe to call multiple times.
	 */
	async function internalInit(): Promise<void> {
		if (initialized) return;
		initialized = true;

		if (!isBrowser()) {
			ready.set(false);
			return;
		}

		// Prefer build-time config
		const config = getBuildConfig() ?? null;
		if (!config) {
			// Fail fast if config missing
			ready.set(false);
			throw new Error('Firebase configuration missing: VITE_FIREBASE_* variables required.');
		}

		try {
			const { initializeApp, getApps } = await import('firebase/app');
			const authModule = await import('firebase/auth');
			const firestoreModule = await import('firebase/firestore');

			if (getApps && getApps().length === 0) {
				initializeApp(config);
			}

			auth = authModule.getAuth();
			db = firestoreModule.getFirestore();

			// Hook auth state to update the user store
			authModule.onAuthStateChanged(auth, (u: any) => {
				const normalized = u
					? {
							uid: u.uid,
							displayName: u.displayName,
							email: u.email,
							photoURL: u.photoURL,
						}
					: null;
				user.set(normalized);
			});

			ready.set(true);
		} catch (err) {
			ready.set(false);
			console.error('[firebase-service] Initialization error:', err);
			throw err;
		}
	}

	/**
	 * Public init function: awaitable and idempotent.
	 */
	async function initFirebase(): Promise<void> {
		if (initializingPromise) return initializingPromise;
		initializingPromise = internalInit();
		try {
			await initializingPromise;
		} finally {
			initializingPromise = null;
		}
	}

	function isEnabled(): boolean {
		// Enabled if init completed successfully and db/auth handles exist
		let val = false;
		ready.subscribe((r) => {
			val = r;
		})();
		return val && !!auth && !!db;
	}

	/* ---------------------- Authentication helpers ---------------------- */

	async function signInWithGoogle(): Promise<FirebaseUserLite | null> {
		if (!isBrowser()) return null;
		await initFirebase();
		const { GoogleAuthProvider, signInWithPopup } = await import('firebase/auth');
		const provider = new GoogleAuthProvider();
		provider.setCustomParameters({ prompt: 'select_account' });
		const result = await signInWithPopup(auth, provider);
		const u = result.user;
		if (!u) return null;
		const normalized = {
			uid: u.uid,
			displayName: u.displayName,
			email: u.email,
			photoURL: u.photoURL,
		};
		user.set(normalized);
		return normalized;
	}

	async function signOutUser(): Promise<void> {
		if (!isBrowser()) return;
		await initFirebase();
		const { signOut } = await import('firebase/auth');
		await signOut(auth);
		user.set(null);
	}

	/**
	 * Subscribe to auth state changes.
	 * Returns an unsubscribe function. The caller may await this function if it needs the unsub.
	 */
	async function onAuthState(callback: (u: FirebaseUserLite | null) => void): Promise<Unsubscribe> {
		if (!isBrowser()) {
			callback(null);
			return () => {};
		}
		await initFirebase();
		const { onAuthStateChanged } = await import('firebase/auth');
		const unsub = onAuthStateChanged(auth, (raw: any) => {
			const normalized = raw
				? {
						uid: raw.uid,
						displayName: raw.displayName,
						email: raw.email,
						photoURL: raw.photoURL,
					}
				: null;
			// Update internal store first
			user.set(normalized);
			callback(normalized);
		});
		return unsub;
	}

	/* ---------------------- Firestore helpers - characters & parties ---------------------- */

	async function ensureFirestore(): Promise<void> {
		await initFirebase();
		if (!db) throw new Error('Firestore not initialized');
	}

	async function saveCharactersForUser(userId: string, characters: Character[]): Promise<void> {
		if (!userId) throw new Error('userId required');
		if (!isBrowser()) return;
		await ensureFirestore();

		// Use modular firestore helpers. We'll also need getDoc to read parties.
		const { doc, writeBatch, getDoc } = await import('firebase/firestore');

		// Deep-clone characters to plain objects so we can safely add denormalized fields.
		const plain = characters.map((c) => JSON.parse(JSON.stringify(c || {})));

		// Denormalize party owner id: for characters that reference a partyId,
		// fetch the party document ownerId and store it on the character as `partyOwnerId`.
		// We fetch each party at most once per call.
		try {
			const partyIds = new Set<string>();
			for (const p of plain) {
				if (p && p.partyId) {
					partyIds.add(p.partyId);
				}
			}
			if (partyIds.size > 0) {
				const partyOwnerMap = new Map<string, string | null>();
				for (const partyId of partyIds) {
					try {
						const snap = await getDoc(doc(db, 'parties', partyId));
						const data = snap && snap.exists ? snap.data() : snap?.data?.();
						const ownerId = data ? (data.ownerId ?? null) : null;
						partyOwnerMap.set(partyId, ownerId);
					} catch (err) {
						// Log and keep null so we don't block saving characters if party read fails.
						console.warn(
							'[firebase-service] Failed to read party for denormalization',
							partyId,
							err,
						);
						partyOwnerMap.set(partyId, null);
					}
				}
				// Attach denormalized owner id to characters
				for (const p of plain) {
					if (!p) continue;
					if (!p.party) {
						p.party = {
							partyId: null,
							ownerId: null,
						};
					} else if (p.party.partyId) {
						p.party.ownerId = partyOwnerMap.get(p.party.partyId) ?? null;
					} else {
						p.party = {
							partyId: null,
							ownerId: null,
						};
					}
				}
			} else {
				// No partyIds present: ensure partyOwnerId exists (set null) for consistency
				for (const p of plain) {
					if (!p) continue;
					if (!p.party) {
						p.party = {
							partyId: null,
							ownerId: null,
						};
					} else {
						p.party.ownerId = p.party.ownerId ?? null;
					}
				}
			}
		} catch (err) {
			// If denormalization step fails unexpectedly, continue without denormalized field
			console.warn(
				'[firebase-service] Party denormalization step failed, proceeding without party.ownerId:',
				err,
			);
			for (const p of plain) {
				if (!p) continue;
				if (!p.party) {
					p.party = {
						partyId: null,
						ownerId: null,
					};
				} else {
					p.party.ownerId = p.party.ownerId ?? null;
				}
			}
		}

		// batch commit with retry (unchanged pattern) but first perform a best-effort
		// cleanup for characters that cleared their partyId: if a character previously had
		// a partyId and now it's removed, attempt to remove it from that party's members
		// subcollection before committing the updated character doc.
		const MAX_ATTEMPTS = 3;
		for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
			try {
				// Best-effort: for each character we'll check the existing server doc to see
				// if the partyId was cleared. If so, attempt to remove the membership entry.
				for (const p of plain) {
					try {
						// Read current stored doc to compare previous partyId
						const charRef = doc(db, 'users', userId, 'characters', p.id);
						const existingSnap = await getDoc(charRef);
						if (existingSnap && existingSnap.exists()) {
							const existingData: any = existingSnap.data() || {};
							const prevPartyId = existingData.partyId ?? null;
							const newPartyId = p.partyId ?? null;
							// If previously belonged to a party and now partyId is cleared (or changed away),
							// attempt to remove the character id from the previous party members mapping.
							if (prevPartyId && (!newPartyId || newPartyId !== prevPartyId)) {
								try {
									// Call the local helper to remove the character from previous party members.
									// This is a best-effort cleanup; any failure should not block saving characters.
									try {
										await removePartyMember(prevPartyId, userId, p.id);
									} catch (cleanupErr) {
										// Do not fail the whole save if cleanup fails; log and continue.
										console.warn('[firebase-service] best-effort removePartyMember failed for', {
											prevPartyId,
											userId,
											cid: p.id,
											err: cleanupErr,
										});
									}
									console.debug(
										'[firebase-service] removed character from previous party members (best-effort)',
										{ prevPartyId, userId, cid: p.id },
									);
								} catch (cleanupErr) {
									// Do not fail the whole save if cleanup fails; log and continue.
									console.warn('[firebase-service] best-effort removePartyMember failed for', {
										prevPartyId,
										userId,
										cid: p.id,
										err: cleanupErr,
									});
								}
							}
						}
					} catch (readErr) {
						// If reading existing doc fails, continue; we still attempt to save characters.
						console.warn(
							'[firebase-service] failed to read existing character doc during party cleanup (continuing):',
							p.id,
							readErr,
						);
					}
				}

				const batch = writeBatch(db);
				for (const p of plain) {
					const ref = doc(db, 'users', userId, 'characters', p.id);
					batch.set(ref, p, { merge: true });
				}
				await batch.commit();
				return;
			} catch (err) {
				console.error(`[firebase-service] saveCharactersForUser attempt ${attempt} failed:`, err);
				if (attempt === MAX_ATTEMPTS) {
					throw err;
				}
				await new Promise((res) => setTimeout(res, 200 * attempt));
			}
		}
	}

	async function deleteCharacterForUser(userId: string, characterId: string): Promise<void> {
		if (!userId) throw new Error('userId required');
		if (!characterId) throw new Error('characterId required');
		if (!isBrowser()) return;
		await ensureFirestore();
		const { doc, deleteDoc } = await import('firebase/firestore');
		await deleteDoc(doc(db, 'users', userId, 'characters', characterId));
	}

	async function loadCharactersForUser(userId: string): Promise<Character[]> {
		if (!userId) throw new Error('userId required');
		if (!isBrowser()) return [];
		await ensureFirestore();
		const { collection, getDocs } = await import('firebase/firestore');
		const col = collection(db, 'users', userId, 'characters');
		const snap = await getDocs(col);
		const out: Character[] = [];
		snap.forEach((d: any) => {
			const data = d.data();
			out.push(new (Character as any)(data));
		});
		return out;
	}

	function listenCharactersForUser(
		userId: string,
		cb: (characters: Character[]) => void,
	): Unsubscribe {
		if (!isBrowser()) {
			cb([]);
			return () => {};
		}
		// Attach listener asynchronously (non-blocking to caller)
		let unsub: Unsubscribe = () => {};
		(async () => {
			try {
				await ensureFirestore();
				const { collection, onSnapshot } = await import('firebase/firestore');
				const col = collection(db, 'users', userId, 'characters');
				unsub = onSnapshot(
					col,
					(snapshot: any) => {
						const arr: Character[] = [];
						snapshot.forEach((docSnap: any) => {
							arr.push(new (Character as any)(docSnap.data()));
						});
						cb(arr);
					},
					(error: any) => {
						console.error('[firebase-service] listenCharactersForUser snapshot error:', error);
						cb([]);
					},
				);
			} catch (err) {
				console.error('[firebase-service] listenCharactersForUser setup error:', err);
				cb([]);
			}
		})();
		return () => {
			try {
				if (unsub) unsub();
			} catch {
				/* ignore */
			}
		};
	}

	/* ---------------------- Firestore helpers - additional helpers ---------------------- */

	/**
	 * Load all characters across users that reference the given partyId.
	 * Returns an array of objects { userId, character } where userId is the owner folder id
	 * (extracted from the document path) and character is a Character instance.
	 */
	async function loadCharactersByParty(
		partyId: string,
	): Promise<{ userId: string; character: Character }[]> {
		if (!partyId) throw new Error('partyId required');
		if (!isBrowser()) return [];
		await ensureFirestore();
		const { collectionGroup, query, where, getDocs } = await import('firebase/firestore');
		try {
			const q = query(collectionGroup(db, 'characters'), where('partyId', '==', partyId));
			const snap = await getDocs(q);
			const out: { userId: string; character: Character }[] = [];
			snap.forEach((d: any) => {
				const data = d.data();
				if (!data) return;
				let userId = '';
				try {
					// doc.ref is .../users/{userId}/characters/{charId}
					// parent => characters collection, parent.parent => users/{userId}
					const charsCollectionRef = d.ref.parent;
					const userRef = charsCollectionRef ? charsCollectionRef.parent : null;
					userId = userRef ? userRef.id : '';
				} catch {
					userId = '';
				}
				out.push({ userId, character: new (Character as any)(data) });
			});
			return out;
		} catch (err) {
			console.error('[firebase-service] loadCharactersByParty failed:', err);
			return [];
		}
	}

	/* ---------------------- Firestore helpers - roll logs ---------------------- */

	async function loadParty(partyId: string): Promise<Party | null> {
		if (!partyId) return null;
		if (!isBrowser()) return null;
		await ensureFirestore();
		const { doc, getDoc } = await import('firebase/firestore');
		try {
			const snap = await getDoc(doc(db, 'parties', partyId));
			if (!snap.exists()) return null;
			const data = snap.data();
			return new Party(data);
		} catch (err) {
			console.error('[firebase-service] loadParty failed:', err);
			return null;
		}
	}

	/* ---------------------- Firestore helpers - parties - member helpers ---------------------- */

	/**
	 * Add a character id to the members subcollection of a party:
	 * parties/{partyId}/members/{userId} with document { characterIds: string[] }.
	 *
	 * Use a per-user document inside the members subcollection instead of editing a map field
	 * on the party doc. This is less error-prone and easier to authorize from client rules.
	 */
	async function setPartyMember(
		partyId: string,
		userId: string,
		characterId: string,
	): Promise<void> {
		if (!partyId) throw new Error('partyId required');
		if (!userId) throw new Error('userId required');
		if (!characterId) throw new Error('characterId required');
		if (!isBrowser()) return;
		await ensureFirestore();

		const { doc, getDoc, setDoc } = await import('firebase/firestore');
		const memberRef = doc(db, 'parties', partyId, 'members', userId);

		// Read current characterIds for this member document and update deterministically.
		try {
			const snap = await getDoc(memberRef);
			let arr: string[] = [];
			if (snap.exists()) {
				const data = snap.data() || {};
				arr = Array.isArray(data.characterIds) ? data.characterIds : [];
			}
			if (!arr.includes(characterId)) {
				arr.push(characterId);
				await setDoc(memberRef, { characterIds: arr }, { merge: true });
			}
		} catch (err) {
			console.error('[firebase-service] setPartyMember failed:', err);
			throw err;
		}
	}

	/**
	 * Remove a character id from the members subcollection of a party:
	 * parties/{partyId}/members/{userId} with document { characterIds: string[] }.
	 *
	 * If the character id exists in the array it will be removed. If the resulting
	 * array is empty the member document will be deleted.
	 *
	 * Additionally, as a best-effort cleanup, attempt to remove the corresponding
	 * entry under the top-level party document `members` map (i.e. delete the key
	 * for `userId` if its array becomes empty). This keeps both representations
	 * reasonably in sync for clients that still rely on the map shape.
	 */
	async function removePartyMember(
		partyId: string,
		userId: string,
		characterId: string,
	): Promise<void> {
		if (!partyId) throw new Error('partyId required');
		if (!userId) throw new Error('userId required');
		if (!characterId) throw new Error('characterId required');
		if (!isBrowser()) return;
		await ensureFirestore();

		const { doc, getDoc, setDoc, deleteDoc } = await import('firebase/firestore');
		const memberRef = doc(db, 'parties', partyId, 'members', userId);
		const partyRef = doc(db, 'parties', partyId);

		try {
			// Read member subdoc
			const snap = await getDoc(memberRef);
			if (!snap.exists()) {
				// Member subdoc missing: still attempt to clean top-level party.members map (best-effort)
				try {
					const partySnap = await getDoc(partyRef);
					if (partySnap && partySnap.exists()) {
						const partyData: any = partySnap.data() || {};
						const members: Record<string, any> = partyData.members ?? {};
						if (members && typeof members === 'object' && Array.isArray(members[userId])) {
							const arr: string[] = Array.isArray(members[userId])
								? members[userId].filter((cid: string) => cid !== characterId)
								: [];
							if (arr.length === 0) {
								delete members[userId];
							} else {
								members[userId] = arr;
							}
							await setDoc(partyRef, { members }, { merge: true });
						}
					}
				} catch (cleanupErr) {
					console.warn(
						'[firebase-service] best-effort cleanup of top-level members map failed:',
						cleanupErr,
					);
				}
				return;
			}

			const data = snap.data() || {};
			const arr: string[] = Array.isArray(data.characterIds) ? data.characterIds : [];
			const idx = arr.indexOf(characterId);
			if (idx !== -1) {
				arr.splice(idx, 1);
				if (arr.length === 0) {
					await deleteDoc(memberRef);
				} else {
					await setDoc(memberRef, { characterIds: arr }, { merge: true });
				}

				// Also attempt to remove/cleanup the top-level members map on the party doc (best-effort)
				try {
					const partySnap = await getDoc(partyRef);
					if (partySnap && partySnap.exists()) {
						const partyData: any = partySnap.data() || {};
						const members: Record<string, any> = partyData.members ?? {};
						if (members && typeof members === 'object') {
							const userArr: string[] = Array.isArray(members[userId])
								? members[userId].filter((cid: string) => cid !== characterId)
								: [];
							if (userArr.length === 0) {
								delete members[userId];
							} else {
								members[userId] = userArr;
							}
							await setDoc(partyRef, { members }, { merge: true });
						}
					}
				} catch (cleanupErr) {
					console.warn(
						'[firebase-service] best-effort cleanup of top-level members map failed:',
						cleanupErr,
					);
				}
			}
		} catch (err) {
			console.error('[firebase-service] removePartyMember failed:', err);
			throw err;
		}
	}

	/**
	 * Listen to party members map changes for a given party id.
	 * Calls cb with a normalized map: { userId: string[] } (empty map if none).
	 */
	function listenPartyMembers(
		partyId: string,
		cb: (members: Record<string, string[]>) => void,
	): Unsubscribe {
		if (!isBrowser()) {
			cb({});
			return () => {};
		}
		let unsub: Unsubscribe = () => {};
		(async () => {
			try {
				await ensureFirestore();
				// Listen the members subcollection under parties/{partyId}/members
				const { collection, onSnapshot } = await import('firebase/firestore');
				const membersCol = collection(db, 'parties', partyId, 'members');
				unsub = onSnapshot(
					membersCol,
					(snapshot: any) => {
						const map: Record<string, string[]> = {};
						snapshot.forEach((docSnap: any) => {
							const data = docSnap.data() || {};
							map[docSnap.id] = Array.isArray(data.characterIds) ? data.characterIds : [];
						});
						cb(map);
					},
					(error: any) => {
						console.error(
							'[firebase-service] listenPartyMembers snapshot error (members subcollection):',
							error,
						);
						cb({});
					},
				);
			} catch (err) {
				console.error(
					'[firebase-service] listenPartyMembers setup error (members subcollection):',
					err,
				);
				cb({});
			}
		})();
		return () => {
			try {
				if (unsub) unsub();
			} catch {
				/* ignore */
			}
		};
	}

	/**
	 * Load the members list for a given party id from the members subcollection.
	 * Returns a map { userId: string[] } where each document id under parties/{partyId}/members
	 * is a userId and the doc contains { characterIds: string[] }.
	 */
	async function loadPartyMembers(partyId: string): Promise<Record<string, string[]>> {
		if (!partyId) throw new Error('partyId required');
		if (!isBrowser()) return {};
		await ensureFirestore();
		const { collection, getDocs } = await import('firebase/firestore');
		const col = collection(db, 'parties', partyId, 'members');
		try {
			const snap = await getDocs(col);
			const out: Record<string, string[]> = {};
			snap.forEach((d: any) => {
				const data = d.data() || {};
				out[d.id] = Array.isArray(data.characterIds) ? data.characterIds : [];
			});
			return out;
		} catch (err) {
			console.error('[firebase-service] loadPartyMembers failed:', err);
			return {};
		}
	}

	/* ---------------------- Firestore helpers - roll logs ---------------------- */
	/**
	 * Parties helpers
	 *
	 * - saveParty: persists a party document under the top-level 'parties' collection.
	 * - deleteParty: deletes a party document by id.
	 * - listenToUserParties: attaches a realtime listener and filters parties that are
	 *   relevant to the given user (owner or member). For simplicity this implementation
	 *   listens to the whole collection and filters client-side; this is acceptable for
	 *   small-scale datasets and matches the project's existing patterns.
	 */

	async function saveParty(party: Party): Promise<void> {
		if (!party || !party.id) throw new Error('party.id required');
		if (!isBrowser()) return;
		await ensureFirestore();

		const { doc, setDoc } = await import('firebase/firestore');
		const plain = JSON.parse(JSON.stringify(party || {}));

		// Retry to improve robustness (mirror pattern used for characters)
		const MAX_ATTEMPTS = 3;
		for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
			try {
				await setDoc(doc(db, 'parties', plain.id), plain, { merge: true });
				return;
			} catch (err) {
				// Provide more context in logs to help debugging production failures.
				console.error(
					`[firebase-service] saveParty attempt ${attempt} failed for party ${plain.id} owner=${plain.ownerId}:`,
					err,
				);
				if (attempt === MAX_ATTEMPTS) {
					// Log the full party payload at the final failure to assist post-mortem.
					try {
						console.error(
							'[firebase-service] saveParty giving up after max attempts for party:',
							JSON.stringify(plain),
						);
					} catch (jsonErr) {
						console.error(
							'[firebase-service] saveParty could not stringify party payload',
							jsonErr,
						);
					}
					throw err;
				}
				await new Promise((res) => setTimeout(res, 200 * attempt));
			}
		}
	}

	async function deleteParty(partyId: string): Promise<void> {
		if (!partyId) throw new Error('partyId required');
		if (!isBrowser()) return;
		await ensureFirestore();
		const { doc, deleteDoc } = await import('firebase/firestore');
		await deleteDoc(doc(db, 'parties', partyId));
	}

	function listenToUserParties(userId: string, cb: (parties: Party[]) => void): Unsubscribe {
		if (!isBrowser()) {
			cb([]);
			return () => {};
		}

		// We'll maintain three kinds of listeners:
		//  - ownerQuery listener (parties where ownerId == userId)
		//  - memberQuery listener (parties where the user appears in members)
		//  - character-based per-party listeners: watch the user's characters subcollection;
		//    when a character has a partyId, attach an onSnapshot to that party doc so joining
		//    by setting character.partyId works in real-time.
		let ownerUnsub: Unsubscribe = () => {};
		let memberUnsub: Unsubscribe = () => {};
		let charUnsub: Unsubscribe = () => {};
		const partyDocUnsubMap: Record<string, Unsubscribe> = {};
		const partyDocCache: Record<string, Party> = {};

		// Helper to merge sources (ownerSet, memberSet, partyDocCache) into a unique array
		const mergeAndCb = (ownerSet: Party[], memberSet: Party[]) => {
			const map = new Map<string, Party>();
			for (const p of ownerSet) {
				if (p && p.id) map.set(p.id, new Party(p));
			}
			for (const p of memberSet) {
				if (p && p.id && !map.has(p.id)) map.set(p.id, new Party(p));
			}
			for (const id of Object.keys(partyDocCache)) {
				const p = partyDocCache[id];
				if (p && p.id && !map.has(p.id)) map.set(p.id, new Party(p));
			}
			const out = Array.from(map.values());
			cb(out);
		};

		// Attach listener asynchronously (non-blocking)
		(async () => {
			try {
				await ensureFirestore();
				const { collection, doc, onSnapshot, query, where } = await import('firebase/firestore');

				const partiesCol = collection(db, 'parties');

				// Query 1: parties where user is owner
				const ownerQuery = query(partiesCol, where('ownerId', '==', userId));
				// Query 2: parties where the user appears in members map (attempt); fallback to collection if needed
				let memberQuery;
				try {
					memberQuery = query(partiesCol, where(`members.${userId}`, '!=', null));
				} catch (err) {
					memberQuery = partiesCol;
				}

				const ownerSet: Party[] = [];
				const memberSet: Party[] = [];

				ownerUnsub = onSnapshot(
					ownerQuery,
					(snapshot: any) => {
						ownerSet.length = 0;
						snapshot.forEach((d: any) => {
							const data = d.data();
							if (!data) return;
							if (!data.id) data.id = d.id;
							ownerSet.push(new (Party as any)(data));
						});
						mergeAndCb(ownerSet, memberSet);
					},
					(error: any) => {
						console.error('[firebase-service] listenToUserParties owner snapshot error:', error);
						cb([]);
					},
				);

				memberUnsub = onSnapshot(
					memberQuery,
					(snapshot: any) => {
						memberSet.length = 0;
						snapshot.forEach((d: any) => {
							const data = d.data();
							if (!data) return;
							if (!data.id) data.id = d.id;

							// If members is an array or a map, detect membership.
							// Require non-empty arrays for membership so empty arrays don't grant access.
							let include = false;
							if (Array.isArray(data.members)) {
								// Only consider membership if the array is non-empty and contains the userId
								include = data.members.length > 0 && data.members.includes(userId);
							} else if (data.members && typeof data.members === 'object') {
								// Prefer explicit per-user arrays (members[userId]) and require them to be non-empty
								const direct = data.members[userId];
								if (Array.isArray(direct)) {
									include = direct.length > 0;
								} else if (direct === true) {
									// Legacy boolean flag - accept it (backwards compatibility)
									include = true;
								} else {
									// Defensive fallback: scan values for arrays that include userId,
									// but require those arrays to be non-empty to count as membership.
									for (const k in data.members) {
										const val = data.members[k];
										if (Array.isArray(val) && val.length > 0 && val.includes(userId)) {
											include = true;
											break;
										}
									}
								}
							}
							if (include) memberSet.push(new (Party as any)(data));
						});
						mergeAndCb(ownerSet, memberSet);
					},
					(error: any) => {
						console.error('[firebase-service] listenToUserParties member snapshot error:', error);
						cb([]);
					},
				);

				// Now attach a listener to the user's characters subcollection to detect joins by partyId.
				const charsCol = collection(db, 'users', userId, 'characters');
				const charListener = onSnapshot(
					charsCol,
					(snapshot: any) => {
						// compute set of partyIds referenced by user's characters
						const partyIds = new Set<string>();
						snapshot.forEach((d: any) => {
							const c = d.data();
							if (c && c.partyId) partyIds.add(c.partyId);
						});

						// Attach per-party document listeners for any partyId not yet subscribed
						for (const pid of partyIds) {
							if (!partyDocUnsubMap[pid]) {
								try {
									const partyDocRef = doc(db, 'parties', pid);
									const unsub = onSnapshot(
										partyDocRef,
										(docSnap: any) => {
											const data = docSnap.data();
											if (!data) {
												// if doc deleted, remove from cache
												delete partyDocCache[pid];
												mergeAndCb(ownerSet, memberSet);
												return;
											}
											data.id = docSnap.id;
											partyDocCache[pid] = new (Party as any)(data);
											mergeAndCb(ownerSet, memberSet);
										},
										(error: any) => {
											console.error('[firebase-service] party doc listener error for', pid, error);
										},
									);
									partyDocUnsubMap[pid] = unsub;
								} catch (err) {
									console.warn(
										'[firebase-service] failed to attach per-party listener for',
										pid,
										err,
									);
								}
							}
						}

						// Remove listeners for parties no longer referenced
						for (const existingPid of Object.keys(partyDocUnsubMap)) {
							if (!partyIds.has(existingPid)) {
								try {
									partyDocUnsubMap[existingPid]();
								} catch {}
								delete partyDocUnsubMap[existingPid];
								delete partyDocCache[existingPid];
							}
						}

						// Recompute merged results after any change
						mergeAndCb(ownerSet, memberSet);
					},
					(error: any) => {
						console.error('[firebase-service] characters subcollection snapshot error:', error);
					},
				);

				// Combined unsubscriber will remove all listeners
				const combinedUnsub = () => {
					try {
						ownerUnsub();
					} catch {}
					try {
						memberUnsub();
					} catch {}
					try {
						charListener();
					} catch {}
					for (const pid in partyDocUnsubMap) {
						try {
							partyDocUnsubMap[pid]();
						} catch {}
					}
				};
				// replace charUnsub for outer cleanup
				charUnsub = combinedUnsub;
			} catch (err) {
				console.error('[firebase-service] listenToUserParties setup error:', err);
				cb([]);
			}
		})();
		return () => {
			try {
				// Attempt to tear down all listeners
				if (ownerUnsub)
					try {
						ownerUnsub();
					} catch {}
				if (memberUnsub)
					try {
						memberUnsub();
					} catch {}
				if (charUnsub)
					try {
						charUnsub();
					} catch {}
			} catch {
				/* ignore */
			}
		};
	}

	/* ---------------------- Firestore helpers - roll logs ---------------------- */

	async function saveRollLogsForUser(userId: string, logs: any[]): Promise<void> {
		if (!userId) throw new Error('userId required');
		if (!isBrowser()) return;
		await ensureFirestore();

		const { doc, writeBatch } = await import('firebase/firestore');
		const plain = logs.map((l) => JSON.parse(JSON.stringify(l || {})));

		const MAX_ATTEMPTS = 3;
		for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
			try {
				const batch = writeBatch(db);
				for (const p of plain) {
					const ref = doc(db, 'users', userId, 'rollLogs', p.id);
					batch.set(ref, p, { merge: true });
				}
				await batch.commit();
				return;
			} catch (err) {
				console.error(`[firebase-service] saveRollLogsForUser attempt ${attempt} failed:`, err);
				if (attempt === MAX_ATTEMPTS) {
					throw err;
				}
				await new Promise((res) => setTimeout(res, 200 * attempt));
			}
		}
	}

	async function loadRollLogsForUser(userId: string): Promise<RollLog[]> {
		if (!userId) throw new Error('userId required');
		if (!isBrowser()) return [];
		await ensureFirestore();
		const { collection, getDocs } = await import('firebase/firestore');
		const col = collection(db, 'users', userId, 'rollLogs');
		const snap = await getDocs(col);
		const out: RollLog[] = [];
		// Include Firestore document id along with the data so callers have stable ids
		snap.forEach((d: any) => out.push({ ...(d.data() || {}), id: d.id }));
		return out;
	}

	function listenRollLogsForUser(userId: string, cb: (logs: RollLog[]) => void): Unsubscribe {
		if (!isBrowser()) {
			cb([]);
			return () => {};
		}
		let unsub: Unsubscribe = () => {};
		(async () => {
			try {
				await ensureFirestore();
				const { collection, onSnapshot } = await import('firebase/firestore');
				const col = collection(db, 'users', userId, 'rollLogs');
				unsub = onSnapshot(
					col,
					(snapshot: any) => {
						const arr: RollLog[] = [];
						// Include Firestore document id so logs retain their document identity client-side
						snapshot.forEach((docSnap: any) => {
							const data = { ...(docSnap.data() || {}), id: docSnap.id };
							arr.push(data);
						});
						cb(arr);
					},
					(error: any) => {
						console.error('[firebase-service] listenRollLogsForUser snapshot error:', error);
						cb([]);
					},
				);
			} catch (err) {
				console.error('[firebase-service] listenRollLogsForUser setup error:', err);
				cb([]);
			}
		})();
		return () => {
			try {
				if (unsub) unsub();
			} catch {
				/* ignore */
			}
		};
	}

	async function deleteRollLogForUser(userId: string, logId: string): Promise<void> {
		if (!userId) throw new Error('userId required');
		if (!logId) throw new Error('logId required');
		if (!isBrowser()) return;
		await ensureFirestore();
		const { doc, deleteDoc } = await import('firebase/firestore');
		await deleteDoc(doc(db, 'users', userId, 'rollLogs', logId));
	}

	/* ---------------------- Public API ---------------------- */

	return {
		firebaseReady: ready,
		user,
		initFirebase,
		isEnabled,
		signInWithGoogle,
		signOutUser,
		onAuthState,
		// characters
		saveCharactersForUser,
		loadCharactersForUser,
		loadCharactersByParty,
		deleteCharacterForUser,
		listenCharactersForUser,
		// parties
		saveParty,
		deleteParty,
		loadParty,
		listenToUserParties,
		// party members helpers
		setPartyMember,
		removePartyMember,
		loadPartyMembers,
		listenPartyMembers,
		// roll logs
		saveRollLogsForUser,
		loadRollLogsForUser,
		deleteRollLogForUser,
		listenRollLogsForUser,
	};
}

const singleton = createFirebaseService();

export function useFirebaseService() {
	return singleton;
}
