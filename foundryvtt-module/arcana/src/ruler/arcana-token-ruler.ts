import { movementBandForDistance, type MovementBand } from './movement-bands';
import { turnMovementTracker } from './turn-movement-tracker';

const BAND_COLORS: Record<Exclude<MovementBand, 'default'>, number> = {
	green: 0x00ff00,
	yellow: 0xffff00,
	red: 0xff0000,
};

const DefaultTokenRuler = getDefaultTokenRuler();

interface TokenRulerWaypointLike {
	measurement?: {
		distance?: number;
		cost?: number;
	};
	distance?: number;
}

export class ArcanaTokenRuler extends DefaultTokenRuler {
	private lastMeasuredDistance = 0;

	protected _getSegmentStyle(waypoint: TokenRulerWaypointLike): Record<string, any> {
		const defaultStyle = getDefaultSegmentStyle(this, waypoint);
		const speed = getActorSpeed(this);
		const plannedDistance = getWaypointDistance(waypoint);
		const band = movementBandForDistance({
			speed,
			effectiveDistance: getAlreadyMoved(this) + plannedDistance,
		});

		this.lastMeasuredDistance = Math.max(this.lastMeasuredDistance, plannedDistance);

		if (band === 'default') return defaultStyle;
		return { ...defaultStyle, color: BAND_COLORS[band] };
	}

	async _endMeasurement(...args: unknown[]): Promise<unknown> {
		const result = await callBaseMethod(this, '_endMeasurement', args);
		this.recordLastMovement();
		return result;
	}

	async moveToken(...args: unknown[]): Promise<unknown> {
		const result = await callBaseMethod(this, 'moveToken', args);
		this.recordLastMovement();
		return result;
	}

	private recordLastMovement(): void {
		const turnKey = getTurnKey();
		const tokenId = getTokenId(this);
		const combatId = getCombatId();

		if (!turnKey || !tokenId || !combatId) return;

		turnMovementTracker.recordMovement({
			combatId,
			turnKey,
			tokenId,
			meters: this.lastMeasuredDistance,
		});
		this.lastMeasuredDistance = 0;
	}
}

function getDefaultTokenRuler(): any {
	return CONFIG?.Token?.rulerClass ?? class {};
}

function getDefaultSegmentStyle(
	ruler: ArcanaTokenRuler,
	waypoint: TokenRulerWaypointLike,
): Record<string, any> {
	const method = getBasePrototype()?._getSegmentStyle;
	if (typeof method !== 'function') return {};
	return method.call(ruler, waypoint) ?? {};
}

function callBaseMethod(ruler: ArcanaTokenRuler, methodName: string, args: unknown[]): unknown {
	const method = getBasePrototype()?.[methodName];
	if (typeof method !== 'function') return undefined;
	return method.apply(ruler, args);
}

function getBasePrototype(): any {
	return Object.getPrototypeOf(ArcanaTokenRuler.prototype);
}

function getActorSpeed(ruler: ArcanaTokenRuler): number | undefined {
	return foundry.utils.getProperty((ruler as any).token?.actor, 'system.speed') as
		| number
		| undefined;
}

function getWaypointDistance(waypoint: TokenRulerWaypointLike): number {
	const distance = waypoint.measurement?.distance ?? waypoint.distance ?? 0;
	return Number.isFinite(distance) ? distance : 0;
}

function getAlreadyMoved(ruler: ArcanaTokenRuler): number {
	const foundryManagedDistance = getFoundryManagedMovement(ruler);
	if (foundryManagedDistance !== undefined) return foundryManagedDistance;

	const turnKey = getTurnKey();
	const tokenId = getTokenId(ruler);
	const combatId = getCombatId();

	if (!turnKey || !tokenId || !combatId) return 0;
	return turnMovementTracker.getAlreadyMoved({ combatId, turnKey, tokenId });
}

function getFoundryManagedMovement(ruler: ArcanaTokenRuler): number | undefined {
	const token = (ruler as any).token;
	const distance = token?.document?.movement?.distance ?? token?.document?.movementDistance;
	return typeof distance === 'number' && Number.isFinite(distance) ? distance : undefined;
}

function getTokenId(ruler: ArcanaTokenRuler): string | undefined {
	const token = (ruler as any).token;
	return token?.document?.id ?? token?.id;
}

function getCombatId(): string | undefined {
	return (globalThis as any).game?.combat?.id;
}

function getTurnKey(): string | undefined {
	const combat = (globalThis as any).game?.combat;
	if (!combat) return undefined;
	return `${combat.round ?? 0}:${combat.turn ?? 0}:${combat.current?.tokenId ?? ''}`;
}
