/**
 * proyecto-arcana/src/lib/services/firebase-service.ts
 *
 * Singleton Svelte-style service for Firebase (Auth + Firestore).
 *
 * Provides:
 * - `useFirebaseService()` returning the singleton service.
 * - `ready`: Writable<boolean> store (true when init completed successfully).
 * - `initFirebase()`: async idempotent initializer (callers can await).
 * - Auth helpers: `signInWithGoogle()`, `signOutUser()`, `onAuthState()`.
 * - Firestore helpers for user characters:
 *     `saveCharactersForUser`, `loadCharactersForUser`, `deleteCharacterForUser`, `listenCharactersForUser`.
 *
 * Notes:
 * - In development mode (import.meta.env.MODE === 'development') the service is disabled and
 *   public functions become safe no-ops or return safe defaults. `ready` will be false.
 * - Uses dynamic imports of the modular Firebase SDK to avoid bundling Firebase when not needed.
 */

import { Character } from '$lib/types/character';
import { writable, type Writable } from 'svelte/store';

type FirebaseUserLite = {
	uid: string;
	displayName?: string | null;
	email?: string | null;
	photoURL?: string | null;
};

type Unsubscribe = () => void;

/**
 * Helper: detect browser environment
 */
function isBrowser(): boolean {
	return typeof window !== 'undefined';
}

/**
 * Detect development mode (Vite / SvelteKit - import.meta.env.MODE)
 */
const isDev = (() => {
	const mode =
		typeof import.meta !== 'undefined' && 'env' in import.meta
			? (import.meta as any).env?.MODE
			: undefined;
	return mode === undefined ? true : mode === 'development';
})();

/**
 * Read Firebase config from env (Vite exposes VITE_* vars)
 */
function getFirebaseConfigFromEnv() {
	const env =
		typeof import.meta !== 'undefined' && 'env' in import.meta ? (import.meta as any).env : {};
	const apiKey = env.VITE_FIREBASE_API_KEY;
	const authDomain = env.VITE_FIREBASE_AUTH_DOMAIN;
	const projectId = env.VITE_FIREBASE_PROJECT_ID;
	const storageBucket = env.VITE_FIREBASE_STORAGE_BUCKET;
	const messagingSenderId = env.VITE_FIREBASE_MESSAGING_SENDER_ID;
	const appId = env.VITE_FIREBASE_APP_ID;

	if (!apiKey || !projectId || !appId) return null;

	return {
		apiKey,
		authDomain,
		projectId,
		storageBucket,
		messagingSenderId,
		appId,
	};
}

/**
 * Factory that creates the firebase service (singleton created below)
 */
