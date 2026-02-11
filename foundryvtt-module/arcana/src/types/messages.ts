/**
 * Message Payload Types
 */

export const MESSAGE_TYPES = {
	PRECALCULATED_ROLL: 'PRECALCULATED_ROLL',
	UPDATE_ACTOR: 'UPDATE_ACTOR',
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
		hp?: {
			value: number;
			max: number;
		};
		initiative?: number;
	};
}

export type MessageData = PrecalculatedRollData | UpdateActorData;
