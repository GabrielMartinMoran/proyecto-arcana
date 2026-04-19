/**
 * Pure functions for building initiative formulas and flavor strings.
 * These functions have no side effects and no dependencies on Foundry globals.
 */

/**
 * Build the initiative roll formula based on mode.
 *
 * @param initMod - The initiative modifier from actor flags
 * @param mode - Roll mode: 'normal', 'advantage', or 'disadvantage'
 * @returns The dice formula string
 *
 * @example
 * buildInitiativeFormula(5, 'normal')     // "1d8e + 5"
 * buildInitiativeFormula(5, 'advantage') // "1d8e + 5 + 1d4"
 * buildInitiativeFormula(5, 'disadvantage') // "1d8e + 5 - 1d4"
 */
export function buildInitiativeFormula(
	initMod: number,
	mode: 'normal' | 'advantage' | 'disadvantage',
): string {
	let formula = `1d8e + ${initMod}`;

	if (mode === 'advantage') {
		formula += ' + 1d4';
	} else if (mode === 'disadvantage') {
		formula += ' - 1d4';
	}

	return formula;
}

/**
 * Build the initiative roll flavor string for chat messages.
 *
 * @param name - The combatant/actor name
 * @param mode - Roll mode: 'normal', 'advantage', or 'disadvantage'
 * @returns The localized flavor string in Spanish
 *
 * @example
 * buildInitiativeFlavor('Gandalf', 'normal')      // "Gandalf tira Iniciativa (Normal)"
 * buildInitiativeFlavor('Gandalf', 'advantage')   // "Gandalf tira Iniciativa (Ventaja)"
 * buildInitiativeFlavor('Gandalf', 'disadvantage') // "Gandalf tira Iniciativa (Desventaja)"
 */
export function buildInitiativeFlavor(name: string, mode: string): string {
	const modeLabel = mode === 'normal' ? 'Normal' : mode === 'advantage' ? 'Ventaja' : 'Desventaja';
	return `${name} tira Iniciativa (${modeLabel})`;
}
