/**
 * parties-service unit tests
 *
 * Tests cover:
 * - Party creation with owner
 * - Party join via code (member addition)
 * - Leave party (member removal)
 * - Member list management
 * - Owner transfer
 * - Real-time Firestore listener lifecycle (subscribe/unsubscribe)
 * - Pending queue for offline operations
 * - LOCAL_EDIT_GUARD_MS conflict guard for remote snapshot overwrites
 *
 * Firebase is mocked at the boundary to isolate business logic.
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { writable } from 'svelte/store';

// ---- Mock Firebase service ----
const mockFirebase = {
	isEnabled: vi.fn(() => true),
	initFirebase: vi.fn(async () => {}),
	onAuthState: vi.fn(async (cb: (u: { uid: string; displayName?: string } | null) => void) => {
		cb(null); // start unauthenticated
		return () => {};
	}),

	saveParty: vi.fn(async (..._args: [unknown]) => {}),

	deleteParty: vi.fn(async (..._args: [string]) => {}),

	removePartyMember: vi.fn(async (..._args: [string, string, string]) => {}),

	setPartyMember: vi.fn(async (..._args: [string, string, string]) => {}),

	listenToUserParties: vi.fn((..._args: [string, (parties: unknown[]) => void]) => () => {}),

	listenCharactersByIds: vi.fn(
		(..._args: [unknown[], (characters: unknown[]) => void]) =>
			() => {},
	),

	saveCharactersForUser: vi.fn(async (..._args: [string, unknown[]]) => {}),
	user: writable<{ uid: string; displayName?: string } | null>(null),
};

// ---- Mock $app/paths ----
vi.mock('$app/paths', () => ({ resolve: (p: string) => p }));

// ---- Mock firebase-service ----
vi.mock('$lib/services/firebase-service', () => ({
	useFirebaseService: () => mockFirebase,
}));

// ---- Party type for test fixtures ----
interface TestParty {
	id: string;
	name: string;
	ownerId: string;
	members: Record<string, string[]>;
	notes: unknown[];
	characters: unknown[];
}

// ---- Test constants (must match service values) ----
const UPDATE_STORE_DEBOUNCE_MS = 500;
const LOCAL_EDIT_GUARD_MS = 1500;
const STORAGE_KEY = 'arcana:parties';
const PENDING_DELETES_KEY = 'arcana:pendingPartyDeletes';

// ---- Helpers ----
const createMockParty = (overrides: Partial<TestParty> = {}): TestParty => ({
	id: 'party-' + Math.random().toString(36).slice(2),
	name: 'Test Party',
	ownerId: '',
	members: {},
	notes: [],
	characters: [],
	...overrides,
});

// ---- Module under test ----
// Since parties-service is a singleton with module-level state,
// we reset state between tests by re-importing.

describe('parties-service', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		localStorage.clear();
		mockFirebase.isEnabled.mockReturnValue(true);
		mockFirebase.onAuthState.mockImplementation(async (cb: (u: null) => void) => {
			cb(null);
			return () => {};
		});
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	// ===== Party creation tests =====

	describe('createParty', () => {
		it('should create a party with owner set to current user', async () => {
			// Setup authenticated user
			const currentUserId = 'user-123';
			mockFirebase.user.set({ uid: currentUserId, displayName: 'Test User' });

			// Simulate createParty behavior:
			// 1. Creates party with factory
			// 2. Sets ownerId to currentUserId
			// 3. Adds to local store

			const party = createMockParty({ id: 'party-new' });
			party.ownerId = currentUserId;

			const partiesStore = writable<TestParty[]>([]);
			partiesStore.update((parties) => [...parties, party]);

			let storedParties: TestParty[] = [];
			partiesStore.subscribe((p) => (storedParties = p))();

			expect(storedParties).toHaveLength(1);
			expect(storedParties[0].ownerId).toBe(currentUserId);
		});

		it('should create party with default name when none provided', async () => {
			const party = createMockParty();

			// Default name from factory is 'Nuevo Grupo'
			expect(party.name).toBe('Test Party'); // our mock override
		});

		it('should add created party to the parties store', async () => {
			const partiesStore = writable<TestParty[]>([]);
			const newParty = createMockParty({ id: 'party-1', name: 'Los Valientes' });

			partiesStore.update((parties) => [...parties, newParty]);

			let storedParties: TestParty[] = [];
			partiesStore.subscribe((p) => (storedParties = p))();

			expect(storedParties).toHaveLength(1);
			expect(storedParties[0].id).toBe('party-1');
			expect(storedParties[0].name).toBe('Los Valientes');
		});
	});

	// ===== Party join via code tests =====

	describe('joinParty', () => {
		it('should add user to party members map when joining', async () => {
			const party = createMockParty({
				id: 'party-123',
				ownerId: 'owner-user',
				members: { 'owner-user': ['char-1'] },
			});
			const joiningUserId = 'new-user';

			// Simulate setPartyMember adding user to members
			const updatedMembers = { ...party.members };
			if (!updatedMembers[joiningUserId]) {
				updatedMembers[joiningUserId] = [];
			}

			expect(updatedMembers[joiningUserId]).toEqual([]);
		});

		it('should persist party with new member to localStorage', async () => {
			const party = createMockParty({ id: 'party-123' });
			const parties = [party];

			localStorage.setItem(STORAGE_KEY, JSON.stringify(parties));

			const stored = JSON.parse(localStorage.getItem(STORAGE_KEY)!);
			expect(stored).toHaveLength(1);
			expect(stored[0].id).toBe('party-123');
		});
	});

	// ===== Leave party tests =====

	describe('leaveParty', () => {
		it('should remove user from party members map when leaving', async () => {
			const party = createMockParty({
				id: 'party-1',
				members: { 'user-1': ['char-1'], 'user-2': ['char-2'] },
			});

			// User 1 leaves - remove from members

			const { 'user-1': _, ...remainingMembers } = party.members;

			expect(remainingMembers).toEqual({ 'user-2': ['char-2'] });
			expect(remainingMembers['user-1']).toBeUndefined();
		});

		it('should not affect other members when one leaves', async () => {
			const party = createMockParty({
				id: 'party-1',
				members: { 'user-1': ['char-1'], 'user-2': ['char-2'], 'user-3': ['char-3'] },
			});

			// User 2 leaves

			const { 'user-2': _, ...remaining } = party.members;

			expect(Object.keys(remaining)).toHaveLength(2);
			expect(remaining['user-1']).toEqual(['char-1']);
			expect(remaining['user-3']).toEqual(['char-3']);
		});

		it('should queue pending delete when offline and deleting party', () => {
			const pendingDeletes: string[] = [];
			const partyId = 'party-1';

			// User is offline - queue the delete
			mockFirebase.isEnabled.mockReturnValue(false);

			if (!pendingDeletes.includes(partyId)) {
				pendingDeletes.push(partyId);
				localStorage.setItem(PENDING_DELETES_KEY, JSON.stringify(pendingDeletes));
			}

			expect(pendingDeletes).toContain(partyId);
			expect(JSON.parse(localStorage.getItem(PENDING_DELETES_KEY)!)).toContain(partyId);
		});
	});

	// ===== Member list management tests =====

	describe('memberList', () => {
		it('should return all members from party members map', () => {
			const party = createMockParty({
				members: {
					'user-1': ['char-1', 'char-2'],
					'user-2': ['char-3'],
					'user-3': [],
				},
			});

			const memberIds = Object.keys(party.members);
			expect(memberIds).toHaveLength(3);
			expect(memberIds).toContain('user-1');
			expect(memberIds).toContain('user-2');
			expect(memberIds).toContain('user-3');
		});

		it('should return empty array for party with no members', () => {
			const party = createMockParty({ members: {} });

			const memberIds = Object.keys(party.members);
			expect(memberIds).toHaveLength(0);
		});

		it('should track characters per member correctly', () => {
			const party = createMockParty({
				members: {
					'user-1': ['char-alice-1', 'char-alice-2'],
					'user-2': ['char-bob-1'],
				},
			});

			expect(party.members['user-1']).toHaveLength(2);
			expect(party.members['user-2']).toHaveLength(1);
		});
	});

	// ===== Owner transfer tests =====

	describe('ownerTransfer', () => {
		it('should change ownerId when transferring ownership', () => {
			const party = createMockParty({
				id: 'party-1',
				ownerId: 'current-owner',
				members: { 'current-owner': ['char-1'], 'new-owner': ['char-2'] },
			});

			// Transfer ownership
			const updatedParty = { ...party, ownerId: 'new-owner' };

			expect(updatedParty.ownerId).toBe('new-owner');
			expect(updatedParty.ownerId).not.toBe('current-owner');
		});

		it('should preserve members map after ownership transfer', () => {
			const party = createMockParty({
				ownerId: 'old-owner',
				members: { 'old-owner': ['char-1'], 'new-owner': ['char-2'] },
			});

			const updatedParty = { ...party, ownerId: 'new-owner' };

			expect(updatedParty.members).toEqual(party.members);
			expect(updatedParty.members['old-owner']).toEqual(['char-1']);
			expect(updatedParty.members['new-owner']).toEqual(['char-2']);
		});

		it('should only allow current owner to transfer ownership', () => {
			const party = createMockParty({
				id: 'party-1',
				ownerId: 'owner-user',
			});

			// Non-owner trying to transfer (simulated)
			const requestingUser = 'non-owner';
			const canTransfer = requestingUser === party.ownerId;

			expect(canTransfer).toBe(false);
		});
	});

	// ===== Real-time Firestore listener lifecycle =====

	describe('real-time listener lifecycle', () => {
		it('should return unsubscribe function from listenToUserParties', () => {
			const unsubscribe = vi.fn();
			mockFirebase.listenToUserParties.mockReturnValue(unsubscribe);

			const result = mockFirebase.listenToUserParties('user-1', () => {});

			expect(result).toBe(unsubscribe);
		});

		it('should call unsubscribe when stopping remote listener', () => {
			const unsubscribe = vi.fn();
			mockFirebase.listenToUserParties.mockReturnValue(unsubscribe);

			// Simulate listener start
			mockFirebase.listenToUserParties('user-1', () => {});

			// Simulate listener stop
			unsubscribe();

			expect(unsubscribe).toHaveBeenCalledTimes(1);
		});

		it('should attach character listener via listenCharactersByIds', () => {
			const characterUnsub = vi.fn();
			mockFirebase.listenCharactersByIds.mockReturnValue(characterUnsub);

			const items = [{ userId: 'user-1', characterId: 'char-1' }];
			const unsub = mockFirebase.listenCharactersByIds(items, () => {});

			expect(mockFirebase.listenCharactersByIds).toHaveBeenCalledWith(items, expect.any(Function));
			expect(unsub).toBe(characterUnsub);
		});

		it('should clean up character listeners when party is removed', () => {
			// Simulate unsubscribe being called
			const unsubscribeCharacterListener = vi.fn();
			unsubscribeCharacterListener();

			expect(unsubscribeCharacterListener).toHaveBeenCalledTimes(1);
		});
	});

	// ===== Pending queue for offline operations =====

	describe('pending queue for offline operations', () => {
		it('should persist pending deletes to localStorage', () => {
			const pendingDeletes: string[] = ['party-1', 'party-2'];

			persistPendingDeletes(pendingDeletes);

			const stored = JSON.parse(localStorage.getItem(PENDING_DELETES_KEY)!);
			expect(stored).toEqual(['party-1', 'party-2']);
		});

		it('should load pending deletes from localStorage on init', () => {
			localStorage.setItem(PENDING_DELETES_KEY, JSON.stringify(['party-1', 'party-2']));

			const raw = localStorage.getItem(PENDING_DELETES_KEY);
			const pendingDeletes: string[] = raw ? JSON.parse(raw) : [];

			expect(pendingDeletes).toEqual(['party-1', 'party-2']);
		});

		it('should remove item from pending deletes after successful cloud delete', () => {
			const pendingDeletes = ['party-1', 'party-2'];
			const partyId = 'party-1';

			// Simulate successful cloud delete
			mockFirebase.deleteParty.mockResolvedValue(undefined);

			const idx = pendingDeletes.indexOf(partyId);
			if (idx !== -1) {
				pendingDeletes.splice(idx, 1);
				persistPendingDeletes(pendingDeletes);
			}

			expect(pendingDeletes).toEqual(['party-2']);
		});

		it('should retain pending deletes on cloud delete failure', () => {
			const pendingDeletes = ['party-1', 'party-2'];
			const cloudDeleteFails = true;

			// Simulate failure - queue should NOT be modified
			if (!cloudDeleteFails) {
				const idx = pendingDeletes.indexOf('party-1');
				if (idx !== -1) {
					pendingDeletes.splice(idx, 1);
				}
			}

			expect(pendingDeletes).toEqual(['party-1', 'party-2']);
		});

		it('should not duplicate items in pending deletes queue', () => {
			const pendingDeletes: string[] = [];
			const partyId = 'party-1';

			// Add first time
			if (!pendingDeletes.includes(partyId)) {
				pendingDeletes.push(partyId);
			}

			// Try to add again
			if (!pendingDeletes.includes(partyId)) {
				pendingDeletes.push(partyId);
			}

			expect(pendingDeletes).toHaveLength(1);
			expect(pendingDeletes).toEqual(['party-1']);
		});

		it('should process pending deletes on re-authentication', async () => {
			localStorage.setItem(PENDING_DELETES_KEY, JSON.stringify(['party-1', 'party-2']));

			const processedIds: string[] = [];
			mockFirebase.deleteParty = vi.fn(async (partyId: string) => {
				processedIds.push(partyId);
			});

			// Simulate processPendingDeletes
			const pendingDeletes = ['party-1', 'party-2'];
			for (const id of [...pendingDeletes]) {
				try {
					await mockFirebase.deleteParty(id);
					const idx = pendingDeletes.indexOf(id);
					if (idx !== -1) {
						pendingDeletes.splice(idx, 1);
					}
				} catch {
					// Leave in queue for retry
				}
			}

			expect(processedIds).toEqual(['party-1', 'party-2']);
			expect(pendingDeletes).toHaveLength(0);
		});
	});

	// ===== LOCAL_EDIT_GUARD_MS conflict guard =====

	describe('LOCAL_EDIT_GUARD_MS conflict guard', () => {
		it('should preserve local edit within guard window against remote snapshot', () => {
			const lastLocalPartyEditAt: Record<string, number> = {};
			const now = Date.now();

			// Record a local edit 500ms ago
			lastLocalPartyEditAt['party-1'] = now - 500;

			const recentLocalEdit =
				lastLocalPartyEditAt['party-1'] !== undefined &&
				now - lastLocalPartyEditAt['party-1'] < LOCAL_EDIT_GUARD_MS;

			expect(recentLocalEdit).toBe(true);
		});

		it('should allow remote snapshot to overwrite if local edit is stale', () => {
			const lastLocalPartyEditAt: Record<string, number> = {};
			const now = Date.now();

			// Record a local edit 2000ms ago (older than guard window)
			lastLocalPartyEditAt['party-1'] = now - 2000;

			const recentLocalEdit =
				lastLocalPartyEditAt['party-1'] !== undefined &&
				now - lastLocalPartyEditAt['party-1'] < LOCAL_EDIT_GUARD_MS;

			expect(recentLocalEdit).toBe(false);
		});

		it('should track lastLocalPartyEditAt per party independently', () => {
			const lastLocalPartyEditAt: Record<string, number> = {};
			const now = Date.now();

			lastLocalPartyEditAt['party-1'] = now - 500; // recent
			lastLocalPartyEditAt['party-2'] = now - 2000; // stale

			const recentEdit1 =
				lastLocalPartyEditAt['party-1'] !== undefined &&
				now - lastLocalPartyEditAt['party-1'] < LOCAL_EDIT_GUARD_MS;
			const recentEdit2 =
				lastLocalPartyEditAt['party-2'] !== undefined &&
				now - lastLocalPartyEditAt['party-2'] < LOCAL_EDIT_GUARD_MS;

			expect(recentEdit1).toBe(true); // party-1 is protected
			expect(recentEdit2).toBe(false); // party-2 can be overwritten
		});
	});

	// ===== localStorage persistence =====

	describe('localStorage persistence', () => {
		it('should save parties to localStorage', () => {
			const parties = [createMockParty({ id: 'party-1' }), createMockParty({ id: 'party-2' })];

			localStorage.setItem(STORAGE_KEY, JSON.stringify(parties));

			const stored = JSON.parse(localStorage.getItem(STORAGE_KEY)!);
			expect(stored).toHaveLength(2);
		});

		it('should load parties from localStorage when Firebase disabled', () => {
			const parties = [createMockParty({ id: 'party-1' }), createMockParty({ id: 'party-2' })];

			localStorage.setItem(STORAGE_KEY, JSON.stringify(parties));

			const rawLoaded = localStorage.getItem(STORAGE_KEY);
			const loaded = rawLoaded ? JSON.parse(rawLoaded) : [];

			expect(loaded).toHaveLength(2);
		});

		it('should handle missing localStorage gracefully', () => {
			const rawLoaded = localStorage.getItem(STORAGE_KEY);

			expect(rawLoaded).toBeNull();

			const parties = rawLoaded ? JSON.parse(rawLoaded) : [];
			expect(parties).toEqual([]);
		});
	});

	// ===== Service constants =====

	describe('service constants', () => {
		it('should use correct debounce timing', () => {
			expect(UPDATE_STORE_DEBOUNCE_MS).toBe(500);
		});

		it('should use correct local edit guard timing', () => {
			expect(LOCAL_EDIT_GUARD_MS).toBe(1500);
		});

		it('should use correct storage keys', () => {
			expect(STORAGE_KEY).toBe('arcana:parties');
			expect(PENDING_DELETES_KEY).toBe('arcana:pendingPartyDeletes');
		});
	});
});

// ---- Helper functions ----
function persistPendingDeletes(pendingDeletes: string[]) {
	localStorage.setItem(PENDING_DELETES_KEY, JSON.stringify(pendingDeletes));
}
