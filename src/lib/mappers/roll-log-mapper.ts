import type { RollLog } from '$lib/types/roll-log';

export const mapRollLog = (data: any): RollLog => {
	return {
		...data,
		timestamp: new Date(data.timestamp),
	};
};
