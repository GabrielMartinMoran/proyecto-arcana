import { describe, expect, it } from 'vitest';
import { movementBandForDistance, movementBandsForWaypoints } from './movement-bands';

describe('FEAT foundry-token-movement-ruler-speed-colors — movement bands', () => {
	it('movement up to actor speed is green', () => {
		expect(movementBandForDistance({ speed: 7, effectiveDistance: 7 })).toBe('green');
	});

	it('movement from actor speed to double speed is yellow', () => {
		expect(
			movementBandsForWaypoints({ speed: 7, alreadyMoved: 0, waypointDistances: [7, 10] }),
		).toEqual(['green', 'yellow']);
	});

	it('movement beyond double speed is red', () => {
		expect(
			movementBandsForWaypoints({ speed: 7, alreadyMoved: 0, waypointDistances: [7, 14, 17] }),
		).toEqual(['green', 'yellow', 'red']);
	});
});

describe('FEAT foundry-token-movement-ruler-accounts-for-turn-movement-already-spent — movement bands', () => {
	it('already moved distance reduces remaining green movement', () => {
		expect(
			movementBandsForWaypoints({ speed: 7, alreadyMoved: 4, waypointDistances: [3, 4] }),
		).toEqual(['green', 'yellow']);
	});

	it('already moved distance can push a new path into red movement', () => {
		expect(
			movementBandsForWaypoints({ speed: 7, alreadyMoved: 12, waypointDistances: [2, 4] }),
		).toEqual(['yellow', 'red']);
	});
});

describe('FEAT foundry-token-movement-ruler-fallback-styling — movement bands', () => {
	it.each([0, -1, undefined, Number.NaN, Number.POSITIVE_INFINITY])(
		'invalid speed %s uses default ruler styling',
		(speed) => {
			expect(movementBandForDistance({ speed, effectiveDistance: 10 })).toBe('default');
		},
	);

	it('terrain cost does not alter Arcana color bands', () => {
		expect(
			movementBandsForWaypoints({
				speed: 7,
				alreadyMoved: 0,
				waypointDistances: [7, 8],
				waypointCosts: [7, 16],
			}),
		).toEqual(['green', 'yellow']);
	});
});
