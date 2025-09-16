import { toastManager } from '../components/Toast/Toast.js';

/**
 * Centralized dice service for handling all dice rolls with toast notifications
 */
export class DiceService {
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
        console.log('DiceService: Showing toast for character:', characterName);
        
        // Color individual dice rolls
        const coloredRolls = rolls.map(roll => {
            if (roll === 1) return `<span style="color: #dc2626; font-weight: bold;">${roll}</span>`; // Red for minimum
            if (roll === 6) return `<span style="color: #059669; font-weight: bold;">${roll}</span>`; // Green for maximum
            return roll;
        });

        toastManager.show(message, {
            type: 'success',
            duration: 5000,
            showDetails: true,
            characterName: characterName,
            details: {
                breakdown: breakdown,
                rolls: coloredRolls,
                ...details
            }
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
        const breakdown = `1d6=${result.d6} | ${result.advantage === 'normal' ? '±0' : `${result.advantage}=${result.advMod >= 0 ? '+' : ''}${result.advMod}`} | atributo=${result.base} | mods=${result.extras} | suerte=${result.luck}`;
        
        this.showRollToast({
            characterName,
            rollType: attributeName,
            total: result.total,
            rolls: [result.d6],
            breakdown: breakdown
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
    static showDiceRoll({ characterName, notation, rolls, total }) {
        const breakdown = `${notation} = ${total}`;
        
        this.showRollToast({
            characterName,
            rollType: notation,
            total: total,
            rolls: rolls,
            breakdown: breakdown
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
            breakdown: breakdown
        });
    }
}

export default DiceService;
