import { fireEvent, render, screen } from '@testing-library/svelte';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Character } from '$lib/types/character';

const mocks = vi.hoisted(() => ({
	rollExpression: vi.fn(),
	openRollModal: vi.fn(),
}));

vi.mock('$app/paths', () => ({
	resolve: (p: string) => p,
	asset: (p: string) => p,
}));

vi.mock('$lib/services/dice-roller-service', () => ({
	useDiceRollerService: () => ({
		rollExpression: mocks.rollExpression,
		rollModal: {
			openRollModal: mocks.openRollModal,
		},
	}),
}));

vi.mock('$lib/services/dialog-service.svelte', () => ({
	dialogService: {
		alert: vi.fn(async () => {}),
		confirm: vi.fn(async () => true),
		prompt: vi.fn(async () => ''),
	},
}));

import GeneralTab from './GeneralTab.svelte';

function buildCharacter(hasInitiativeAdvantage: boolean): Character {
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

const renderTab = (character: Character) =>
	render(GeneralTab, { props: { character, readonly: false, onChange: vi.fn() } });

// The dice buttons expose their emoji as accessible name; `title` is the stable locator.
const getInitiativeRollButton = () => screen.getByTitle('Tirar iniciativa');

describe('GeneralTab initiative roll', () => {
	beforeEach(() => {
		mocks.rollExpression.mockClear();
		mocks.openRollModal.mockClear();
	});

	it('FEAT-initiative-roll-advantage @initiative — opens the roll modal with advantage when the flag is enabled', async () => {
		renderTab(buildCharacter(true));

		await fireEvent.click(getInitiativeRollButton());

		expect(mocks.openRollModal).toHaveBeenCalledWith(
			expect.objectContaining({
				expression: '1d8e+iniciativa',
				rollType: 'advantage',
			}),
		);
	});

	it('FEAT-initiative-roll-advantage @initiative — opens the roll modal as normal when the flag is disabled', async () => {
		renderTab(buildCharacter(false));

		await fireEvent.click(getInitiativeRollButton());

		expect(mocks.openRollModal).toHaveBeenCalledWith(
			expect.objectContaining({
				expression: '1d8e+iniciativa',
				rollType: 'normal',
			}),
		);
	});

	it('FEAT-initiative-roll-advantage @regression — the shared attribute handler stays normal when the flag is enabled', async () => {
		renderTab(buildCharacter(true));

		await fireEvent.click(screen.getAllByTitle('Tirar')[0]);

		expect(mocks.openRollModal).toHaveBeenCalledWith(
			expect.objectContaining({
				expression: '1d8e+cuerpo',
				rollType: 'normal',
			}),
		);
	});
});
