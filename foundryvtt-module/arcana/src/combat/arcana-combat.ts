/**
 * Custom Combat class to handle Arcana initiative mechanics
 */
export class ArcanaCombat extends Combat {
	/** @override */
	async rollInitiative(ids: string | string[], options: any = {}) {
		const combatantIds = typeof ids === 'string' ? [ids] : ids;

		for (const id of combatantIds) {
			// @ts-ignore - combatants exists on Combat
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
		// @ts-ignore - combatants exists on Combat
		const combatant = this.combatants.get(combatantId);
		if (!combatant) return;

		// Get initiative directly from flags to avoid scope issues in roll data
		// @ts-ignore - getFlag is available on Actor
		const initMod = combatant.actor?.getFlag('arcana', 'initiative') || 0;

		let formula = `1d8e + ${initMod}`;

		if (mode === 'advantage') {
			formula += ' + 1d4';
		} else if (mode === 'disadvantage') {
			formula += ' - 1d4';
		}

		// @ts-ignore - Roll is global, evaluate() is async by default in V12+
		const roll = await new Roll(formula, combatant.actor?.getRollData()).evaluate();
		await roll.toMessage({
			flavor: `${combatant.name} tira Iniciativa (${mode === 'normal' ? 'Normal' : mode === 'advantage' ? 'Ventaja' : 'Desventaja'})`,
			// @ts-ignore - ChatMessage is global
			speaker: ChatMessage.getSpeaker({ actor: combatant.actor, token: combatant.token }),
		});

		// @ts-ignore - setInitiative exists on Combat
		await this.setInitiative(combatantId, roll.total);
	}
}
