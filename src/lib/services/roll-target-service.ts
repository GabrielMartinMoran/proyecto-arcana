import { get, writable, type Writable } from 'svelte/store';

export type RollTarget =
	| { type: 'personal' }
	| { type: 'party'; partyId: string; partyName?: string };

const STORAGE_KEY = 'arcana:rollTarget';

function isBrowser(): boolean {
	return typeof window !== 'undefined';
}

function isNonEmptyString(v: unknown): v is string {
	return typeof v === 'string' && v.trim().length > 0;
}

function parseStoredTarget(raw: any): RollTarget | null {
	if (!raw || typeof raw !== 'object') return null;
	if (raw.type === 'party' && isNonEmptyString(raw.partyId)) {
		return { type: 'party', partyId: raw.partyId, partyName: isNonEmptyString(raw.partyName) ? raw.partyName : undefined };
	}
	return { type: 'personal' };
}

function persist(target: RollTarget) {
	if (!isBrowser()) return;
	try {
		localStorage.setItem(STORAGE_KEY, JSON.stringify(target));
	} catch (err) {
		console.warn('[roll-target-service] failed to persist target', err);
	}
}

function load(): RollTarget | null {
	if (!isBrowser()) return null;
	try {
		const raw = localStorage.getItem(STORAGE_KEY);
		if (!raw) return null;
		const parsed = JSON.parse(raw);
		return parseStoredTarget(parsed);
	} catch (err) {
		console.warn('[roll-target-service] failed to load target', err);
		return null;
	}
}

const state = {
	inited: false,
	target: writable<RollTarget>({ type: 'personal' }) as Writable<RollTarget>,
	unsub: null as null | (() => void),
};

export function useRollTargetService() {
	// one-time init
	if (!state.inited) {
		state.inited = true;
		// Initialize from storage
		const stored = load();
		if (stored) {
			state.target.set(stored);
		}
		// Persist on changes
		state.unsub = state.target.subscribe((t) => persist(t));
	}

	const setPersonalTarget = () => {
		state.target.set({ type: 'personal' });
	};

	const setPartyTarget = (partyId: string, partyName?: string) => {
		if (!isNonEmptyString(partyId)) {
			console.warn('[roll-target-service] setPartyTarget called with invalid partyId, falling back to personal');
			state.target.set({ type: 'personal' });
			return;
		}
		const target: RollTarget = { type: 'party', partyId: partyId.trim() };
		if (isNonEmptyString(partyName)) target.partyName = partyName.trim();
		state.target.set(target);
	};

	/**
	 * Reconcile the current target against accessible party ids.
	 * If the current target is a party and is not accessible anymore, fallback to personal.
	 */
	const reconcileAccessibility = (accessiblePartyIds: string[]) => {
		try {
			const t = get(state.target);
			if (t.type === 'party') {
				const ok = Array.isArray(accessiblePartyIds) && accessiblePartyIds.includes(t.partyId);
				if (!ok) {
					state.target.set({ type: 'personal' });
				}
			}
		} catch (err) {
			console.warn('[roll-target-service] reconcileAccessibility error', err);
		}
	};

	const getTarget = (): RollTarget => get(state.target);
	const isPersonalTarget = (): boolean => get(state.target).type === 'personal';
	const isPartyTarget = (): boolean => get(state.target).type === 'party';
	const getPartyId = (): string | null => {
		const t = get(state.target);
		return t.type === 'party' ? t.partyId : null;
	};

	return {
		// reactive store
		target: state.target,

		// mutations
		setPersonalTarget,
		setPartyTarget,
		reconcileAccessibility,

		// convenience getters
		getTarget,
		isPersonalTarget,
		isPartyTarget,
		getPartyId,

		// cleanup if needed (not strictly required in SPA)
		cleanup: () => {
			if (state.unsub) {
				try {
					state.unsub();
				} catch {
					/* ignore */
				}
				state.unsub = null;
			}
		},
	};
}
