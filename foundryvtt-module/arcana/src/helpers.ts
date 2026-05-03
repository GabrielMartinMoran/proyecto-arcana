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
	const actor = game.actors?.get(actorId);
	if (actor) return actor as unknown as ArcanaActor;

	if (canvas.scene && canvas.tokens) {
		const token = canvas.tokens.placeables.find((t: any) => t.actor && t.actor.id === actorId);
		if (token) return token.actor as unknown as ArcanaActor;
	}
	return undefined;
}
