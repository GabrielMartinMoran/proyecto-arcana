import { ActorUpdater } from '../services/actor-updater';
import { RollHandler } from '../services/roll-handler';
import type { MessageData, PrecalculatedRollData, UpdateActorData } from '../types/messages';
import { MESSAGE_TYPES } from '../types/messages';

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

		if (data.type === MESSAGE_TYPES.PRECALCULATED_ROLL) {
			await rollHandler.handlePrecalculatedRoll(data as PrecalculatedRollData);
		}

		if (data.type === MESSAGE_TYPES.UPDATE_ACTOR) {
			await actorUpdater.handleUpdateActor(data as UpdateActorData);
		}
	});
}
