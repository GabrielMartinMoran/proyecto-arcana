import type { ArcanaActor } from './types/actor';

export function safeNum(val: any): number {
	if (val === null || val === undefined) return 0;
	return Number(val);
}

export function safeStr(val: any): string {
	if (!val) return '';
	return String(val).trim();
}

export function findActorOrTokenActor(actorId: string): ArcanaActor | undefined {
	let actor = game.actors.get(actorId);
	if (!actor && canvas.scene) {
		const token = canvas.tokens.placeables.find((t) => t.actor && t.actor.id === actorId);
		if (token) actor = token.actor;
	}
	return actor;
}
