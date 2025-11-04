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

	// Firestore operation counters (debug/diagnostics)
	let __reads = 0;
	let __writes = 0;
	let __opsLogScheduled: any = null;
	const __scheduleOpsLog = () => {
		if (__opsLogScheduled) return;
		try {
			__opsLogScheduled = setTimeout(() => {
				__opsLogScheduled = null;
				try {
					console.debug('[firebase-service] ops:', { reads: __reads, writes: __writes });
				} catch {
					/* ignore */
				}
			}, 1000);
		} catch {
			/* ignore */
		}
	};
	const __incRead = (n: number = 1) => {
		__reads += n;
		__scheduleOpsLog();
	};
	const __incWrite = (n: number = 1) => {
		__writes += n;
		__scheduleOpsLog();
	};

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

		const { doc, writeBatch, getDoc } = await import('firebase/firestore');

		let plain: any[] = characters.map((c) => JSON.parse(JSON.stringify(c || {})));

		// Skip invalid ids to avoid building invalid Firestore paths
		const invalid = plain.filter((p) => !p || typeof p.id !== 'string' || p.id.trim() === '');
		if (invalid.length > 0) {
			console.warn(
				'[firebase-service] saveCharactersForUser: skipping characters without valid id:',
				invalid.map((p) => p && p.id),
			);
		}
		plain = plain.filter((p) => p && typeof p.id === 'string' && p.id.trim() !== '');
		if (plain.length === 0) return;

		// Denormalize party owner id (using canónico nested party.partyId; fallback legacy partyId)
		try {
			const partyIds = new Set<string>();
			for (const p of plain) {
				const pid = (p?.party && p.party.partyId) ?? p?.partyId ?? null;
				if (pid) partyIds.add(pid);
			}
			if (partyIds.size > 0) {
				const partyOwnerMap = new Map<string, string | null>();
				for (const partyId of partyIds) {
					try {
						const snap = await getDoc(doc(db, 'parties', partyId));
						__incRead();
						let data: any;
						if (snap && typeof snap.exists === 'function' && snap.exists()) {
							data = snap.data();
						} else {
							data = undefined;
						}
						partyOwnerMap.set(partyId, data ? (data.ownerId ?? null) : null);
					} catch (err) {
						console.warn(
							'[firebase-service] Failed to read party for denormalization',
							partyId,
							err,
						);
						partyOwnerMap.set(partyId, null);
					}
				}
				for (const p of plain) {
					const pid = (p?.party && p.party.partyId) ?? p?.partyId ?? null;
					if (!p.party) {
						p.party = {
							partyId: pid ?? null,
							ownerId: pid ? (partyOwnerMap.get(pid) ?? null) : null,
						};
					} else if (pid) {
						p.party.partyId = pid;
						p.party.ownerId = partyOwnerMap.get(pid) ?? null;
					} else {
						p.party = { partyId: null, ownerId: null };
					}
				}
			} else {
				for (const p of plain) {
					if (!p.party) p.party = { partyId: null, ownerId: null };
					else p.party.ownerId = p.party.ownerId ?? null;
				}
			}
		} catch (err) {
			console.warn('[firebase-service] Party denormalization step failed:', err);
			for (const p of plain) {
				if (!p.party) p.party = { partyId: null, ownerId: null };
				else p.party.ownerId = p.party.ownerId ?? null;
			}
		}

		// Best-effort cleanup: if partyId cleared/changed, remove from previous party members
		const MAX_ATTEMPTS = 3;
		for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
			try {
				for (const p of plain) {
					if (!p || !p.id || typeof p.id !== 'string') continue;
					try {
						const charRef = doc(db, 'users', userId, 'characters', p.id);
						const existingSnap = await getDoc(charRef);
						__incRead();
						if (existingSnap && existingSnap.exists()) {
							const existingData: any = existingSnap.data() || {};
							const prevPartyId =
								(existingData?.party && existingData.party.partyId) ??
								existingData?.partyId ??
								null;
							const newPartyId = (p?.party && p.party.partyId) ?? p?.partyId ?? null;
							if (prevPartyId && (!newPartyId || newPartyId !== prevPartyId)) {
								try {
									await removePartyMember(prevPartyId, userId, p.id);
								} catch (cleanupErr) {
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
						console.warn(
							'[firebase-service] failed to read existing character doc (continuing):',
							p?.id,
							readErr,
						);
					}
				}

				const batch = writeBatch(db);
				for (const p of plain) {
					if (!p || !p.id || typeof p.id !== 'string') continue;
					const ref = doc(db, 'users', userId, 'characters', p.id);
					batch.set(ref, p, { merge: true });
				}
				await batch.commit();
				__incWrite(plain.length);
				return;
			} catch (err) {
				console.error(`[firebase-service] saveCharactersForUser attempt ${attempt} failed:`, err);
				if (attempt === MAX_ATTEMPTS) throw err;
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
		__incWrite();
	}

	async function loadCharactersForUser(userId: string): Promise<Character[]> {
		if (!userId) throw new Error('userId required');
		if (!isBrowser()) return [];
		await ensureFirestore();
		const { collection, getDocs } = await import('firebase/firestore');
		const col = collection(db, 'users', userId, 'characters');
		const snap = await getDocs(col);
		__incRead(snap?.size ?? 0);
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
						__incRead(snapshot?.size ?? 0);
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
			__incRead(snap?.size ?? 0);
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
			__incRead();
			if (!snap.exists()) return null;
			const data = snap.data();
			return new Party(data);
		} catch (err) {
			console.error('[firebase-service] loadParty failed:', err);
			return null;
		}
	}

	/* ---------------------- Firestore helpers - parties - member helpers ---------------------- */

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

		const { doc, runTransaction, getDoc, updateDoc, setDoc } = await import('firebase/firestore');
		const partyRef = doc(db, 'parties', partyId);

		try {
			await runTransaction(db, async (tx: any) => {
				const partySnap = await tx.get(partyRef);
				__incRead();
				// If party doesn't exist, create minimal doc with members map
				if (!partySnap || !partySnap.exists()) {
					const initial: Record<string, any> = {};
					initial[userId] = [characterId];
					tx.set(partyRef, { members: initial }, { merge: true });
					__incWrite();
					return;
				}

				const pdata = partySnap.data() || {};
				const existing = pdata.members && typeof pdata.members === 'object' ? pdata.members : {};
				const arr = Array.isArray(existing[userId]) ? existing[userId].slice() : [];
				if (!arr.includes(characterId)) {
					arr.push(characterId);
					// Update only the nested field members.<userId> so security rules for members modifications pass
					const field: any = {};
					field[`members.${userId}`] = arr;
					tx.update(partyRef, field);
					__incWrite();
				}
			});
		} catch (err) {
			console.error('[firebase-service] setPartyMember transaction failed:', err);
			// Fallback: non-transactional update of the nested field
			try {
				// Read current doc
				const snap = await getDoc(partyRef);
				__incRead();
				if (!snap || !snap.exists()) {
					await setDoc(partyRef, { members: { [userId]: [characterId] } }, { merge: true });
					__incWrite();
					return;
				}
				const pdata = snap.data() || {};
				const existing = pdata.members && typeof pdata.members === 'object' ? pdata.members : {};
				const arr = Array.isArray(existing[userId]) ? existing[userId].slice() : [];
				if (!arr.includes(characterId)) {
					arr.push(characterId);
					await updateDoc(partyRef, { [`members.${userId}`]: arr });
					__incWrite();
				}
			} catch (fallbackErr) {
				console.error('[firebase-service] setPartyMember fallback failed:', fallbackErr);
				throw err;
			}
		}
	}

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

		const { doc, runTransaction, getDoc, updateDoc, deleteField } = await import(
			'firebase/firestore'
		);
		const partyRef = doc(db, 'parties', partyId);

		try {
			await runTransaction(db, async (tx: any) => {
				const partySnap = await tx.get(partyRef);
				__incRead();
				if (!partySnap || !partySnap.exists()) {
					// nada que hacer
					return;
				}
				const pdata = partySnap.data() || {};
				const existing = pdata.members && typeof pdata.members === 'object' ? pdata.members : {};
				const arr = Array.isArray(existing[userId]) ? existing[userId].slice() : [];
				const idx = arr.indexOf(characterId);
				if (idx !== -1) {
					arr.splice(idx, 1);
					if (arr.length === 0) {
						// elimina por completo la key para que no siga contando como miembro
						tx.update(partyRef, { [`members.${userId}`]: deleteField() });
						__incWrite();
					} else {
						tx.update(partyRef, { [`members.${userId}`]: arr });
						__incWrite();
					}
				}
			});
		} catch (err) {
			console.error('[firebase-service] removePartyMember transaction failed:', err);
			// fallback best-effort
			try {
				const { deleteField: df } = await import('firebase/firestore');
				const snap = await getDoc(partyRef);
				__incRead();
				if (!snap || !snap.exists()) return;
				const pdata = snap.data() || {};
				const existing = pdata.members && typeof pdata.members === 'object' ? pdata.members : {};
				const arr = Array.isArray(existing[userId]) ? existing[userId].slice() : [];
				const idx = arr.indexOf(characterId);
				if (idx !== -1) {
					arr.splice(idx, 1);
					if (arr.length === 0) {
						await updateDoc(partyRef, { [`members.${userId}`]: df() });
						__incWrite();
					} else {
						await updateDoc(partyRef, { [`members.${userId}`]: arr });
						__incWrite();
					}
				}
			} catch (fallbackErr) {
				console.error('[firebase-service] removePartyMember fallback failed:', fallbackErr);
				throw err;
			}
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
		const plain = party.asPlain();

		// Retry to improve robustness (mirror pattern used for characters)
		const MAX_ATTEMPTS = 3;
		for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
			try {
				await setDoc(doc(db, 'parties', plain.id), plain, { merge: true });
				__incWrite();
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
		__incWrite();
	}

	function listenToUserParties(userId: string, cb: (parties: Party[]) => void): Unsubscribe {
		if (!isBrowser()) {
			cb([]);
			return () => {};
		}

		let unsub: Unsubscribe = () => {};

		(async () => {
			try {
				await ensureFirestore();
				const { collection, onSnapshot } = await import('firebase/firestore');
				const partiesCol = collection(db, 'parties');

				// Single collection listener; filter client-side by owner or membership
				unsub = onSnapshot(
					partiesCol,
					(snapshot: any) => {
						try {
							__incRead(snapshot?.size ?? 0);
						} catch {
							/* ignore */
						}
						const out: Party[] = [];
						snapshot.forEach((d: any) => {
							const data = d.data();
							if (!data) return;
							data.id = d.id;
							const isOwner = data.ownerId === userId;
							const isMember =
								data.members &&
								typeof data.members === 'object' &&
								Array.isArray(data.members[userId]) &&
								data.members[userId].length > 0;
							if (isOwner || isMember) {
								out.push(new (Party as any)(data));
							}
						});
						cb(out);
					},
					(err: any) => {
						console.error('[firebase-service] listenToUserParties error:', err);
						cb([]);
					},
				);
			} catch (err) {
				console.error('[firebase-service] listenToUserParties setup error:', err);
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
				__incWrite(plain.length);
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
		__incRead(snap?.size ?? 0);
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
						__incRead(snapshot?.size ?? 0);
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
		__incWrite();
	}

	/**
	 * Listen to a specific set of characters identified by owner userId + characterId.
	 *
	 * The caller provides an array of items { userId, charId } and a callback that will be
	 * invoked with the current list of Character instances whenever any of the listened
	 * documents change. Returns an unsubscribe function that removes all listeners.
	 *
	 * Note: This is intentionally a narrow listener (per-document watchers) to avoid loading
	 * all characters for a user. It does not provide reactivity if the caller later wants
	 * to change the list of ids; the caller should call this function again with the new list.
	 */
	// Shared per-character subscription hub (single Firestore listener per character)
	type CharacterSubscriber = (c: Character | null) => void;
	const __characterHub: Record<
		string,
		{
			subscribers: Set<CharacterSubscriber>;
			unsubscribe: Unsubscribe | null;
			latest: Character | null;
		}
	> = {};

	function subscribeCharacter(
		item: { userId: string; characterId: string },
		onUpdate: (c: Character | null) => void,
	): Unsubscribe {
		if (!isBrowser()) return () => {};
		const key = `${item.userId}/${item.characterId}`;
		let entry = __characterHub[key];
		if (!entry) {
			entry = { subscribers: new Set(), unsubscribe: null, latest: null };
			__characterHub[key] = entry;
		}
		entry.subscribers.add(onUpdate);

		if (!entry.unsubscribe) {
			(async () => {
				try {
					await ensureFirestore();
					const { doc, onSnapshot } = await import('firebase/firestore');
					const ref = doc(db, 'users', item.userId, 'characters', item.characterId);
					entry.unsubscribe = onSnapshot(
						ref,
						(docSnap: any) => {
							__incRead();
							if (docSnap && docSnap.exists()) {
								const data = docSnap.data() || {};
								if (!data.id) data.id = docSnap.id;
								entry.latest = new (Character as any)(data);
							} else {
								entry.latest = null;
							}
							for (const fn of Array.from(entry.subscribers)) {
								try {
									fn(entry.latest);
								} catch (err) {
									console.error('[firebase-service] subscribeCharacter subscriber error:', err);
								}
							}
						},
						(error: any) => {
							console.error('[firebase-service] subscribeCharacter snapshot error for', key, error);
						},
					);
				} catch (err) {
					console.error('[firebase-service] subscribeCharacter setup error for', key, err);
				}
			})();
		}

		// Deliver last known value immediately to new subscriber
		if (entry.latest !== null) {
			try {
				onUpdate(entry.latest);
			} catch (err) {
				console.error('[firebase-service] subscribeCharacter immediate callback error:', err);
			}
		}

		return () => {
			const e = __characterHub[key];
			if (!e) return;
			e.subscribers.delete(onUpdate);
			if (e.subscribers.size === 0) {
				try {
					if (e.unsubscribe) e.unsubscribe();
				} catch {
					/* ignore */
				}
				delete __characterHub[key];
			}
		};
	}

	function listenCharactersByIds(
		items: { userId: string; characterId: string }[],
		cb: (characters: Character[]) => void,
	): Unsubscribe {
		if (!isBrowser()) {
			cb([]);
			return () => {};
		}

		const results: Record<string, Character | null> = {};
		const unsubs: Unsubscribe[] = [];

		for (const it of items) {
			if (!it || !it.userId || !it.characterId) continue;
			const key = `${it.userId}/${it.characterId}`;
			const unsub = subscribeCharacter(it, (value) => {
				results[key] = value;
				const out: Character[] = [];
				for (const k of Object.keys(results)) {
					const c = results[k];
					if (c) out.push(c);
				}
				try {
					cb(out);
				} catch (err) {
					console.error('[firebase-service] listenCharactersByIds callback error:', err);
				}
			});
			unsubs.push(unsub);
		}

		return () => {
			for (const u of unsubs) {
				try {
					u();
				} catch {
					/* ignore */
				}
			}
		};
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
		// character listeners
		// Listen to a specific set of characters by id. This is intended to provide a fine-grained
		// real-time subscription for characters that belong to a party without loading all characters
		// for a user. Implementation is provided in the service and exported here so callers can
		// subscribe with a callback receiving Character[] on updates.
		subscribeCharacter,
		listenCharactersByIds,
		// roll logs
		saveRollLogsForUser,
		loadRollLogsForUser,
		deleteRollLogForUser,
		listenRollLogsForUser,

		// diagnostics
		getReadCount: () => __reads,
		getWriteCount: () => __writes,
		resetOpCounters: () => {
			__reads = 0;
			__writes = 0;
		},
		getOpCounters: () => ({ reads: __reads, writes: __writes }),
	};
}

const singleton = createFirebaseService();

export function useFirebaseService() {
	return singleton;
}
