import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/svelte';
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
