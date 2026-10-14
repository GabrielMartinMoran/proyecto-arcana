import { fireEvent, render, screen } from '@testing-library/svelte';
import { writable } from 'svelte/store';
import { describe, expect, it, vi } from 'vitest';
import { Character } from '$lib/types/character';

vi.mock('$app/navigation', () => ({
	goto: vi.fn(),
}));

vi.mock('$app/paths', () => ({
	resolve: (p: string) => p,
	asset: (p: string) => p,
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

import SettingsTab from './SettingsTab.svelte';

function buildCharacter(hasInitiativeAdvantage = false): Character {
	return new Character({
		id: 'char-1',
		name: 'Ayla',
		attributes: { body: 1, reflexes: 3, mind: 1, instinct: 2, presence: 1 },
		cards: [],
		ppHistory: [],
		goldHistory: [],
		equipment: [],
		modifiers: [],
		currentHP: 10,
		tempHP: 0,
		currentLuck: 2,
		img: null,
		// No party: the tab's $effect exits early instead of calling firebase.
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
		hasInitiativeAdvantage,
	});
}

const getInitiativeCheckbox = () =>
	screen.getByRole('checkbox', { name: /ventaja en iniciativa/i });

describe('SettingsTab initiative advantage', () => {
	it('FEAT-initiative-roll-advantage @settings @a11y — renders the checkbox unchecked when the flag is disabled', () => {
		render(SettingsTab, {
			props: { character: buildCharacter(false), onChange: vi.fn(), allowPartyChange: false },
		});

		expect(getInitiativeCheckbox()).not.toBeChecked();
	});

	it('FEAT-initiative-roll-advantage @settings — enabling the checkbox sets the flag and propagates the character change', async () => {
		const character = buildCharacter(false);
		const onChange = vi.fn();
		render(SettingsTab, { props: { character, onChange, allowPartyChange: false } });

		await fireEvent.click(getInitiativeCheckbox());

		expect(character.hasInitiativeAdvantage).toBe(true);
		expect(onChange).toHaveBeenCalledWith(character);
	});

	it('FEAT-initiative-roll-advantage @settings @a11y — renders the checkbox checked when the flag is enabled', () => {
		render(SettingsTab, {
			props: { character: buildCharacter(true), onChange: vi.fn(), allowPartyChange: false },
		});

		expect(getInitiativeCheckbox()).toBeChecked();
	});
});
