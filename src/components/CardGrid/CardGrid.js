const html = window.html || String.raw;
import { ensureStyle } from '../../utils/style-utils.js';

/**
 * Render a grid of card slots
 * @param {Array<any>} cards - array of card objects with {id, level, name}
 * @param {{ mode: 'deactivate'|'toggle'|'add', limit?: number }} opts
 */
export function renderCardGrid(cards, opts = {}) {
    ensureStyle('./src/components/CardGrid/CardGrid.css');
    const mode = opts.mode || 'toggle';
    const limit = Number.isFinite(opts.limit) ? Number(opts.limit) : null;
    const list = Array.isArray(cards) ? cards.slice() : [];
    list.sort((a, b) => Number(a.level) - Number(b.level) || String(a.name).localeCompare(String(b.name)));
    const final = limit ? list.slice(0, limit) : list;
    return html`<div class="cards-grid">
        ${final.map((card) => html`<div class="card-slot" data-id="${card.id}" data-actions="${mode}"></div>`).join('')}
    </div>`;
}

export default renderCardGrid;


