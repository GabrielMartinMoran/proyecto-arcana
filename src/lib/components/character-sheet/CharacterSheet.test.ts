import { describe, expect, it, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/svelte';
import { writable } from 'svelte/store';
import type { Character } from '$lib/types/character';
import CharacterSheet from './CharacterSheet.svelte';

vi.mock('$app/paths', () => ({
	resolve: (p: string) => p,
}));

vi.mock('$lib/services/firebase-service', () => ({
	useFirebaseService: () => ({
		user: writable({ uid: 'test-user' }),
	}),
}));

vi.mock('$lib/services/dialog-service.svelte', () => ({
	dialogService: {
		alert: vi.fn(async () => {}),
		confirm: vi.fn(async () => true),
		prompt: vi.fn(async () => ''),
	},
}));

function createMockComponent() {
	return function MockComponent(_options: any) {
		return {
			$set: () => {},
			$destroy: () => {},
			$on: () => () => {},
		};
	};
}

vi.mock('./tabs/GeneralTab.svelte', () => ({
	default: createMockComponent(),
}));
vi.mock('./tabs/BioTab.svelte', () => ({
	default: createMockComponent(),
}));
vi.mock('./tabs/CardsTab.svelte', () => ({
	default: createMockComponent(),
}));
vi.mock('./tabs/EconomyTab.svelte', () => ({
	default: createMockComponent(),
}));
vi.mock('./tabs/NotesTab.svelte', () => ({
	default: createMockComponent(),
}));
vi.mock('./tabs/ProgressTab.svelte', () => ({
	default: createMockComponent(),
}));
vi.mock('./tabs/SeeAsMDTab.svelte', () => ({
	default: createMockComponent(),
}));
vi.mock('./tabs/SettingsTab.svelte', () => ({
	default: createMockComponent(),
}));

const buildCharacter = (): Character => {
	const char: any = {
		id: 'char-1',
		name: 'Test Character',
		attributes: { body: 1, reflexes: 1, mind: 1, instinct: 1, presence: 1 },
		cards: [],
		ppHistory: [],
		goldHistory: [],
		equipment: [],
		modifiers: [],
		currentHP: 10,
		tempHP: 0,
		currentLuck: 3,
		img: null,
		narrativeContext: { appearance: '', background: '', beliefs: '' },
		notes: [],
		languages: '',
		quickInfo: '',
		attacks: [],
		maxActiveCards: 3,
		version: 1,
		skills: [],
		customCards: [],
		party: { partyId: null, ownerId: null },
		copy() {
			return { ...this, copy: this.copy };
		},
	};
	return char as Character;
};

describe('CharacterSheet embedded mode', () => {
	const onChange = vi.fn();
	const onTabChange = vi.fn();

	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('shows "Ver como MD" tab and "Compartir" button by default', () => {
		render(CharacterSheet, {
			props: {
				character: buildCharacter(),
				readonly: false,
				onChange,
				currentTab: 'general',
				onTabChange,
			},
		});

		expect(screen.getByRole('button', { name: '🤖 Ver como MD' })).toBeInTheDocument();
		expect(screen.getByRole('button', { name: '🔗 Compartir' })).toBeInTheDocument();
	});

	it('hides "Ver como MD" tab when isEmbedded is true', () => {
		render(CharacterSheet, {
			props: {
				character: buildCharacter(),
				readonly: true,
				onChange,
				currentTab: 'general',
				onTabChange,
				isEmbedded: true,
			} as any,
		});

		expect(screen.queryByRole('button', { name: '🤖 Ver como MD' })).not.toBeInTheDocument();
	});

	it('hides "Compartir" button when isEmbedded is true', () => {
		render(CharacterSheet, {
			props: {
				character: buildCharacter(),
				readonly: false,
				onChange,
				currentTab: 'general',
				onTabChange,
				isEmbedded: true,
			} as any,
		});

		expect(screen.queryByRole('button', { name: '🔗 Compartir' })).not.toBeInTheDocument();
	});
});

describe('CharacterSheet public share URL', () => {
	const onChange = vi.fn();
	const onTabChange = vi.fn();

	const renderSheet = (extraProps: Record<string, unknown> = {}) =>
		render(CharacterSheet, {
			props: {
				character: buildCharacter(),
				readonly: false,
				onChange,
				currentTab: 'general',
				onTabChange,
				...extraProps,
			} as any,
		});

	const clickShare = async () => {
		await fireEvent.click(screen.getByRole('button', { name: '🔗 Compartir' }));
	};

	beforeEach(() => {
		vi.clearAllMocks();
		Object.defineProperty(navigator, 'clipboard', {
			value: { writeText: vi.fn(async () => {}) },
			configurable: true,
		});
	});

	it('FEAT-shared-character @share @group-view @character-owner-url — copies a URL owned by the character owner when provided', async () => {
		renderSheet({ characterOwnerId: 'character-owner' });

		await clickShare();

		await waitFor(() =>
			expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
				`${window.location.origin}/characters/shared/character-owner/char-1`,
			),
		);
	});

	it('FEAT-shared-character @share — falls back to the signed-in user when no character owner is provided', async () => {
		renderSheet();

		await clickShare();

		await waitFor(() =>
			expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
				`${window.location.origin}/characters/shared/test-user/char-1`,
			),
		);
	});
});
