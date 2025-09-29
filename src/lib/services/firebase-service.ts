/**
 * Firebase service (Auth + Firestore) - always enabled
 *
 * - Uses dynamic, modular Firebase SDK imports to avoid bundling Firebase when not needed.
 * - Provides a singleton Svelte-style service via `useFirebaseService()`.
 * - Exposes `ready` and `user` writable stores and an async `initFirebase()` method.
 * - Provides auth helpers and Firestore helpers for characters and roll logs.
 *
 * Notes:
 * - The service attempts to initialize Firebase in all environments. If the VITE_FIREBASE_*
 *   variables are missing, initialization will fail; callers should handle errors accordingly.
 */

import { Character } from '$lib/types/character';
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

function getFirebaseConfigFromEnv(): {
	apiKey: string;
	authDomain?: string;
	projectId: string;
	storageBucket?: string;
	messagingSenderId?: string;
	appId: string;
} | null {
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

		const config = getFirebaseConfigFromEnv();
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

	/* ---------------------- Firestore helpers - characters ---------------------- */

	async function ensureFirestore(): Promise<void> {
		await initFirebase();
		if (!db) throw new Error('Firestore not initialized');
	}

	async function saveCharactersForUser(userId: string, characters: Character[]): Promise<void> {
		if (!userId) throw new Error('userId required');
		if (!isBrowser()) return;
		await ensureFirestore();

		const { doc, writeBatch } = await import('firebase/firestore');

		const plain = characters.map((c) => JSON.parse(JSON.stringify(c || {})));

		// batch commit with retry
		const MAX_ATTEMPTS = 3;
		for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
			try {
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

	/* ---------------------- Firestore helpers - roll logs ---------------------- */

	async function saveRollLogsForUser(userId: string, logs: RollLog[]): Promise<void> {
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
		snap.forEach((d: any) => out.push(d.data()));
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
						snapshot.forEach((docSnap: any) => arr.push(docSnap.data()));
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

const singleton = createFirebaseService();

export function useFirebaseService() {
	return singleton;
}
