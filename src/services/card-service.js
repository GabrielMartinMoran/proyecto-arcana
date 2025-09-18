/**
 * CardService - Load and query ARCANA cards from config and cache
 */
import { removeDiacritics } from '../utils/formatting-utils.js';
import StorageUtils from '../utils/storage-utils.js';
import { validateCards } from './yaml-validate.js';

const STORAGE_KEY = 'cards-cache';
const CONFIG_PATH = 'config/cards.yml';

let cachedCards = null;

function normalizeCard(raw) {
    const card = { ...raw };
    card.id = card.id || `${(card.name || '').toLowerCase().replace(/\s+/g, '-')}-${card.level || 'n'}`;
    card.name = card.name || 'Unknown';
    card.level = Number(card.level) || 1;
    card.type = card.type || 'Activable'; // or "Efecto"
    // attribute deprecated
    // Backward compatibility: map legacy fields
    // if legacy arquetipo exists, push into tags
    const legacyArquetipo = card.arquetipo || card.sintonia || null;
    const rawTags = Array.isArray(card.tags) ? card.tags : card.tags ? [card.tags] : [];
    card.tags = rawTags.concat(legacyArquetipo ? [legacyArquetipo] : []).filter(Boolean);
    card.requirements = Array.isArray(card.requirements)
        ? card.requirements
        : card.requirements
          ? [card.requirements]
          : [];
    card.description = card.description || 'No description';
    card.reload = Object.prototype.hasOwnProperty.call(raw, 'reload') ? raw.reload : null;
    return card;
}

function applyFilters(cards, criteria) {
    if (!criteria) return cards;
    const text = (criteria.text || '').trim().toLowerCase();
    const levels = new Set(criteria.levels || []);
    const types = new Set(criteria.types || []);
    // attribute filter removed
    const tags = new Set(criteria.tags || []);

    return cards.filter((card) => {
        if (
            text &&
            !removeDiacritics(String(card.name || ''))
                .toLowerCase()
                .includes(removeDiacritics(text))
        )
            return false;
        if (levels.size && !levels.has(Number(card.level))) return false;
        if (types.size && !types.has(card.type)) return false;
        // attribute filter removed
        if (tags.size) {
            const cardTags = Array.isArray(card.tags) ? card.tags : [];
            if (!cardTags.some((t) => tags.has(t))) return false;
        }
        return true;
    });
}

const CardService = {
    /** Load cards from config and local cache */
    async loadAll({ force = false } = {}) {
        if (!force && Array.isArray(cachedCards)) return cachedCards;

        try {
            const response = await fetch(CONFIG_PATH, { cache: 'no-store' });
            if (!response.ok) throw new Error(`Failed to fetch cards config: ${response.status}`);
            const text = await response.text();
            let parsed = null;
            try {
                const y =
                    (typeof globalThis !== 'undefined' && globalThis.jsyaml) ||
                    (typeof window !== 'undefined' && window.jsyaml) ||
                    null;
                if (y && typeof y.load === 'function') parsed = y.load(text);
                else if (y && typeof y.safeLoad === 'function') parsed = y.safeLoad(text);
            } catch (_) {}
            if (!parsed) {
                try {
                    parsed = JSON.parse(text);
                } catch (_) {
                    parsed = {};
                }
            }
            const parsedArray = Array.isArray(parsed?.cards) ? parsed.cards : Array.isArray(parsed) ? parsed : [];
            const fromConfig = validateCards(parsedArray);

            const fromLocal = StorageUtils.load(STORAGE_KEY, []);
            const merged = [...fromConfig, ...fromLocal].map(normalizeCard);

            cachedCards = merged;
            try {
                console.info('[CardService] loaded cards:', cachedCards.length);
            } catch (_) {}
            return cachedCards;
        } catch (error) {
            console.error('CardService.loadAll error:', error);
            cachedCards = [];
            return cachedCards;
        }
    },

    /** Get cached cards (may be null before load) */
    getCached() {
        return cachedCards;
    },

    /** Add a custom card and persist */
    addCard(card) {
        const custom = StorageUtils.load(STORAGE_KEY, []);
        const normalized = normalizeCard(card);
        custom.push(normalized);
        StorageUtils.save(STORAGE_KEY, custom);
        if (Array.isArray(cachedCards)) cachedCards.push(normalized);
        return normalized;
    },

    /** Filter cards using criteria */
    filter(cards, criteria) {
        return applyFilters(cards, criteria);
    },

    /** Get unique values for facets (attributes, sintonias, types, levels) */
    getFacets(cards) {
        const attr = new Set();
        const tagSet = new Set();
        const types = new Set();
        const levels = new Set();
        for (const c of cards) {
            // attribute removed
            if (Array.isArray(c.tags)) c.tags.forEach((t) => tagSet.add(t));
            if (c.type) types.add(c.type);
            if (c.level) levels.add(Number(c.level));
        }
        return {
            attributes: [],
            tags: Array.from(tagSet).sort(),
            types: Array.from(types).sort(),
            levels: Array.from(levels).sort((a, b) => a - b),
        };
    },
};

export default CardService;
