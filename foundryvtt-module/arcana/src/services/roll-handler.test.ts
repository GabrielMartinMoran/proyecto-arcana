/**
 * Unit tests for RollHandler service
 * Tests precalculated roll handling scenarios from Gherkin specs
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RollHandler } from './roll-handler';
import { MESSAGE_TYPES } from '../types/messages';

describe('RollHandler', () => {
	let rollHandler: RollHandler;

	beforeEach(() => {
		rollHandler = new RollHandler();
		vi.clearAllMocks();
	});

	describe('handlePrecalculatedRoll', () => {
		it('should process dice terms without throwing "Die is not defined" error', async () => {
			// GIVEN a PrecalculatedRollData with formula "2d6" and results [4, 2]
			const rollData = {
				type: MESSAGE_TYPES.PRECALCULATED_ROLL,
				formula: '2d6',
				results: [4, 2],
			};

			// Mock Roll class
			const mockEvaluate = vi.fn().mockResolvedValue(undefined);
			const mockToMessage = vi.fn().mockResolvedValue(undefined);
			const mockTerms: any[] = [];

			const rollInstance = {
				terms: mockTerms,
				total: 6,
				evaluate: mockEvaluate,
				toMessage: mockToMessage,
			};

			vi.stubGlobal('Roll', vi.fn().mockImplementation(() => rollInstance));
			vi.stubGlobal('ChatMessage', {
				getSpeaker: vi.fn().mockReturnValue({ token: 'test-token' }),
				create: vi.fn().mockResolvedValue(undefined),
			});
			vi.stubGlobal('game', { combat: null });

			// WHEN handlePrecalculatedRoll is called with the roll data
			// THEN no "Die is not defined" error is thrown
			await expect(rollHandler.handlePrecalculatedRoll(rollData)).resolves.not.toThrow();
		});

		it('should patch die results correctly for multiple dice', async () => {
			// GIVEN a PrecalculatedRollData with formula "3d8+4" and results [3, 7, 5]
			const rollData = {
				type: MESSAGE_TYPES.PRECALCULATED_ROLL,
				formula: '3d8+4',
				results: [3, 7, 5],
			};

			let patchedTerms: any[] = [];
			const mockDieTerm = {
				constructor: { name: 'Die' },
				number: 3,
				faces: 8,
				results: [],
				_evaluated: false,
			};

			const mockEvaluate = vi.fn().mockImplementation(function (this: any) {
				patchedTerms = this.terms;
			});
			const mockToMessage = vi.fn().mockResolvedValue(undefined);

			const rollInstance = {
				terms: [mockDieTerm],
				total: 19,
				evaluate: mockEvaluate,
				toMessage: mockToMessage,
			};

			vi.stubGlobal('Roll', vi.fn().mockImplementation(() => rollInstance));
			vi.stubGlobal('ChatMessage', {
				getSpeaker: vi.fn().mockReturnValue({ token: 'test-token' }),
				create: vi.fn().mockResolvedValue(undefined),
			});
			vi.stubGlobal('game', { combat: null });

			// WHEN handlePrecalculatedRoll is called with the roll data
			await rollHandler.handlePrecalculatedRoll(rollData);

			// THEN the first die term results are patched with 3
			// AND the second die term results are patched with 7
			// AND the third die term results are patched with 5
			expect(patchedTerms[0].results).toContainEqual(expect.objectContaining({ result: 3, active: true }));
			expect(patchedTerms[0].results).toContainEqual(expect.objectContaining({ result: 7, active: true }));
			expect(patchedTerms[0].results).toContainEqual(expect.objectContaining({ result: 5, active: true }));
		});

		it('should handle missing results by generating random fallback values', async () => {
			// GIVEN a PrecalculatedRollData with formula "2d6" and fewer results than dice count
			const rollData = {
				type: MESSAGE_TYPES.PRECALCULATED_ROLL,
				formula: '2d6',
				results: [4], // only 1 result for 2 dice
			};

			let patchedTerms: any[] = [];
			const mockDieTerm = {
				constructor: { name: 'Die' },
				number: 2,
				faces: 6,
				results: [],
				_evaluated: false,
			};

			const mockEvaluate = vi.fn().mockImplementation(function (this: any) {
				patchedTerms = this.terms;
			});
			const mockToMessage = vi.fn().mockResolvedValue(undefined);

			const rollInstance = {
				terms: [mockDieTerm],
				total: 10,
				evaluate: mockEvaluate,
				toMessage: mockToMessage,
			};

			vi.stubGlobal('Roll', vi.fn().mockImplementation(() => rollInstance));
			vi.stubGlobal('ChatMessage', {
				getSpeaker: vi.fn().mockReturnValue({ token: 'test-token' }),
				create: vi.fn().mockResolvedValue(undefined),
			});
			vi.stubGlobal('game', { combat: null });

			// WHEN handlePrecalculatedRoll is called with the roll data
			await rollHandler.handlePrecalculatedRoll(rollData);

			// THEN missing results are generated randomly for die faces
			// AND no error is thrown due to undefined results
			expect(patchedTerms[0].results).toHaveLength(2);
			expect(patchedTerms[0].results[0]).toEqual(expect.objectContaining({ result: 4, active: true }));
			// Second result should be a random number between 1 and 6
			expect(patchedTerms[0].results[1]).toEqual(
				expect.objectContaining({
					result: expect.any(Number),
					active: true,
				})
			);
			expect(patchedTerms[0].results[1].result).toBeGreaterThanOrEqual(1);
			expect(patchedTerms[0].results[1].result).toBeLessThanOrEqual(6);
		});

		it('should update combat tracker for initiative rolls', async () => {
			// GIVEN a PrecalculatedRollData with type 'INITIATIVE'
			const rollData = {
				type: MESSAGE_TYPES.PRECALCULATED_ROLL,
				formula: '1d20+5',
				results: [15],
				flavor: 'Test Actor: Iniciativa',
			};

			const mockCombatant = {
				id: 'combatant-1',
				tokenId: 'test-token',
				actorId: 'actor-1',
			};

			const mockSetInitiative = vi.fn().mockResolvedValue(undefined);
			const mockCombat = {
				combatants: [mockCombatant],
				setInitiative: mockSetInitiative,
			};

			const mockDieTerm = {
				constructor: { name: 'Die' },
				number: 1,
				faces: 20,
				results: [],
				_evaluated: false,
			};

			const mockEvaluate = vi.fn().mockResolvedValue(undefined);
			const mockToMessage = vi.fn().mockResolvedValue(undefined);

			const rollInstance = {
				terms: [mockDieTerm],
				total: 20,
				evaluate: mockEvaluate,
				toMessage: mockToMessage,
			};

			vi.stubGlobal('Roll', vi.fn().mockImplementation(() => rollInstance));
			vi.stubGlobal('ChatMessage', {
				getSpeaker: vi.fn().mockReturnValue({ token: 'test-token' }),
				create: vi.fn().mockResolvedValue(undefined),
			});
			vi.stubGlobal('game', { combat: mockCombat });

			// WHEN handlePrecalculatedRoll is called with the roll data
			await rollHandler.handlePrecalculatedRoll(rollData);

			// THEN the combatant initiative is updated to the roll total
			expect(mockSetInitiative).toHaveBeenCalledWith('combatant-1', 20);
		});

		it('should not throw "Die is not defined" error (regression test for Phase 1)', async () => {
			// This test verifies the fix for "Die is not defined" bug
			const rollData = {
				type: MESSAGE_TYPES.PRECALCULATED_ROLL,
				formula: '2d6',
				results: [3, 5],
			};

			// Mock a Roll that simulates the Die class check using constructor.name
			const mockDieTerm = {
				constructor: { name: 'Die' },
				number: 2,
				faces: 6,
				results: [],
				_evaluated: false,
			};

			const mockEvaluate = vi.fn().mockResolvedValue(undefined);
			const mockToMessage = vi.fn().mockResolvedValue(undefined);

			const rollInstance = {
				terms: [mockDieTerm],
				total: 8,
				evaluate: mockEvaluate,
				toMessage: mockToMessage,
			};

			vi.stubGlobal('Roll', vi.fn().mockImplementation(() => rollInstance));
			vi.stubGlobal('ChatMessage', {
				getSpeaker: vi.fn().mockReturnValue({ token: 'test-token' }),
				create: vi.fn().mockResolvedValue(undefined),
			});
			vi.stubGlobal('game', { combat: null });

			// The fix uses term.constructor.name === 'Die' instead of global Die class check
			await expect(rollHandler.handlePrecalculatedRoll(rollData)).resolves.not.toThrow();
		});
	});
});
