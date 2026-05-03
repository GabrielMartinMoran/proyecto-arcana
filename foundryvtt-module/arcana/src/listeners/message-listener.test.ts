/**
 * Unit tests for message-listener routing logic
 * Tests that messages are correctly routed to appropriate handlers
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ActorUpdater } from '../services/actor-updater';
import type { RollHandler } from '../services/roll-handler';
import type { MessageData, PrecalculatedRollData, UpdateActorData } from '../types/messages';
import { MESSAGE_TYPES } from '../types/messages';
import { routeMessage } from './message-listener';

describe('routeMessage', () => {
	let mockRollHandler: RollHandler;
	let mockActorUpdater: ActorUpdater;

	beforeEach(() => {
		mockRollHandler = {
			handlePrecalculatedRoll: vi.fn().mockResolvedValue(undefined),
		} as unknown as RollHandler;

		mockActorUpdater = {
			handleUpdateActor: vi.fn().mockResolvedValue(undefined),
		} as unknown as ActorUpdater;
	});

	describe('message routing', () => {
		it('should call RollHandler.handlePrecalculatedRoll for PRECALCULATED_ROLL message type', async () => {
			// GIVEN a PRECALCULATED_ROLL message
			const data: PrecalculatedRollData = {
				type: MESSAGE_TYPES.PRECALCULATED_ROLL,
				formula: '2d6',
				results: [4, 2],
			};

			// WHEN routeMessage is called with the data and handlers
			await routeMessage(data, mockRollHandler, mockActorUpdater);

			// THEN RollHandler.handlePrecalculatedRoll is called with the data
			expect(mockRollHandler.handlePrecalculatedRoll).toHaveBeenCalledWith(data);
			// AND ActorUpdater.handleUpdateActor is NOT called
			expect(mockActorUpdater.handleUpdateActor).not.toHaveBeenCalled();
		});

		it('should call ActorUpdater.handleUpdateActor for UPDATE_ACTOR message type', async () => {
			// GIVEN an UPDATE_ACTOR message
			const data: UpdateActorData = {
				type: MESSAGE_TYPES.UPDATE_ACTOR,
				actorId: 'actor-123',
				payload: { name: 'Updated Name' },
			};

			// WHEN routeMessage is called with the data and handlers
			await routeMessage(data, mockRollHandler, mockActorUpdater);

			// THEN ActorUpdater.handleUpdateActor is called with the data
			expect(mockActorUpdater.handleUpdateActor).toHaveBeenCalledWith(data);
			// AND RollHandler.handlePrecalculatedRoll is NOT called
			expect(mockRollHandler.handlePrecalculatedRoll).not.toHaveBeenCalled();
		});

		it('should return without error for unknown message types', async () => {
			// GIVEN an unknown message type
			const data = {
				type: 'UNKNOWN_TYPE',
				someData: 'test',
			} as unknown as MessageData;

			// WHEN routeMessage is called with the unknown message
			// THEN it should not throw
			await expect(routeMessage(data, mockRollHandler, mockActorUpdater)).resolves.not.toThrow();

			// AND neither handler should be called
			expect(mockRollHandler.handlePrecalculatedRoll).not.toHaveBeenCalled();
			expect(mockActorUpdater.handleUpdateActor).not.toHaveBeenCalled();
		});
	});
});
