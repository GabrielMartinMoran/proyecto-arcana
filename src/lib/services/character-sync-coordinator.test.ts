import { afterEach, describe, expect, it, vi } from 'vitest';
import { createCharacterSyncCoordinator } from './character-sync-coordinator';

const DEBOUNCE_MS = 500;
const GUARD_MS = 1500;

type TestCharacter = { id: string; name: string };

const flushPromises = async () => {
	await Promise.resolve();
	await Promise.resolve();
};

const createDeferred = () => {
	let resolve!: () => void;
	const promise = new Promise<void>((done) => {
		resolve = done;
	});
	return { promise, resolve };
};

describe('FEAT embedded-character-sync — character sync coordinator', () => {
	afterEach(() => {
		vi.useRealTimers();
	});

	it('debounces rapid edits and saves only the latest character state', async () => {
		vi.useFakeTimers();
		const saveLatest = vi.fn(async () => {});
		const coordinator = createCharacterSyncCoordinator<TestCharacter>({
			debounceMs: DEBOUNCE_MS,
			localEditGuardMs: GUARD_MS,
			saveLatest,
		});

		coordinator.scheduleSave('user-1', { id: 'char-1', name: 'A' });
		await vi.advanceTimersByTimeAsync(250);
		coordinator.scheduleSave('user-1', { id: 'char-1', name: 'AB' });
		await vi.advanceTimersByTimeAsync(250);
		coordinator.scheduleSave('user-1', { id: 'char-1', name: 'ABC' });

		expect(saveLatest).not.toHaveBeenCalled();
		await vi.advanceTimersByTimeAsync(DEBOUNCE_MS);
		await flushPromises();

		expect(saveLatest).toHaveBeenCalledTimes(1);
		expect(saveLatest).toHaveBeenCalledWith('user-1', { id: 'char-1', name: 'ABC' });
	});

	it('serializes in-flight saves and sends the newest queued character after the in-flight save completes', async () => {
		vi.useFakeTimers();
		const firstSave = createDeferred();
		const saveLatest = vi
			.fn()
			.mockReturnValueOnce(firstSave.promise)
			.mockResolvedValueOnce(undefined);
		const coordinator = createCharacterSyncCoordinator<TestCharacter>({
			debounceMs: DEBOUNCE_MS,
			localEditGuardMs: GUARD_MS,
			saveLatest,
		});

		coordinator.scheduleSave('user-1', { id: 'char-1', name: 'First' });
		await vi.advanceTimersByTimeAsync(DEBOUNCE_MS);
		await flushPromises();
		expect(saveLatest).toHaveBeenCalledTimes(1);

		coordinator.scheduleSave('user-1', { id: 'char-1', name: 'Second' });
		await vi.advanceTimersByTimeAsync(250);
		coordinator.scheduleSave('user-1', { id: 'char-1', name: 'Third' });
		await vi.advanceTimersByTimeAsync(DEBOUNCE_MS);
		await flushPromises();
		expect(saveLatest).toHaveBeenCalledTimes(1);

		firstSave.resolve();
		await flushPromises();

		expect(saveLatest).toHaveBeenCalledTimes(2);
		expect(saveLatest).toHaveBeenLastCalledWith('user-1', { id: 'char-1', name: 'Third' });
	});

	it('guards recent local edits and pending saves from stale remote snapshots', () => {
		vi.useFakeTimers();
		const coordinator = createCharacterSyncCoordinator<TestCharacter>({
			debounceMs: DEBOUNCE_MS,
			localEditGuardMs: GUARD_MS,
			saveLatest: vi.fn(async () => {}),
		});

		coordinator.markLocalEdit('user-1', 'char-1');
		expect(coordinator.shouldIgnoreRemoteSnapshot('user-1', 'char-1')).toBe(true);

		vi.advanceTimersByTime(GUARD_MS + 1);
		expect(coordinator.shouldIgnoreRemoteSnapshot('user-1', 'char-1')).toBe(false);

		coordinator.scheduleSave('user-1', { id: 'char-1', name: 'Queued' });
		vi.advanceTimersByTime(GUARD_MS + 1);
		expect(coordinator.shouldIgnoreRemoteSnapshot('user-1', 'char-1')).toBe(true);
	});

	it('cleans up timers and pending state on dispose', async () => {
		vi.useFakeTimers();
		const saveLatest = vi.fn(async () => {});
		const coordinator = createCharacterSyncCoordinator<TestCharacter>({
			debounceMs: DEBOUNCE_MS,
			localEditGuardMs: GUARD_MS,
			saveLatest,
		});

		coordinator.scheduleSave('user-1', { id: 'char-1', name: 'Queued' });
		expect(coordinator.shouldIgnoreRemoteSnapshot('user-1', 'char-1')).toBe(true);

		coordinator.dispose();
		await vi.advanceTimersByTimeAsync(DEBOUNCE_MS);

		expect(saveLatest).not.toHaveBeenCalled();
		expect(coordinator.shouldIgnoreRemoteSnapshot('user-1', 'char-1')).toBe(false);
	});
});
