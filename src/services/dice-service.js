import { toastManager } from '../components/Toast/Toast.js';

/**
 * Centralized dice service for handling all dice rolls with toast notifications
 */
export class DiceService {
    /**
     * Determine if a roll is explosive based on the dice type and position
     * @param {number} roll - The dice roll value
     * @param {number} index - The position of this roll in the array
     * @param {Array} rolls - All rolls in the sequence
     * @param {Object} details - Additional details about the roll
     * @returns {boolean} Whether this roll is explosive
     */
    static isExplosiveRoll(roll, index, rolls, details) {
        // For attribute rolls, only 6s explode
        if (details.exploded && details.d6Rolls) {
            return roll === 6 && index < details.d6Rolls.length - 1;
        }

        // For custom dice expressions with parts information
        if (details.parts) {
            let currentRollIndex = 0;
            for (const part of details.parts) {
                if (part.type === 'dice' && part.rolls) {
                    const partRolls = part.rolls;
                    const isExplosiveDice = part.notation.includes('e');

                    // Check if this roll is within this part's rolls
                    if (index >= currentRollIndex && index < currentRollIndex + partRolls.length) {
                        const localIndex = index - currentRollIndex;

                        if (isExplosiveDice) {
                            // Extract max value from notation (e.g., "1d2e" -> 2)
                            const match = part.notation.match(/(\d*)d(\d+)e/i);
                            if (match) {
                                const maxValue = parseInt(match[2]);
                                return roll === maxValue && localIndex < partRolls.length - 1;
                            }
                        }
                        return false; // Not explosive
                    }

                    currentRollIndex += partRolls.length;
                }
            }
        }

        // Default: only 6s explode (for backward compatibility)
        return roll === 6 && index < rolls.length - 1;
    }
    /**
     * Show a dice roll result in a toast
     * @param {Object} options - Toast options
     * @param {string} options.characterName - Name of the character who rolled
     * @param {string} options.rollType - Type of roll (attribute, dice, etc.)
     * @param {number} options.total - Total result
     * @param {Array} options.rolls - Individual dice rolls
     * @param {string} options.breakdown - Detailed breakdown
     * @param {Object} options.details - Additional details
     */
    static showRollToast({ characterName, rollType, total, rolls = [], breakdown, details = {} }) {
        const message = `${rollType}: ${total}`;

        // Color individual dice rolls and add explosion emoji
        const coloredRolls = rolls.map((roll, index) => {
            let coloredRoll;
            if (roll === 1)
                coloredRoll = `<span style="color: #dc2626; font-weight: bold;">${roll}</span>`; // Red for minimum
            else coloredRoll = roll;

            // Check if this roll should be green (maximum value) and explosive
            const isExplosiveRoll = this.isExplosiveRoll(roll, index, rolls, details);
            if (isExplosiveRoll) {
                coloredRoll = `<span style="color: #059669; font-weight: bold;">${roll}</span>`; // Green for explosive rolls
                // Add explosion emoji for explosive rolls (except the last one if it's not explosive)
                if (index < rolls.length - 1) {
                    coloredRoll += '💥';
                }
            }

            return coloredRoll;
        });

        toastManager.show(message, {
            type: 'success',
            duration: 5000,
            showDetails: true,
            characterName: characterName,
            details: {
                breakdown: breakdown,
                rolls: coloredRolls,
                ...details,
            },
        });
    }

    /**
     * Show attribute roll result
     * @param {Object} options - Roll options
     * @param {string} options.characterName - Character name
     * @param {string} options.attributeName - Attribute name
     * @param {Object} options.result - Roll result from modal
     */
    static showAttributeRoll({ characterName, attributeName, result }) {
        // Handle explosion rolls
        const d6Rolls = result.d6Rolls || [result.d6];
        const exploded = d6Rolls.length > 1;

        // Create breakdown with explosion info
        let breakdown = `1d6=${result.d6}`;
        if (exploded) {
            breakdown += ` (${d6Rolls.join('+')})`;
        }
        breakdown += ` | ${result.advantage === 'normal' ? '±0' : `${result.advantage}=${result.advMod >= 0 ? '+' : ''}${result.advMod}`} | atributo=${result.base} | mods=${result.extras} | suerte=${result.luck}`;

        this.showRollToast({
            characterName,
            rollType: attributeName,
            total: result.total,
            rolls: d6Rolls, // Show all explosion rolls
            breakdown: breakdown,
            details: {
                exploded: exploded,
                explosionCount: exploded ? d6Rolls.length - 1 : 0,
            },
        });
    }

    /**
     * Show simple dice roll result
     * @param {Object} options - Roll options
     * @param {string} options.characterName - Character name
     * @param {string} options.notation - Dice notation (e.g., "2d6")
     * @param {Array} options.rolls - Individual dice rolls
     * @param {number} options.total - Total result
     */
    static showDiceRoll({ characterName, notation, rolls, total, details = {} }) {
        // Check if this is an explosive dice roll by looking at the notation
        const hasExplosiveDice = notation.includes('e');
        const breakdown = `${notation} = ${total}`;

        this.showRollToast({
            characterName,
            rollType: notation,
            total: total,
            rolls: rolls,
            breakdown: breakdown,
            details: {
                hasExplosiveDice: hasExplosiveDice,
                explosiveNotation: notation, // Pass the notation to identify which dice explode
                ...details, // Include any additional details passed from DiceTab
            },
        });
    }

    /**
     * Show custom roll result
     * @param {Object} options - Roll options
     * @param {string} options.characterName - Character name
     * @param {string} options.description - Description of the roll
     * @param {number} options.total - Total result
     * @param {Array} options.rolls - Individual dice rolls
     * @param {string} options.breakdown - Detailed breakdown
     */
    static showCustomRoll({ characterName, description, total, rolls = [], breakdown }) {
        this.showRollToast({
            characterName,
            rollType: description,
            total: total,
            rolls: rolls,
            breakdown: breakdown,
        });
    }
}

export default DiceService;
