const INITIATIVE_ROLL_IDENTIFIER = ': Iniciativa';

export const isInitiativeRoll = (rollData) => {
	return rollData.flavor && rollData.flavor.includes(INITIATIVE_ROLL_IDENTIFIER);
};