function createFirebaseService() {
	let initialized = false;
	let initializingPromise: Promise<void> | null = null;
	let firebaseAvailable = false;

	// runtime references to SDK objects (initialized after init)
	let auth: any = null;
	let db: any = null;

	// store that indicates readiness (true when Firebase init succeeded)
	const ready: Writable<boolean> = writable(false);

	// public store with the current authenticated user (null when not signed in)
	const user: Writable<FirebaseUserLite | null> = writable(null);

	/**
	 * internal initialization function
	 */
	async function internalInit(): Promise<void> {
		if (initialized) return;
		initialized = true;

		// Guard: only initialize in browser and when not in development
		if (!isBrowser()) {
			console.info('[firebase-service] Not initializing: not running in browser');
			firebaseAvailable = false;
			ready.set(false);
			return;
		}
		if (isDev) {
			console.info('[firebase-service] Not initializing Firebase in development mode');
			firebaseAvailable = false;
			ready.set(false);
			return;
		}

		const config = getFirebaseConfigFromEnv();
		if (!config) {
			console.warn(
				'[firebase-service] Firebase config missing. Set VITE_FIREBASE_* env vars to enable cloud persistence.',
			);
			firebaseAvailable = false;
			ready.set(false);
			return;
		}

		try {
			// Use modular SDK dynamic imports
			const { initializeApp, getApps } = await import('firebase/app');
			const authModule = await import('firebase/auth');
			const firestoreModule = await import('firebase/firestore');

			// Initialize app if not already
			if (getApps && getApps().length === 0) {
				initializeApp(config);
			}

			// Obtain handles
			auth = authModule.getAuth();
			db = firestoreModule.getFirestore();

			// Sanity check
			if (!auth || !db) {
				console.warn('[firebase-service] Auth or Firestore not available after initialization.');
				firebaseAvailable = false;
				ready.set(false);
				return;
			}

			firebaseAvailable = true;
			ready.set(true);
			console.info('[firebase-service] Firebase initialized and available.');
		} catch (err) {
			console.error('[firebase-service] Error initializing firebase:', err);
			firebaseAvailable = false;
			ready.set(false);
		}
	}

	/**
	 * Public async init function (idempotent)
	 */
	async function initFirebase(): Promise<void> {
		if (initializingPromise) return initializingPromise;
		initializingPromise = internalInit();
		await initializingPromise;
		initializingPromise = null;
	}

	function isEnabled(): boolean {
		return !isDev && firebaseAvailable;
	}

	/**
	 * Auth helpers
	 */

	/**
	 * Subscribe to auth state changes. Awaits init internally.
	 * Returns an unsubscribe function.
	 */
	async function onAuthState(cb: (user: FirebaseUserLite | null) => void): Promise<Unsubscribe> {
		if (!isBrowser()) {
			console.info('[firebase-service] onAuthState called but not in browser.');
			cb(null);
			return () => {};
		}

		await initFirebase();
		if (!isEnabled()) {
			// Provide a synchronous callback and noop unsub
			cb(null);
			return () => {};
		}

		const { onAuthStateChanged } = await import('firebase/auth');
		const unsub = onAuthStateChanged(auth, (u: any) => {
			// normalize user or null and update the service-level store before calling the callback
			const normalized = u
				? {
						uid: u.uid,
						displayName: u.displayName,
						email: u.email,
						photoURL: u.photoURL,
					}
				: null;
			// update store so pages/components can subscribe to auth state
			user.set(normalized);

			// If the user just signed in and there is local fallback data, attempt resync in background.
			if (normalized) {
				try {
					const localKey = 'arcana:characters';
					const raw = (() => {
						try {
							return localStorage.getItem(localKey);
						} catch {
							return null;
						}
					})();
					if (raw) {
						(async () => {
							try {
								const parsed = JSON.parse(raw);
								if (Array.isArray(parsed) && parsed.length > 0) {
									await saveCharactersForUser(
										normalized.uid,
										parsed.map((p: any) => new Character(p)),
									);
									try {
										localStorage.removeItem(localKey);
										console.info(
											'[firebase-service] Resynced local characters to Firestore after sign-in and cleared local fallback.',
										);
									} catch (rmErr) {
										console.warn(
											'[firebase-service] Resynced after sign-in but failed to remove local fallback:',
											rmErr,
										);
									}
								}
							} catch (errResync) {
								console.warn(
									'[firebase-service] Failed to resync local fallback after sign-in:',
									errResync,
								);
							}
						})();
					}
				} catch (eResync) {
					console.warn(
						'[firebase-service] Error scheduling resync after sign-in (ignored):',
						eResync,
					);
				}
			}

			// call the external callback
			cb(normalized);
		});
		return () => {
			try {
				if (unsub) unsub();
			} catch {
				/* ignore */
			}
		};
	}

	/**
	 * Sign in with Google (popup)
	 */
	async function signInWithGoogle(): Promise<FirebaseUserLite | null> {
		if (!isBrowser()) return null;
		await initFirebase();
		if (!isEnabled()) {
			console.info('[firebase-service] signInWithGoogle called but firebase is not enabled');
			return null;
		}
		const { GoogleAuthProvider, signInWithPopup } = await import('firebase/auth');
		const provider = new GoogleAuthProvider();
		provider.setCustomParameters({ prompt: 'select_account' });
		const result = await signInWithPopup(auth, provider);
		const user = result.user;
		if (!user) return null;

		// Attempt to resync local fallback immediately after sign-in in background.
		try {
			const localKey = 'arcana:characters';
			const raw = (() => {
				try {
					return localStorage.getItem(localKey);
				} catch {
					return null;
				}
			})();
			if (raw) {
				(async () => {
					try {
						const parsed = JSON.parse(raw);
						if (Array.isArray(parsed) && parsed.length > 0) {
							await saveCharactersForUser(
								user.uid,
								parsed.map((p: any) => new Character(p)),
							);
							try {
								localStorage.removeItem(localKey);
								console.info(
									'[firebase-service] Resynced local characters to Firestore after sign-in and cleared local fallback.',
								);
							} catch (rmErr) {
								console.warn(
									'[firebase-service] Resynced after sign-in but failed to remove local fallback:',
									rmErr,
								);
							}
						}
					} catch (errResync) {
						console.warn(
							'[firebase-service] Failed to resync local fallback after sign-in:',
							errResync,
						);
					}
				})();
			}
		} catch (e) {
			console.warn('[firebase-service] Error scheduling resync after sign-in (ignored):', e);
		}

		return {
			uid: user.uid,
			displayName: user.displayName,
			email: user.email,
			photoURL: user.photoURL,
		};
	}

	/**
	 * Sign out user
	 */
	async function signOutUser(): Promise<void> {
		if (!isBrowser()) return;
		await initFirebase();
		if (!isEnabled()) {
			console.info('[firebase-service] signOutUser called but firebase is not enabled');
			return;
		}
		const { signOut } = await import('firebase/auth');
		await signOut(auth);
	}

	/**
	 * Firestore helpers for characters.
	 * Documents stored under: users/{uid}/characters/{characterId}
	 */
	function ensureFirestore(): void {
		if (!isBrowser()) throw new Error('Not in browser');
		if (!isEnabled()) throw new Error('Firebase not enabled');
		if (!db) throw new Error('Firestore not initialized');
	}

	async function saveCharactersForUser(userId: string, characters: Character[]): Promise<void> {
		if (!userId) throw new Error('userId required');
		if (!isBrowser()) return;
		await initFirebase();
		if (!isEnabled()) {
			console.info('[firebase-service] saveCharactersForUser: firebase not enabled; skipping');
			return;
		}
		ensureFirestore();
		const { doc, setDoc } = await import('firebase/firestore');
		try {
			const ops = characters.map((c) => {
				const plain = JSON.parse(JSON.stringify(c || {}));
				const ref = doc(db, 'users', userId, 'characters', plain.id);
				return setDoc(ref, plain, { merge: true });
			});
			await Promise.all(ops);
		} catch (err) {
			console.error('[firebase-service] saveCharactersForUser error:', err);
			throw err;
		}
	}

	async function deleteCharacterForUser(userId: string, characterId: string): Promise<void> {
		if (!userId) throw new Error('userId required');
		if (!characterId) throw new Error('characterId required');
		if (!isBrowser()) return;
		await initFirebase();
		if (!isEnabled()) {
			console.info('[firebase-service] deleteCharacterForUser: firebase not enabled; skipping');
			return;
		}
		ensureFirestore();
		const { doc, deleteDoc } = await import('firebase/firestore');
		try {
			await deleteDoc(doc(db, 'users', userId, 'characters', characterId));
		} catch (err) {
			console.error('[firebase-service] deleteCharacterForUser error:', err);
			throw err;
		}
	}

	async function loadCharactersForUser(userId: string): Promise<Character[]> {
		if (!userId) throw new Error('userId required');
		if (!isBrowser()) return [];
		await initFirebase();
		if (!isEnabled()) {
			console.info('[firebase-service] loadCharactersForUser: firebase not enabled; returning []');
			return [];
		}
		ensureFirestore();
		const { collection, getDocs } = await import('firebase/firestore');
		try {
			const col = collection(db, 'users', userId, 'characters');
			const snap = await getDocs(col);
			const out: Character[] = [];
			snap.forEach((docSnap: any) => {
				const data = docSnap.data();
				try {
					out.push(new Character(data));
				} catch {
					out.push(new Character({ ...(data as any) }));
				}
			});
			return out;
		} catch (err) {
			console.error('[firebase-service] loadCharactersForUser error:', err);
			throw err;
		}
	}

	/**
	 * Real-time listener for user's characters collection.
	 * Returns an unsubscribe function.
	 */
	function listenCharactersForUser(
		userId: string,
		cb: (characters: Character[]) => void,
	): Unsubscribe {
		if (!isBrowser()) {
			console.info(
				'[firebase-service] listenCharactersForUser called but not in browser. Calling back with empty array.',
			);
			cb([]);
			return () => {};
		}

		let unsub: Unsubscribe = () => {};
		// run attach asynchronously via a named function; return an unsubscribe which will call the actual unsub when available
		async function attachListener(): Promise<void> {
			try {
				await initFirebase();
				if (!isEnabled()) {
					console.info(
						'[firebase-service] listenCharactersForUser: firebase not enabled; calling back []',
					);
					cb([]);
					return;
				}
				ensureFirestore();
				const { collection, onSnapshot } = await import('firebase/firestore');
				const col = collection(db, 'users', userId, 'characters');
				unsub = onSnapshot(
					col,
					(snapshot: any) => {
						const chars: Character[] = [];
						snapshot.forEach((docSnap: any) => {
							const data = docSnap.data();
							try {
								chars.push(new Character(data));
							} catch {
								chars.push(new Character({ ...(data as any) }));
							}
						});
						cb(chars);
					},
					(error: any) => {
						console.error('[firebase-service] listenCharactersForUser snapshot error:', error);
						cb([]);
					},
				);
			} catch (err) {
				console.error('[firebase-service] Error setting up characters snapshot listener:', err);
				cb([]);
			}
		}
		// call and guard for unhandled rejection (so errors are logged)
		attachListener().catch((err) => {
			console.error(
				'[firebase-service] Error setting up characters snapshot listener (unhandled):',
				err,
			);
			cb([]);
		});

		return () => {
			try {
				if (unsub) unsub();
			} catch {
				/* ignore */
			}
		};
	}

	/**
	 * Firestore helpers for roll logs (dice history).
	 *
	 * Writes roll logs as documents under users/{userId}/rollLogs/{logId}.
	 * The functions are defensive: they await init and verify firebase is enabled.
	 */

	async function saveRollLogsForUser(userId: string, logs: any[]): Promise<void> {
		if (!userId) throw new Error('userId required');
		if (!isBrowser()) return;
		await initFirebase();
		if (!isEnabled()) {
			console.info('[firebase-service] saveRollLogsForUser: firebase not enabled; skipping');
			return;
		}
		ensureFirestore();
		const { doc, writeBatch } = await import('firebase/firestore');

		const plainLogs = logs.map((l) => JSON.parse(JSON.stringify(l || {})));

		const MAX_ATTEMPTS = 3;
		let attempt = 0;

		while (attempt < MAX_ATTEMPTS) {
			try {
				const batch = writeBatch(db);
				for (const plain of plainLogs) {
					const ref = doc(db, 'users', userId, 'rollLogs', plain.id);
					batch.set(ref, plain, { merge: true });
				}
				await batch.commit();
				return;
			} catch (err: any) {
				attempt++;
				console.error(`[firebase-service] saveRollLogsForUser attempt ${attempt} failed:`, err);
				if (attempt < MAX_ATTEMPTS) {
					const backoffMs = 200 * Math.pow(2, attempt - 1);
					await new Promise((res) => setTimeout(res, backoffMs));
					continue;
				}
				// fallback to localStorage to avoid data loss
				try {
					const localKey = 'arcana:rollLogs';
					localStorage.setItem(localKey, JSON.stringify(plainLogs));
					console.warn(
						'[firebase-service] saveRollLogsForUser: all attempts failed. Roll logs saved to localStorage as fallback under key:',
						localKey,
					);
				} catch (lsErr) {
					console.error(
						'[firebase-service] saveRollLogsForUser fallback to localStorage failed:',
						lsErr,
					);
				}
				return;
			}
		}
	}

	async function loadRollLogsForUser(userId: string): Promise<any[]> {
		if (!userId) throw new Error('userId required');
		if (!isBrowser()) return [];
		await initFirebase();
		if (!isEnabled()) {
			console.info('[firebase-service] loadRollLogsForUser: firebase not enabled; returning []');
			return [];
		}
		ensureFirestore();
		const { collection, getDocs } = await import('firebase/firestore');
		try {
			const col = collection(db, 'users', userId, 'rollLogs');
			const snap = await getDocs(col);
			const out: any[] = [];
			snap.forEach((docSnap: any) => {
				const data = docSnap.data();
				out.push({ ...data });
			});
			return out;
		} catch (err) {
			console.error('[firebase-service] loadRollLogsForUser error:', err);
			throw err;
		}
	}

	function listenRollLogsForUser(userId: string, cb: (logs: any[]) => void): Unsubscribe {
		if (!isBrowser()) {
			console.info(
				'[firebase-service] listenRollLogsForUser called but not in browser. Calling back with empty array.',
			);
			cb([]);
			return () => {};
		}

		let unsub: Unsubscribe = () => {};
		(async () => {
			try {
				await initFirebase();
				if (!isEnabled()) {
					console.info(
						'[firebase-service] listenRollLogsForUser: firebase not enabled; calling back []',
					);
					cb([]);
					return;
				}
				ensureFirestore();
				const { collection, onSnapshot } = await import('firebase/firestore');
				const col = collection(db, 'users', userId, 'rollLogs');
				unsub = onSnapshot(
					col,
					(snapshot: any) => {
						const entries: any[] = [];
						snapshot.forEach((docSnap: any) => {
							const data = docSnap.data();
							entries.push({ ...data });
						});
						cb(entries);
					},
					(error: any) => {
						console.error('[firebase-service] listenRollLogsForUser snapshot error:', error);
						cb([]);
					},
				);
			} catch (err) {
				console.error('[firebase-service] Error setting up roll logs snapshot listener:', err);
				cb([]);
			}
		})().catch((err) => {
			console.error('[firebase-service] Error starting roll logs listener (unhandled):', err);
			cb([]);
		});

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
		await initFirebase();
		if (!isEnabled()) {
			console.info('[firebase-service] deleteRollLogForUser: firebase not enabled; skipping');
			return;
		}
		ensureFirestore();
		const { doc, deleteDoc } = await import('firebase/firestore');
		try {
			await deleteDoc(doc(db, 'users', userId, 'rollLogs', logId));
		} catch (err) {
			console.error('[firebase-service] deleteRollLogForUser error:', err);
			throw err;
		}
	}

	// public API
	return {
		firebaseReady: ready,
		user,
		initFirebase,
		isEnabled,
		signInWithGoogle,
		signOutUser,
		onAuthState, // returns Promise<Unsubscribe>
		saveCharactersForUser,
		loadCharactersForUser,
		deleteCharacterForUser,
		listenCharactersForUser,
		saveRollLogsForUser,
		loadRollLogsForUser,
		deleteRollLogForUser,
		listenRollLogsForUser,
	};
}

/**
 * Singleton instance and convenience exports to match existing import patterns.
 */
const singleton = createFirebaseService();

/**
 * Primary access pattern consistent with other services:
 * const svc = useFirebaseService(); svc.initFirebase() ...
 */
export function useFirebaseService() {
	return singleton;
}
