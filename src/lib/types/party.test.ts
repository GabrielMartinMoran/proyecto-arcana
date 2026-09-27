import { describe, expect, it } from 'vitest';
import { Party } from './party';

const buildParty = () =>
	new Party({
		id: 'party-1',
		name: 'Party One',
		ownerId: 'party-owner',
		members: {
			'user-1': ['char-1', 'char-2'],
			'user-2': ['char-3'],
		},
		notes: [],
	});

describe('Party.getCharacterOwnerId', () => {
	it('returns the member user id that owns the character', () => {
		const party = buildParty();

		expect(party.getCharacterOwnerId('char-3')).toBe('user-2');
	});

	it('returns null when no member owns the character', () => {
		const party = buildParty();

		expect(party.getCharacterOwnerId('char-unknown')).toBeNull();
	});
});
