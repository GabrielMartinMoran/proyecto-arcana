import type { RollLog } from '$lib/types/roll-log';

const parseTimestamp = (ts: any): Date => {
	// Firestore Timestamp (has toDate)
	if (ts && typeof ts.toDate === 'function') {
		try {
			return ts.toDate();
		} catch {
			/* fallthrough */
		}
	}

	// Plain Date instance
	if (ts instanceof Date) return ts;

	// ISO string or number (milliseconds)
	if (typeof ts === 'string' || typeof ts === 'number') {
		const d = new Date(ts);
		if (!isNaN(d.getTime())) return d;
	}

	// Firestore-like plain object { seconds, nanoseconds } or { _seconds, _nanoseconds }
	if (ts && typeof ts === 'object') {
		const seconds =
			typeof ts.seconds === 'number'
				? ts.seconds
				: typeof ts._seconds === 'number'
					? ts._seconds
					: null;
		if (typeof seconds === 'number') {
			return new Date(seconds * 1000);
		}
	}

	// Fallback to current time to avoid invalid Date elsewhere
	return new Date();
};

export const mapRollLog = (data: any): RollLog => {
	return {
		...data,
		timestamp: parseTimestamp(data.timestamp),
	};
};
