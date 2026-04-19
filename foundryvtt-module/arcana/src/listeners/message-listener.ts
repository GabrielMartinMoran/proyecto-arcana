import { ActorUpdater } from '../services/actor-updater';
import { RollHandler } from '../services/roll-handler';
import type { MessageData, PrecalculatedRollData, UpdateActorData } from '../types/messages';
import { MESSAGE_TYPES } from '../types/messages';

/**
 * Routes incoming messages to appropriate handlers based on message type.
 * Pure function for testability - does not depend on window or Foundry globals.
 *
 * @param data - The message payload
 * @param rollHandler - Handler for precalculated roll messages
 * @param actorUpdater - Handler for actor update messages
 */
export async function routeMessage(
	data: MessageData,
	rollHandler: RollHandler,
	actorUpdater: ActorUpdater,
): Promise<void> {
	if (!data) return;

	if (data.type === MESSAGE_TYPES.PRECALCULATED_ROLL) {
		await rollHandler.handlePrecalculatedRoll(data as PrecalculatedRollData);
		return;
	}

	if (data.type === MESSAGE_TYPES.UPDATE_ACTOR) {
		await actorUpdater.handleUpdateActor(data as UpdateActorData);
		return;
	}
}

/**
 * Message listener setup following Dependency Injection and Single Responsibility
 */
export function setupMessageListener(): void {
	const rollHandler = new RollHandler();
	const actorUpdater = new ActorUpdater();

	window.addEventListener('message', async (event: MessageEvent<MessageData>) => {
		const data = event.data;
		if (!data) return;

		console.log('[Arcana] Received message:', data.type, 'from', event.origin);

		await routeMessage(data, rollHandler, actorUpdater);
	});
}
