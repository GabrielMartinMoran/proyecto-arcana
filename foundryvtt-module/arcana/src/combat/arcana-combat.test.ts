/**
 * Unit tests for arcana-combat.ts
 * Tests that initiative is read from actor system data
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as initiativeFormula from './initiative-formula';

// Mock Combat base class before importing ArcanaCombat
vi.stubGlobal(
	'Combat',
	class MockCombat {
		combatants = new Map();
		setInitiative = vi.fn().mockResolvedValue(undefined);
	},
);

const { ArcanaCombat } = await import('./arcana-combat');

describe('ArcanaCombat', () => {
	let combat: InstanceType<typeof ArcanaCombat>;

	beforeEach(() => {
		vi.clearAllMocks();
		vi.spyOn(initiativeFormula, 'buildInitiativeFormula').mockReturnValue('1d8x + 5');
		vi.spyOn(initiativeFormula, 'buildInitiativeFlavor').mockReturnValue(
			'Test tira Iniciativa (Normal)',
		);

		vi.stubGlobal(
			'Roll',
			vi.fn().mockImplementation(() => {
				const instance: { evaluate: any; toMessage: any; total: number } = {
					evaluate: vi.fn(),
					toMessage: vi.fn().mockResolvedValue(undefined),
					total: 15,
				};
				instance.evaluate = vi.fn().mockResolvedValue(instance);
				return instance;
			}),
		);
		vi.stubGlobal('ChatMessage', {
			getSpeaker: vi.fn().mockReturnValue({ actor: 'actor-1', token: 'token-1' }),
		});

		combat = new ArcanaCombat({} as any);
	});

	describe('_rollCombatantInitiative', () => {
		it('should read initiative from actor system data', async () => {
			// GIVEN a combatant with system initiative 5
			const mockActor = {
				system: { initiative: 5 },
				getRollData: vi.fn().mockReturnValue({}),
			};
			const mockCombatant = {
				id: 'combatant-1',
				name: 'Goblin',
				actor: mockActor,
				token: null,
			};

			combat.combatants = {
				get: vi.fn().mockReturnValue(mockCombatant),
			} as any;
			combat.setInitiative = vi.fn().mockResolvedValue(undefined);

			// WHEN rolling initiative for the combatant
			await combat._rollCombatantInitiative('combatant-1', 'normal');

			// THEN buildInitiativeFormula should receive the system initiative value
			expect(initiativeFormula.buildInitiativeFormula).toHaveBeenCalledWith(5, 'normal');
		});

		it('should default to 0 when actor system initiative is undefined', async () => {
			// GIVEN a combatant without system initiative
			const mockActor = {
				system: {},
				getRollData: vi.fn().mockReturnValue({}),
			};
			const mockCombatant = {
				id: 'combatant-2',
				name: 'Orc',
				actor: mockActor,
				token: null,
			};

			combat.combatants = {
				get: vi.fn().mockReturnValue(mockCombatant),
			} as any;
			combat.setInitiative = vi.fn().mockResolvedValue(undefined);

			// WHEN rolling initiative
			await combat._rollCombatantInitiative('combatant-2', 'normal');

			// THEN buildInitiativeFormula should receive 0
			expect(initiativeFormula.buildInitiativeFormula).toHaveBeenCalledWith(0, 'normal');
		});
	});
});
