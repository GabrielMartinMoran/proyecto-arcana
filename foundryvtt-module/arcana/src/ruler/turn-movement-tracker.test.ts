import { beforeEach, describe, expect, it } from 'vitest';
import { TurnMovementTracker } from './turn-movement-tracker';

describe('FEAT foundry-token-movement-ruler-accounts-for-turn-movement-already-spent — turn movement tracker', () => {
	let tracker: TurnMovementTracker;

	beforeEach(() => {
		tracker = new TurnMovementTracker();
	});

	it('returns movement already recorded for the same token and turn', () => {
		tracker.recordMovement({
			combatId: 'combat-1',
			turnKey: 'round-1-turn-1',
			tokenId: 'token-1',
			meters: 4,
		});

		expect(
			tracker.getAlreadyMoved({
				combatId: 'combat-1',
				turnKey: 'round-1-turn-1',
				tokenId: 'token-1',
			}),
		).toBe(4);
	});

	it('movement history resets for a new combat turn', () => {
		tracker.recordMovement({
			combatId: 'combat-1',
			turnKey: 'round-1-turn-1',
			tokenId: 'token-1',
			meters: 9,
		});

		expect(
			tracker.getAlreadyMoved({
				combatId: 'combat-1',
				turnKey: 'round-1-turn-2',
				tokenId: 'token-1',
			}),
		).toBe(0);
	});
});
