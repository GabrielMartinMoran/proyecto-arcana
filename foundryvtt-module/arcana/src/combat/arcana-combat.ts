/**
 * Custom Combat class to handle Arcana initiative mechanics
 */
import { buildInitiativeFlavor, buildInitiativeFormula } from './initiative-formula';

export class ArcanaCombat extends Combat {
	/** @override */

	async rollInitiative(ids: string | string[], _options: any = {}) {
		const combatantIds = typeof ids === 'string' ? [ids] : ids;

		for (const id of combatantIds) {
			// @ts-expect-error - combatants exists on Combat
			const combatant = this.combatants.get(id);
			if (!combatant) continue;

			const actor = combatant.actor;
			if (!actor) continue;

			// Prompt for Advantage/Disadvantage
			await new Promise<void>((resolve) => {
				new Dialog({
					title: `Tirar Iniciativa: ${combatant.name}`,
					content: `<p>Elige el tipo de tirada para <strong>${combatant.name}</strong></p>`,
					buttons: {
						normal: {
							label: 'Normal',
							callback: async () => {
								await this._rollCombatantInitiative(id, 'normal');
								resolve();
							},
						},
						advantage: {
							label: 'Ventaja (+1d4)',
							callback: async () => {
								await this._rollCombatantInitiative(id, 'advantage');
								resolve();
							},
						},
						disadvantage: {
							label: 'Desventaja (-1d4)',
							callback: async () => {
								await this._rollCombatantInitiative(id, 'disadvantage');
								resolve();
							},
						},
					},
					default: 'normal',
					close: () => resolve(), // Resolve if closed without choice to avoid hanging
				}).render(true);
			});
		}

		return this;
	}

	/**
	 * Helper to execute the roll for a single combatant
	 */
	async _rollCombatantInitiative(
		combatantId: string,
		mode: 'normal' | 'advantage' | 'disadvantage',
	) {
		// @ts-expect-error - combatants exists on Combat
		const combatant = this.combatants.get(combatantId);
		if (!combatant) return;

		// Get initiative directly from flags to avoid scope issues in roll data
		// @ts-expect-error - getFlag is available on Actor
		const initMod = combatant.actor?.getFlag('arcana', 'initiative') || 0;

		const formula = buildInitiativeFormula(initMod, mode);

		// @ts-expect-error - Roll is global, evaluate() is async by default in V12+
		const roll = await new Roll(formula, combatant.actor?.getRollData()).evaluate();
		await roll.toMessage({
			flavor: buildInitiativeFlavor(combatant.name, mode),
			// @ts-expect-error - ChatMessage is global
			speaker: ChatMessage.getSpeaker({ actor: combatant.actor, token: combatant.token }),
		});

		// @ts-expect-error - setInitiative exists on Combat
		await this.setInitiative(combatantId, roll.total);
	}
}
