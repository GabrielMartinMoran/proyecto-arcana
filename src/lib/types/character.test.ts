import { describe, expect, it } from 'vitest';
import { createCharacter } from '$lib/factories/character-factory';
import { Character } from './character';

function buildLegacyCharacterDocument(overrides: Record<string, unknown> = {}): Character {
	return new Character({
		id: 'char-1',
		name: 'Test Character',
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
		...overrides,
	});
}

describe('Character hasInitiativeAdvantage', () => {
	it('FEAT-initiative-roll-advantage @legacy — a stored document without the flag defaults to false', () => {
		expect(buildLegacyCharacterDocument().hasInitiativeAdvantage).toBe(false);
	});

	it('FEAT-initiative-roll-advantage @hydration — an explicit true flag is kept when the character is loaded', () => {
		expect(
			buildLegacyCharacterDocument({ hasInitiativeAdvantage: true }).hasInitiativeAdvantage,
		).toBe(true);
	});

	it('FEAT-initiative-roll-advantage @copy — copy() preserves the initiative advantage flag', () => {
		const character = buildLegacyCharacterDocument({ hasInitiativeAdvantage: true });

		expect(character.copy().hasInitiativeAdvantage).toBe(true);
	});

	it('FEAT-initiative-roll-advantage @factory — createCharacter defaults the flag to false', () => {
		expect(createCharacter().hasInitiativeAdvantage).toBe(false);
	});
});
