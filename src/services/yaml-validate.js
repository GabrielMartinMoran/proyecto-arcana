/**
 * Lightweight YAML shape validation helpers for cards and bestiary.
 * These are intentionally forgiving; they warn to console instead of throwing.
 */

export function validateCards(cards) {
    if (!Array.isArray(cards)) {
        console.warn('[validateCards] Expected array, got', typeof cards);
        return [];
    }
    return cards.filter((c, i) => {
        const ok = c && typeof c === 'object' && typeof c.name === 'string';
        if (!ok) console.warn(`[validateCards] Skipping invalid card at index ${i}`);
        return ok;
    });
}

export function validateBestiary(data) {
    const list = Array.isArray(data?.creatures) ? data.creatures : [];
    if (!list.length) {
        console.warn('[validateBestiary] No creatures found or invalid format');
        return { creatures: [] };
    }
    const creatures = list.filter((c, i) => {
        const ok = c && typeof c === 'object' && typeof c.name === 'string' && c.na != null;
        if (!ok) console.warn(`[validateBestiary] Skipping invalid creature at index ${i}`);
        return ok;
    });
    return { creatures };
}
