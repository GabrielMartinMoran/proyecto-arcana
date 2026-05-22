import { fireEvent, render, screen, waitFor } from '@testing-library/svelte';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import CharacterPage from './+page.svelte';

const { mockPageStore } = vi.hoisted(() => {
	// eslint-disable-next-line @typescript-eslint/no-require-imports
	const { writable } = require('svelte/store');
	return {
		mockPageStore: writable({
			params: { userId: 'user-1', characterId: 'char-1' },
			url: new URL('http://localhost/embedded/characters/user-1/char-1'),
		}),
	};
});

const firebaseMock = vi.hoisted(() => ({
	...(() => {
		// eslint-disable-next-line @typescript-eslint/no-require-imports
		const { writable } = require('svelte/store');
		return {
			initFirebase: vi.fn(),
			listenCharactersByIds: vi.fn(),
			loadCharactersForUser: vi.fn(),
			loadParty: vi.fn(),
			saveCharactersForUser: vi.fn(),
			user: writable({ uid: 'user-1' }),
		};
	})(),
}));

vi.mock('$app/stores', () => ({
	page: mockPageStore,
}));

vi.mock('$app/environment', () => ({
	browser: true,
}));

vi.mock('$lib/services/firebase-service', () => ({
	useFirebaseService: () => firebaseMock,
}));

vi.mock('$lib/services/roll-target-service', () => ({
	useRollTargetService: () => ({
		setPartyTarget: vi.fn(),
		setPersonalTarget: vi.fn(),
	}),
}));

vi.mock('$lib/services/dice-roller-service', () => ({
	useDiceRollerService: () => ({}),
}));

vi.mock(
	'$lib/components/character-sheet/CharacterSheet.svelte',
	async () => await import('./__mocks__/CharacterSheet.svelte'),
);

vi.mock(
	'$lib/components/RollModal.svelte',
	async () => await import('./__mocks__/RollModal.svelte'),
);

vi.mock('$lib/utils/token-cutter', () => ({
	createCircularToken: vi.fn().mockResolvedValue('mock-token-url'),
}));

