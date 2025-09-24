import type { RollLog } from '$lib/types/roll-log';

export const serializeRollLog = (rollLog: RollLog): object => {
	return {
		...rollLog,
		timestamp: rollLog.timestamp.toISOString(),
	};
};
