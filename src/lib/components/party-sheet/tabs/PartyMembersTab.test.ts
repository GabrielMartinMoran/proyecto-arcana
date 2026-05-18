import { render } from '@testing-library/svelte';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Character } from '$lib/types/character';
import { Party } from '$lib/types/party';

const mocks = vi.hoisted(() => {
	let userValue: { uid: string; displayName?: string } | null = null;
	const subscribers = new Set<(value: typeof userValue) => void>();
	const user = {
		subscribe: (subscriber: (value: typeof userValue) => void) => {
			subscriber(userValue);
			subscribers.add(subscriber);
			return () => subscribers.delete(subscriber);
		},
		set: (nextValue: typeof userValue) => {
			userValue = nextValue;
			for (const subscriber of subscribers) subscriber(userValue);
		},
	};
	return {
		page: { url: new URL('http://localhost/?characterId=char-1&sheetTab=general') },
		goto: vi.fn(),
		user,
		savePartyMemberCharacter: vi.fn(),
		saveCharactersForUser: vi.fn(),
		characterSheetProps: [] as any[],
	};
});

vi.mock('$app/state', () => ({
	page: mocks.page,
}));

vi.mock('$app/navigation', () => ({
	goto: mocks.goto,
}));

vi.mock('$lib/services/firebase-service', () => ({
	useFirebaseService: () => ({
		user: mocks.user,
		saveCharactersForUser: mocks.saveCharactersForUser,
	}),
}));

vi.mock('$lib/services/parties-service', () => ({
	usePartiesService: () => ({
		savePartyMemberCharacter: mocks.savePartyMemberCharacter,
	}),
}));

vi.mock('$lib/components/character-sheet/CharacterSheet.svelte', () => ({
	default: function MockCharacterSheet(...args: unknown[]) {
		const props =
			(args[1] as Record<string, unknown> | undefined) ??
			(args[0] as { props?: Record<string, unknown> } | undefined)?.props ??
			{};
		mocks.characterSheetProps.push(props);
		return {
			$set: (nextProps: Record<string, unknown>) => {
				Object.assign(mocks.characterSheetProps[mocks.characterSheetProps.length - 1], nextProps);
			},
			$destroy: () => {},
			$on: () => () => {},
		};
	},
}));

import PartyMembersTab from './PartyMembersTab.svelte';

const buildCharacter = (overrides: Partial<Character> = {}) =>
	new Character({
		id: 'char-1',
		name: 'Previous Value',
		attributes: {},
		cards: [],
		ppHistory: [],
		goldHistory: [],
		equipment: [],
		modifiers: [],
		currentHP: 0,
		tempHP: 0,
		currentLuck: 0,
		img: null,
		notes: [],
		languages: '',
		quickInfo: '',
		attacks: [],
		maxActiveCards: 0,
		version: 1,
		party: { partyId: 'party-1', ownerId: 'party-owner' },
		...overrides,
	});

const buildParty = (character = buildCharacter()) =>
	new Party({
		id: 'party-1',
		name: 'Party One',
		ownerId: 'party-owner',
		members: { 'character-owner': [character.id] },
		notes: [],
		characters: [character],
	});

const renderMembersTabForUser = (uid: string) => {
	mocks.user.set({ uid });
	mocks.page.url = new URL('http://localhost/?characterId=char-1&sheetTab=general');
	render(PartyMembersTab, {
		props: {
			party: buildParty(),
			readonly: false,
			onChange: vi.fn(),
		},
	});
	return mocks.characterSheetProps.at(-1);
};

describe('PartyMembersTab group character editing permissions', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mocks.characterSheetProps.length = 0;
		mocks.user.set(null);
	});

	it('FEAT-group-character-editing-sync @permissions @owner-edits-member — party owner editing another member is allowed and delegates the edited value', async () => {
		const characterSheet = renderMembersTabForUser('party-owner');

		expect(characterSheet.readonly).toBe(false);
		await characterSheet.onChange(buildCharacter({ name: 'the edited value' }));

		expect(mocks.savePartyMemberCharacter).toHaveBeenCalledWith(
			'party-1',
			'character-owner',
			expect.objectContaining({ id: 'char-1', name: 'the edited value' }),
		);
	});

	it('FEAT-group-character-editing-sync @permissions @member-edits-own — character owner editing their own character is allowed and delegates the edited value', async () => {
		const characterSheet = renderMembersTabForUser('character-owner');

		expect(characterSheet.readonly).toBe(false);
		await characterSheet.onChange(buildCharacter({ name: 'the edited value' }));

		expect(mocks.savePartyMemberCharacter).toHaveBeenCalledWith(
			'party-1',
			'character-owner',
			expect.objectContaining({ id: 'char-1', name: 'the edited value' }),
		);
	});

	it('FEAT-group-character-editing-sync @permissions — unrelated party member editing another member is blocked and keeps the previous value', async () => {
		const characterSheet = renderMembersTabForUser('unrelated-member');

		expect(characterSheet.readonly).toBe(true);
		await characterSheet.onChange(buildCharacter({ name: 'the edited value' }));

		expect(mocks.savePartyMemberCharacter).not.toHaveBeenCalled();
		expect(mocks.saveCharactersForUser).not.toHaveBeenCalled();
		expect(characterSheet.character.name).toBe('Previous Value');
	});
});
