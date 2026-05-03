/**
 * Custom Combat class to handle Arcana initiative mechanics
 */
import { buildInitiativeFlavor, buildInitiativeFormula } from './initiative-formula';

export class ArcanaCombat extends Combat {
	/** @override */
	async rollInitiative(ids: string | string[], _options: any = {}) {
		const combatantIds = typeof ids === 'string' ? [ids] : ids;

		for (const id of combatantIds) {
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
		const combatant = this.combatants.get(combatantId);
		if (!combatant) return;

		// Get initiative from actor system data (TypeDataModel)
		const initMod = (combatant.actor?.system as any)?.initiative ?? 0;

		const formula = buildInitiativeFormula(initMod, mode);

		const roll = await new Roll(formula, combatant.actor?.getRollData()).evaluate();
		await roll.toMessage({
			flavor: buildInitiativeFlavor(combatant.name ?? '', mode),
			speaker: ChatMessage.getSpeaker({ actor: combatant.actor, token: combatant.token }),
		});

		await this.setInitiative(combatantId, roll.total);
	}
}
