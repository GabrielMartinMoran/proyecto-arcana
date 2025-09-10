/**
 * StateService - Simple global state container with observer pattern
 */
const subscribersByKey = new Map();
let globalState = Object.create(null);

function notifyKeyChanged(key, value) {
    const set = subscribersByKey.get(key);
    if (!set) return;
    for (const listener of set) {
        try {
            listener(value, key);
        } catch (error) {
            console.error('StateService listener error', error);
        }
    }
}

const StateService = {
    /** Get full state snapshot */
    getState() {
        return { ...globalState };
    },

    /** Get a state key with optional fallback */
    get(key, fallback = undefined) {
        return Object.prototype.hasOwnProperty.call(globalState, key) ? globalState[key] : fallback;
    },

    /** Set a single key and notify */
    set(key, value) {
        const same = Object.is(globalState[key], value);
        globalState[key] = value;
        if (!same) notifyKeyChanged(key, value);
    },

    /** Merge partial state and notify per-key changes */
    setState(partial) {
        if (partial == null || typeof partial !== 'object') return;
        const entries = Object.entries(partial);
        for (const [key, value] of entries) {
            const same = Object.is(globalState[key], value);
            globalState[key] = value;
            if (!same) notifyKeyChanged(key, value);
        }
    },

    /** Subscribe to a single key */
    subscribe(key, listener) {
        if (!subscribersByKey.has(key)) subscribersByKey.set(key, new Set());
        subscribersByKey.get(key).add(listener);
        return () => this.unsubscribe(key, listener);
    },

    /** Unsubscribe from a single key */
    unsubscribe(key, listener) {
        const set = subscribersByKey.get(key);
        if (!set) return;
        set.delete(listener);
        if (set.size === 0) subscribersByKey.delete(key);
    },

    /** Reset state (use cautiously) */
    clear() {
        globalState = Object.create(null);
        subscribersByKey.clear();
    },
};

export default StateService;
