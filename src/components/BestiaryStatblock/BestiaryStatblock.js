const html = window.html || String.raw;
import { ensureStyle } from '../../utils/style-utils.js';

const escapeHtml = (s) =>
    String(s).replace(
        /[&<>"']/g,
        (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch])
    );

const slugify = (s) =>
    String(s)
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');

const renderKV = (k, v) => html`<span class="kv"><strong>${k}:</strong> ${escapeHtml(v)}</span>`;

const renderList = (items) =>
    items && items.length
        ? html`<ul class="list">
              ${items.map((x) => html`<li>${escapeHtml(x)}</li>`).join('')}
          </ul>`
        : '';

const renderPairs = (items) =>
    items && items.length
        ? html`<ul class="list">
              ${items
                  .map(
                      (x) =>
                          html`<li><strong>${escapeHtml(x.name)}:</strong> ${escapeHtml(x.detail || x.note || '')}</li>`
                  )
                  .join('')}
          </ul>`
        : '';

const renderAttacks = (items) =>
    items && items.length
        ? html`<ul class="list">
              ${items
                  .map(
                      (a) =>
                          html`<li>
                              <strong>${escapeHtml(a.name)}:</strong> +${Number(a.bonus) || 0}
                              (${escapeHtml(a.damage)})${a.note ? ` — ${escapeHtml(a.note)}` : ''}
                          </li>`
                  )
                  .join('')}
          </ul>`
        : '';

const renderUses = (uses) => {
    if (!uses || typeof uses !== 'object') return '';
    const type = String(uses.type || '').toUpperCase();
    const qty = Number(uses.qty) || 0;
    if (type === 'RELOAD') return html`<span class="chip">Recarga ${qty}+</span>`;
    if (type === 'USES') return html`<span class="chip">${qty} ${qty === 1 ? 'uso' : 'usos'}</span>`;
    return '';
};

export function renderBestiaryStatblock(c) {
    ensureStyle('./src/components/BestiaryStatblock/BestiaryStatblock.css');
    const esquivaNote = c.stats?.esquiva?.note ? ` (${escapeHtml(c.stats.esquiva.note)})` : '';
    const mitigNote = c.stats?.mitigacion?.note ? ` (${escapeHtml(c.stats.mitigacion.note)})` : '';
    const velocNote = c.stats?.velocidad?.note ? ` (${escapeHtml(c.stats.velocidad.note)})` : '';
    return html` <article class="statblock" id="${slugify(c.name)}">
        <div class="header">
            <h3>${escapeHtml(c.name)}</h3>
            ${renderKV('NA', c.na)}
        </div>
        <div class="attributes">
            ${renderKV('Cuerpo', c.attributes?.cuerpo)} ${renderKV('Reflejos', c.attributes?.reflejos)}
            ${renderKV('Mente', c.attributes?.mente)} ${renderKV('Instinto', c.attributes?.instinto)}
            ${renderKV('Presencia', c.attributes?.presencia)}
        </div>
        <div class="derived-attributes">
            ${renderKV('Salud', c.stats?.salud)}
            ${renderKV('Esquiva', `${c.stats?.esquiva?.value ?? ''}${esquivaNote}`)}
            ${renderKV('Mitigación', `${c.stats?.mitigacion?.value ?? ''}${mitigNote}`)}
            ${renderKV('Velocidad', `${c.stats?.velocidad?.value ?? ''}${velocNote}`)}
        </div>
        <div class="section">
            <strong>Lenguas:</strong>
            ${renderList(c.languages || [])}
        </div>
        <div class="section">
            <strong>Ataques:</strong>
            ${renderAttacks(c.attacks || [])}
        </div>
        ${c.traits && c.traits.length
            ? html`<div class="section"><strong>Rasgos:</strong>${renderPairs(c.traits)}</div>`
            : ''}
        ${c.actions && c.actions.length
            ? html`<div class="section">
                  <strong>Acciones:</strong>
                  <ul class="list">
                      ${c.actions
                          .map(
                              (a) =>
                                  html`<li>
                                      <strong>${escapeHtml(a.name)} (<em>${renderUses(a.uses)}</em>):</strong>
                                      ${escapeHtml(a.detail || '')}
                                  </li>`
                          )
                          .join('')}
                  </ul>
              </div>`
            : ''}
        ${c.reactions && c.reactions.length
            ? html`<div class="section"><strong>Reacciones:</strong>${renderPairs(c.reactions)}</div>`
            : ''}
        ${c.behavior
            ? html`<div class="section">
                  <strong>Comportamiento:</strong>
                  <div class="bio-content">${escapeHtml(c.behavior)}</div>
              </div>`
            : ''}
    </article>`;
}
