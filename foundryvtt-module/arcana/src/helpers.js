export function safeNum(val) {
	if (val === null || val === undefined) return 0;
	return Number(val);
}

export function safeStr(val) {
	if (!val) return '';
	return String(val).trim();
}

export function findActorOrTokenActor(actorId) {
	let actor = game.actors.get(actorId);
	if (!actor && canvas.scene) {
		const token = canvas.tokens.placeables.find((t) => t.actor && t.actor.id === actorId);
		if (token) actor = token.actor;
	}
	return actor;
}
