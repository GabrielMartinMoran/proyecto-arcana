type TimeoutHandle = ReturnType<typeof setTimeout>;

type PendingCharacterSave<TCharacter extends { id: string }> = {
	timeout: TimeoutHandle | null;
	inFlight: boolean;
	character: TCharacter | null;
};

type CharacterSyncCoordinatorOptions<TCharacter extends { id: string }> = {
	debounceMs: number;
	localEditGuardMs: number;
	saveLatest: (ownerId: string, character: TCharacter) => Promise<void>;
	clone?: (character: TCharacter) => TCharacter;
	onSaveError?: (error: unknown, ownerId: string, character: TCharacter) => void;
};

export type CharacterSyncCoordinator<TCharacter extends { id: string }> = {
	getSyncKey: (ownerId: string, characterId: string) => string;
	markLocalEdit: (ownerId: string, characterId: string) => string;
	shouldIgnoreRemoteSnapshot: (ownerId: string, characterId: string) => boolean;
	scheduleSave: (ownerId: string, character: TCharacter) => void;
	dispose: () => void;
};

export const createCharacterSyncCoordinator = <TCharacter extends { id: string }>(
	options: CharacterSyncCoordinatorOptions<TCharacter>,
): CharacterSyncCoordinator<TCharacter> => {
	const pendingSavesByKey = new Map<string, PendingCharacterSave<TCharacter>>();
	const lastLocalEditAt = new Map<string, number>();
	const clone = options.clone ?? ((character: TCharacter) => ({ ...character }));

	const getSyncKey = (ownerId: string, characterId: string) => `${ownerId}:${characterId}`;

	const getPendingSave = (key: string): PendingCharacterSave<TCharacter> => {
		const existing = pendingSavesByKey.get(key);
		if (existing) return existing;

		const created = { timeout: null, inFlight: false, character: null };
		pendingSavesByKey.set(key, created);
		return created;
	};

	const markLocalEdit = (ownerId: string, characterId: string) => {
		const key = getSyncKey(ownerId, characterId);
		lastLocalEditAt.set(key, Date.now());
		return key;
	};

	const hasRecentLocalEdit = (key: string) => {
		const editedAt = lastLocalEditAt.get(key);
		return editedAt !== undefined && Date.now() - editedAt < options.localEditGuardMs;
	};

	const shouldIgnoreRemoteSnapshot = (ownerId: string, characterId: string) => {
		const key = getSyncKey(ownerId, characterId);
		const pending = pendingSavesByKey.get(key);
		return Boolean(hasRecentLocalEdit(key) || pending?.character || pending?.inFlight);
	};

	const cleanupIfIdle = (key: string, pending: PendingCharacterSave<TCharacter>) => {
		if (!pending.character && !pending.timeout && !pending.inFlight) pendingSavesByKey.delete(key);
	};

	const savePending = async (key: string, ownerId: string) => {
		const pending = pendingSavesByKey.get(key);
		if (!pending || pending.inFlight) return;

		const character = pending.character;
		if (!character) {
			cleanupIfIdle(key, pending);
			return;
		}

		pending.character = null;
		pending.inFlight = true;
		try {
			await options.saveLatest(ownerId, character);
		} catch (error) {
			options.onSaveError?.(error, ownerId, character);
		} finally {
			pending.inFlight = false;
			if (pending.character && !pending.timeout) {
				void savePending(key, ownerId);
			} else {
				cleanupIfIdle(key, pending);
			}
		}
	};

	const scheduleSave = (ownerId: string, character: TCharacter) => {
		const key = markLocalEdit(ownerId, character.id);
		const pending = getPendingSave(key);
		pending.character = clone(character);
		if (pending.timeout) clearTimeout(pending.timeout);
		pending.timeout = setTimeout(() => {
			pending.timeout = null;
			void savePending(key, ownerId);
		}, options.debounceMs);
	};

	const dispose = () => {
		for (const pending of pendingSavesByKey.values()) {
			if (pending.timeout) clearTimeout(pending.timeout);
		}
		pendingSavesByKey.clear();
		lastLocalEditAt.clear();
	};

	return {
		getSyncKey,
		markLocalEdit,
		shouldIgnoreRemoteSnapshot,
		scheduleSave,
		dispose,
	};
};
