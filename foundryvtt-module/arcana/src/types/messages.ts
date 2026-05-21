/**
 * Message Payload Types
 */

export const MESSAGE_TYPES = {
	PRECALCULATED_ROLL: 'PRECALCULATED_ROLL',
	UPDATE_ACTOR: 'UPDATE_ACTOR',
	FOUNDRY_HEALTH_UPDATE: 'FOUNDRY_HEALTH_UPDATE',
} as const;

export type MessageType = (typeof MESSAGE_TYPES)[keyof typeof MESSAGE_TYPES];

export interface SpeakerData {
	token?: string;
	actor?: string;
}

export interface PrecalculatedRollData {
	type: typeof MESSAGE_TYPES.PRECALCULATED_ROLL;
	formula: string;
	results: number[];
	flavor?: string;
}

export interface UpdateActorData {
	type: typeof MESSAGE_TYPES.UPDATE_ACTOR;
	uuid?: string;
	actorId?: string;
	payload: {
		name?: string;
		imageUrl?: string;
		imageSource?: string;
		speed?: number;
		hp?: {
			value: number;
			max: number;
		};
		initiative?: number;
	};
}

export interface FoundryHealthUpdateData {
	type: typeof MESSAGE_TYPES.FOUNDRY_HEALTH_UPDATE;
	payload: {
		hp: {
			value: number;
			max: number;
		};
	};
}

export type MessageData = PrecalculatedRollData | UpdateActorData | FoundryHealthUpdateData;
