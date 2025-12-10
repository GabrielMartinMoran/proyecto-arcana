import type { PrecalculatedRollData } from '../types/messages';

const INITIATIVE_ROLL_IDENTIFIER = ': Iniciativa';

export const isInitiativeRoll = (rollData: PrecalculatedRollData): boolean => {
	return rollData.flavor ? rollData.flavor.includes(INITIATIVE_ROLL_IDENTIFIER) : false;
};
