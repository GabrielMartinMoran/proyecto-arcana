/**
 * StorageUtils - LocalStorage helpers for JSON data with error safety
 */
const STORAGE_PREFIX = "arcana:";

const getKey = (key) => `${STORAGE_PREFIX}${key}`;

const StorageUtils = {
    /**
     * Save a JSON-serializable value
     * @param {string} key
     * @param {any} value
     */
    save(key, value) {
        try {
            const stringified = JSON.stringify(value);
            localStorage.setItem(getKey(key), stringified);
            return true;
        } catch (error) {
            console.error("StorageUtils.save error:", error);
            return false;
        }
    },

    /**
     * Load a value or fallback
     * @param {string} key
     * @param {any} fallback
     */
    load(key, fallback = null) {
        try {
            const raw = localStorage.getItem(getKey(key));
            if (raw == null) return fallback;
            return JSON.parse(raw);
        } catch (error) {
            console.error("StorageUtils.load error:", error);
            return fallback;
        }
    },

    /**
     * Merge partial object into existing stored object
     * @param {string} key
     * @param {Record<string, any>} partial
     */
    merge(key, partial) {
        const current = this.load(key, {});
        if (typeof current !== "object" || current === null) {
            return this.save(key, partial);
        }
        return this.save(key, { ...current, ...partial });
    },

    /** Remove a stored key */
    remove(key) {
        try { localStorage.removeItem(getKey(key)); } catch (_) {}
    },

    /** Check if key exists */
    exists(key) {
        try { return localStorage.getItem(getKey(key)) != null; } catch (_) { return false; }
    }
};

export default StorageUtils;