describe('Embedded character Foundry health precedence', () => {
	let postMessageSpy: ReturnType<typeof vi.fn>;

	beforeEach(() => {
		postMessageSpy = vi.fn();
		vi.stubGlobal('parent', { postMessage: postMessageSpy });
		firebaseMock.initFirebase.mockResolvedValue(undefined);
		firebaseMock.loadParty.mockResolvedValue(null);
		firebaseMock.saveCharactersForUser.mockResolvedValue(undefined);
		firebaseMock.user.set({ uid: 'user-1' });
	});

	afterEach(() => {
		vi.useRealTimers();
		vi.clearAllMocks();
		vi.unstubAllGlobals();
	});

	it('FEAT embedded-character-sync — recent embedded edits are not overwritten by stale remote snapshots', async () => {
		vi.useFakeTimers();
		let charactersListener: ((characters: unknown[]) => void) | undefined;
		firebaseMock.listenCharactersByIds.mockImplementation((_ids, callback) => {
			charactersListener = callback;
			callback([createCharacterRaw({ currentHP: 10, attackName: 'Old Strike' })]);
			return vi.fn();
		});

		render(CharacterPage);
		const attackInput = await screen.findByTestId('attack-name-input');
		expect(attackInput).toHaveValue('Old Strike');

		await fireEvent.input(attackInput, { target: { value: 'Local Strike' } });
		expect(await screen.findByTestId('attack-name-input')).toHaveValue('Local Strike');

		charactersListener?.([createCharacterRaw({ currentHP: 10, attackName: 'Old Strike' })]);

		expect(await screen.findByTestId('attack-name-input')).toHaveValue('Local Strike');
	});

	it('FEAT embedded-character-sync — rapid embedded edits save only the latest character state', async () => {
		vi.useFakeTimers();
		firebaseMock.listenCharactersByIds.mockImplementation((_ids, callback) => {
			callback([createCharacterRaw({ currentHP: 10, attackName: 'Old Strike' })]);
			return vi.fn();
		});

		render(CharacterPage);
		const attackInput = await screen.findByTestId('attack-name-input');

		await fireEvent.input(attackInput, { target: { value: 'A' } });
		await vi.advanceTimersByTimeAsync(250);
		await fireEvent.input(await screen.findByTestId('attack-name-input'), {
			target: { value: 'AB' },
		});
		await vi.advanceTimersByTimeAsync(250);
		await fireEvent.input(await screen.findByTestId('attack-name-input'), {
			target: { value: 'ABC' },
		});

		expect(firebaseMock.saveCharactersForUser).not.toHaveBeenCalled();
		await vi.advanceTimersByTimeAsync(500);
		await flushPromises();

		expect(firebaseMock.saveCharactersForUser).toHaveBeenCalledTimes(1);
		expect(firebaseMock.saveCharactersForUser).toHaveBeenLastCalledWith(
			'user-1',
			expect.arrayContaining([
				expect.objectContaining({
					id: 'char-1',
					attacks: expect.arrayContaining([expect.objectContaining({ name: 'ABC' })]),
				}),
			]),
		);
	});

	it('FEAT embedded-character-sync — in-flight embedded saves are serialized latest-only', async () => {
		vi.useFakeTimers();
		const firstSave = createDeferred();
		firebaseMock.saveCharactersForUser
			.mockReturnValueOnce(firstSave.promise)
			.mockResolvedValueOnce(undefined);
		firebaseMock.listenCharactersByIds.mockImplementation((_ids, callback) => {
			callback([createCharacterRaw({ currentHP: 10, attackName: 'Old Strike' })]);
			return vi.fn();
		});

		render(CharacterPage);
		const attackInput = await screen.findByTestId('attack-name-input');

		await fireEvent.input(attackInput, { target: { value: 'First Strike' } });
		await vi.advanceTimersByTimeAsync(500);
		await flushPromises();
		expect(firebaseMock.saveCharactersForUser).toHaveBeenCalledTimes(1);

		await fireEvent.input(await screen.findByTestId('attack-name-input'), {
			target: { value: 'Second Strike' },
		});
		expect(await screen.findByTestId('attack-name-input')).toHaveValue('Second Strike');

		await vi.advanceTimersByTimeAsync(500);
		await flushPromises();
		expect(firebaseMock.saveCharactersForUser).toHaveBeenCalledTimes(1);

		firstSave.resolve();
		await flushPromises();

		expect(firebaseMock.saveCharactersForUser).toHaveBeenCalledTimes(2);
		expect(firebaseMock.saveCharactersForUser).toHaveBeenLastCalledWith(
			'user-1',
			expect.arrayContaining([
				expect.objectContaining({
					id: 'char-1',
					attacks: expect.arrayContaining([expect.objectContaining({ name: 'Second Strike' })]),
				}),
			]),
		);
	});

	it('FEAT foundry-character-startup-sync — valid Foundry startup health syncs identity without stale web health echo', async () => {
		mockPageStore.set({
			params: { userId: 'user-1', characterId: 'char-1' },
			url: new URL(
				'http://localhost/embedded/characters/user-1/char-1?mode=foundry&uuid=Actor.123&startHp=7&startMax=12',
			),
		});
		firebaseMock.listenCharactersByIds.mockImplementation((_ids, callback) => {
			callback([createCharacterRaw({ currentHP: 10 })]);
			return vi.fn();
		});

		render(CharacterPage);

		expect(await screen.findByTestId('character-health')).toHaveTextContent('7/12');
		const update = await findUpdateActorPayload(postMessageSpy);
		expect(update.hp).toEqual({ value: 7, max: 12 });
		expect(update.hp).not.toEqual({ value: 10, max: 11 });
		expect(update).toMatchObject({
			name: 'Test Character',
			speed: 9,
			initiative: 3,
		});
	});

	it('FEAT foundry-health-precedence — token actor startup hydration uses token actor HP', async () => {
		mockPageStore.set({
			params: { userId: 'user-1', characterId: 'char-1' },
			url: new URL(
				'http://localhost/embedded/characters/user-1/char-1?mode=foundry&uuid=Scene.scene-1.Token.token-1&startHp=3&startMax=9',
			),
		});
		firebaseMock.listenCharactersByIds.mockImplementation((_ids, callback) => {
			callback([createCharacterRaw({ currentHP: 9, body: 1 })]);
			return vi.fn();
		});

		render(CharacterPage);

		expect(await screen.findByTestId('character-health')).toHaveTextContent('3/9');
		const update = await findUpdateActorPayload(postMessageSpy);
		expect(update.hp).toEqual({ value: 3, max: 9 });
	});

	it('FEAT foundry-character-startup-sync — invalid zero over zero startup health is ignored for a fresh actor', async () => {
		mockPageStore.set({
			params: { userId: 'user-1', characterId: 'char-1' },
			url: new URL(
				'http://localhost/embedded/characters/user-1/char-1?mode=foundry&uuid=Actor.123&startHp=0&startMax=0',
			),
		});
		firebaseMock.listenCharactersByIds.mockImplementation((_ids, callback) => {
			callback([createCharacterRaw({ currentHP: 10 })]);
			return vi.fn();
		});

		render(CharacterPage);

		expect(await screen.findByTestId('character-health')).toHaveTextContent('10/11');
		const update = await findUpdateActorPayload(postMessageSpy);
		expect(update.hp).toEqual({ value: 10, max: 11 });
		expect(update.hp?.max).toBeGreaterThan(0);
	});

	it('FEAT foundry-character-startup-sync — opening a Foundry character sheet syncs name image speed and initiative', async () => {
		mockPageStore.set({
			params: { userId: 'user-1', characterId: 'char-1' },
			url: new URL(
				'http://localhost/embedded/characters/user-1/char-1?mode=foundry&uuid=Actor.123',
			),
		});
		firebaseMock.listenCharactersByIds.mockImplementation((_ids, callback) => {
			callback([createCharacterRaw({ currentHP: 10, img: 'https://example.com/token.png' })]);
			return vi.fn();
		});

		render(CharacterPage);

		expect(await screen.findByTestId('character-health')).toHaveTextContent('10/11');
		const update = await findUpdateActorPayload(postMessageSpy);
		expect(update).toMatchObject({
			name: 'Test Character',
			imageUrl: 'mock-token-url',
			imageSource: 'https://example.com/token.png',
			speed: 9,
			initiative: 3,
		});
	});

	it.each([
		['0/0', 'startHp=0&startMax=0'],
		['missing/0', 'startMax=0'],
		['NaN/12', 'startHp=NaN&startMax=12'],
		['5/NaN', 'startHp=5&startMax=NaN'],
	])(
		'FEAT foundry-character-startup-sync — startup health validation prevents invalid Health Estimate fractions for %s',
		async (_label, startupQuery) => {
			mockPageStore.set({
				params: { userId: 'user-1', characterId: 'char-1' },
				url: new URL(
					`http://localhost/embedded/characters/user-1/char-1?mode=foundry&uuid=Actor.123&${startupQuery}`,
				),
			});
			firebaseMock.listenCharactersByIds.mockImplementation((_ids, callback) => {
				callback([createCharacterRaw({ currentHP: 10 })]);
				return vi.fn();
			});

			render(CharacterPage);

			expect(await screen.findByTestId('character-health')).toHaveTextContent('10/11');
			const update = await findUpdateActorPayload(postMessageSpy);
			expect(update.hp?.value).toEqual(expect.any(Number));
			expect(update.hp?.max).toEqual(expect.any(Number));
			expect(Number.isFinite(update.hp?.value)).toBe(true);
			expect(Number.isFinite(update.hp?.max)).toBe(true);
			expect(update.hp?.max).toBeGreaterThan(0);
		},
	);

	it('FEAT foundry-health-precedence — Foundry-originated health does not echo stale HP and later user edits still sync', async () => {
		mockPageStore.set({
			params: { userId: 'user-1', characterId: 'char-1' },
			url: new URL(
				'http://localhost/embedded/characters/user-1/char-1?mode=foundry&uuid=Actor.123',
			),
		});
		firebaseMock.listenCharactersByIds.mockImplementation((_ids, callback) => {
			callback([createCharacterRaw({ currentHP: 10 })]);
			return vi.fn();
		});

		render(CharacterPage);
		expect(await screen.findByTestId('character-health')).toHaveTextContent('10/11');
		postMessageSpy.mockClear();

		window.dispatchEvent(
			new MessageEvent('message', {
				data: { type: 'FOUNDRY_HEALTH_UPDATE', payload: { hp: { value: 5, max: 12 } } },
			}),
		);

		expect(await screen.findByTestId('character-health')).toHaveTextContent('5/12');
		expect(postMessageSpy).not.toHaveBeenCalled();

		await fireEvent.click(screen.getByTestId('edit-current-hp'));

		await waitFor(() => expect(postMessageSpy).toHaveBeenCalledTimes(1));
		expect(postMessageSpy.mock.calls[0][0].payload.hp).toEqual({ value: 4, max: 12 });
	});
});

async function findUpdateActorPayload(postMessageSpy: ReturnType<typeof vi.fn>) {
	await waitFor(() => expect(postMessageSpy).toHaveBeenCalled());
	const call = postMessageSpy.mock.calls.find(([message]) => message?.type === 'UPDATE_ACTOR');
	expect(call).toBeDefined();
	return call?.[0].payload;
}

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

function createCharacterRaw({
	currentHP,
	body = 2,
	img = null,
	attackName = 'Old Strike',
}: {
	currentHP: number;
	body?: number;
	img?: string | null;
	attackName?: string;
}) {
	return {
		id: 'char-1',
		name: 'Test Character',
		attributes: { body, reflexes: 3, mind: 1, instinct: 2, presence: 1 },
		cards: [],
		ppHistory: [],
		goldHistory: [],
		equipment: [],
		modifiers: [],
		currentHP,
		tempHP: 0,
		currentLuck: 0,
		img,
		party: { partyId: null, ownerId: null },
		narrativeContext: { appearance: '', background: '', beliefs: '' },
		notes: [],
		languages: '',
		quickInfo: '',
		attacks: [{ id: 'attack-1', name: attackName }],
		maxActiveCards: 3,
		version: 1,
		skills: [],
		customCards: [],
	};
}
