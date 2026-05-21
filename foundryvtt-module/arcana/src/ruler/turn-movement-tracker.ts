interface TurnMovementKey {
	combatId: string;
	turnKey: string;
	tokenId: string;
}

interface RecordMovementInput extends TurnMovementKey {
	meters: number;
}

export class TurnMovementTracker {
	private readonly movementByTurn = new Map<string, number>();

	recordMovement({ combatId, turnKey, tokenId, meters }: RecordMovementInput): void {
		if (!Number.isFinite(meters) || meters <= 0) return;

		const key = this.keyFor({ combatId, turnKey, tokenId });
		this.movementByTurn.set(key, this.getAlreadyMoved({ combatId, turnKey, tokenId }) + meters);
	}

	getAlreadyMoved(input: TurnMovementKey): number {
		return this.movementByTurn.get(this.keyFor(input)) ?? 0;
	}

	private keyFor({ combatId, turnKey, tokenId }: TurnMovementKey): string {
		return `${combatId}:${turnKey}:${tokenId}`;
	}
}

export const turnMovementTracker = new TurnMovementTracker();
