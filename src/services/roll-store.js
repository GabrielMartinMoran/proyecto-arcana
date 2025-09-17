/**
 * Centralized store for managing dice rolls across the application
 * Provides a reactive system where components can subscribe to roll updates
 */

const STORAGE_KEY = 'arcana:roll-history';

class RollStore {
    constructor() {
        this.subscribers = new Set();
        this.maxRolls = 200;
        this.rolls = this.loadFromStorage();
    }

    /**
     * Load rolls from localStorage
     * @returns {Array} Array of rolls
     */
    loadFromStorage() {
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            if (stored) {
                const parsed = JSON.parse(stored);
                return Array.isArray(parsed) ? parsed : [];
            }
        } catch (error) {
            console.error('Error loading roll history from storage:', error);
        }
        return [];
    }

    /**
     * Save rolls to localStorage
     */
    saveToStorage() {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(this.rolls));
        } catch (error) {
            console.error('Error saving roll history to storage:', error);
        }
    }

    /**
     * Add a new roll to the store
     * @param {Object} roll - The roll data
     */
    addRoll(roll) {
        const rollEntry = {
            id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now() + Math.random()),
            timestamp: Date.now(),
            ...roll
        };

        this.rolls.unshift(rollEntry);
        
        // Limit the number of stored rolls
        if (this.rolls.length > this.maxRolls) {
            this.rolls.length = this.maxRolls;
        }

        // Save to storage
        this.saveToStorage();

        // Notify all subscribers
        this.notifySubscribers();
    }

    /**
     * Get all rolls
     * @returns {Array} Array of roll entries
     */
    getRolls() {
        return [...this.rolls];
    }

    /**
     * Clear all rolls
     */
    clearRolls() {
        this.rolls = [];
        this.saveToStorage();
        this.notifySubscribers();
    }

    /**
     * Remove a specific roll by ID
     * @param {string} rollId - The ID of the roll to remove
     */
    removeRoll(rollId) {
        this.rolls = this.rolls.filter(roll => roll.id !== rollId);
        this.saveToStorage();
        this.notifySubscribers();
    }

    /**
     * Subscribe to roll updates
     * @param {Function} callback - Function to call when rolls change
     * @returns {Function} Unsubscribe function
     */
    subscribe(callback) {
        this.subscribers.add(callback);
        
        // Return unsubscribe function
        return () => {
            this.subscribers.delete(callback);
        };
    }

    /**
     * Notify all subscribers of changes
     */
    notifySubscribers() {
        this.subscribers.forEach(callback => {
            try {
                callback(this.getRolls());
            } catch (error) {
                console.error('Error in roll store subscriber:', error);
            }
        });
    }

    /**
     * Get rolls for a specific character
     * @param {string} characterName - Name of the character
     * @returns {Array} Array of rolls for the character
     */
    getRollsForCharacter(characterName) {
        return this.rolls.filter(roll => roll.who === characterName);
    }

    /**
     * Get rolls of a specific type
     * @param {string} type - Type of roll (dice, attribute, etc.)
     * @returns {Array} Array of rolls of the specified type
     */
    getRollsByType(type) {
        return this.rolls.filter(roll => roll.type === type);
    }
}

// Create singleton instance
const rollStore = new RollStore();

export default rollStore;
