import { isInitiativeRoll } from '../helpers/rolls-helper';
import type { PrecalculatedRollData, SpeakerData } from '../types/messages';

/**
 * Service responsible for handling precalculated rolls from external sources
 * Follows Single Responsibility Principle
 */
export class RollHandler {
	/**
	 * Process a precalculated roll and send it to chat
	 */
	async handlePrecalculatedRoll(data: PrecalculatedRollData): Promise<void> {
		try {
			const roll = new Roll(data.formula);
			let resultIndex = 0;

			for (const term of roll.terms) {
				// @ts-ignore - Die is available at runtime
				if (term instanceof Die || term.constructor.name === 'Die') {
					const dieCount = (term as any).number;
					const newResults = [];

					for (let i = 0; i < dieCount; i++) {
						const value = data.results[resultIndex];
						if (value !== undefined) {
							newResults.push({
								result: value,
								active: true,
							});
							resultIndex++;
						} else {
							newResults.push({
								result: Math.ceil(Math.random() * (term as any).faces),
								active: true,
							});
						}
					}

					(term as any).results = newResults;
					(term as any)._evaluated = true;
				}
			}

			await roll.evaluate();
			await roll.toMessage({ flavor: data.flavor ?? undefined, speaker: ChatMessage.getSpeaker() });

			await this.handleInitiativeIfNeeded(data, roll);
		} catch (e) {
			console.error('Error handling precalculated roll:', e);
		}
	}

	/**
	 * Set initiative in combat if the roll is an initiative roll
	 */
	private async handleInitiativeIfNeeded(data: PrecalculatedRollData, roll: any): Promise<void> {
		if (!isInitiativeRoll(data)) return;

		const combat = game.combat;
		if (!combat) return;

		const speaker = ChatMessage.getSpeaker() as SpeakerData;
		let combatant = null;

		if (speaker.token) {
			combatant = combat.combatants.find((c: any) => c.tokenId === speaker.token);
		} else if (speaker.actor) {
			combatant = combat.combatants.find((c: any) => c.actorId === speaker.actor);
		}

		if (combatant) {
			await combat.setInitiative((combatant as any).id, roll.total);
		}
	}
}
