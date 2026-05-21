export type MovementBand = 'green' | 'yellow' | 'red' | 'default';

interface MovementBandInput {
	speed: number | undefined;
	effectiveDistance: number;
}

interface MovementBandsInput {
	speed: number | undefined;
	alreadyMoved: number;
	waypointDistances: number[];
	waypointCosts?: number[];
}

export function movementBandForDistance({
	speed,
	effectiveDistance,
}: MovementBandInput): MovementBand {
	if (!isValidSpeed(speed)) return 'default';
	if (effectiveDistance <= speed) return 'green';
	if (effectiveDistance <= speed * 2) return 'yellow';
	return 'red';
}

export function movementBandsForWaypoints({
	speed,
	alreadyMoved,
	waypointDistances,
}: MovementBandsInput): MovementBand[] {
	return waypointDistances.map((distance) =>
		movementBandForDistance({
			speed,
			effectiveDistance: alreadyMoved + distance,
		}),
	);
}

function isValidSpeed(speed: number | undefined): speed is number {
	return typeof speed === 'number' && Number.isFinite(speed) && speed > 0;
}
