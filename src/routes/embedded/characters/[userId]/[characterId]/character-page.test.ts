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
		vi.clearAllMocks();
		vi.unstubAllGlobals();
	});

	it('FEAT foundry-health-precedence — closed-sheet startup hydration shows Foundry HP and does not echo stale web HP', async () => {
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
		expect(postMessageSpy).not.toHaveBeenCalled();
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
		expect(postMessageSpy).not.toHaveBeenCalled();
	});

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

function createCharacterRaw({ currentHP, body = 2 }: { currentHP: number; body?: number }) {
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
		img: null,
		party: { partyId: null, ownerId: null },
		narrativeContext: { appearance: '', background: '', beliefs: '' },
		notes: [],
		languages: '',
		quickInfo: '',
		attacks: [],
		maxActiveCards: 3,
		version: 1,
		skills: [],
		customCards: [],
	};
}
