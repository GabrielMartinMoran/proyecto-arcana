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

/** Handler signature for web-to-module messages. */
export type MessageHandler = (event: MessageEvent<MessageData>) => Promise<void>;

/**
 * Build a message handler with its own RollHandler/ActorUpdater instances.
 * Keeps the routing logic in one place for every registration target.
 */
function createMessageHandler(): MessageHandler {
	const rollHandler = new RollHandler();
	const actorUpdater = new ActorUpdater();

	return async (event) => {
		const data = event.data;
		if (!data) return;

		console.log('[Arcana] Received message:', data.type, 'from', event.origin);

		await routeMessage(data, rollHandler, actorUpdater);
	};
}

/**
 * Register the Arcana message handler on a target window and return a cleanup
 * function that removes exactly that listener. Detached windows are wired and
 * unwired through this API so a message is never processed twice.
 */
export function registerMessageListener(
	target: Window,
	handler: MessageHandler = createMessageHandler(),
): () => void {
	const listener = (event: Event): void => void handler(event as MessageEvent<MessageData>);

	target.addEventListener('message', listener);

	return () => target.removeEventListener('message', listener);
}

/**
 * Message listener setup following Dependency Injection and Single Responsibility.
 * Registers on the main workspace window; detached windows are handled by
 * setupDetachedWindow.
 */
export function setupMessageListener(): () => void {
	return registerMessageListener(window);
}
