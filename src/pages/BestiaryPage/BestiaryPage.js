const html = window.html || String.raw;

import LayoutWithSidebar from '../../components/LayoutWithSidebar/LayoutWithSidebar.js';
import MarkdownDoc from '../../components/MarkdownDoc/MarkdownDoc.js';
import { ensureStyle } from '../../utils/style-utils.js';
import { renderTocHtml } from '../../utils/markdown-utils.js';
import { removeDiacritics } from '../../utils/formatting-utils.js';

const BestiaryPage = (container) => {
    const render = () => html`<div id="layout"></div>`;

    const mount = async () => {
        ensureStyle('./src/pages/BestiaryPage/BestiaryPage.css');
        const layoutRoot = container.querySelector('#layout');
        const layout = LayoutWithSidebar(layoutRoot, { title: 'Bestiario' });
        layout.init();
        layout.setMainHtml(html`
            <div class="bestiary-filters-panel">
                <div class="filter-group">
                    <input id="beast-search" type="text" placeholder="Buscar por nombre" />
                </div>
                <div class="filter-group">
                    <div class="filters-label">Nivel de amenaza (NA)</div>
                    <div class="filters-list" id="beast-na-list"></div>
                </div>
                <div class="filter-actions">
                    <button class="button" id="beast-clear-filters">Limpiar filtros</button>
                </div>
            </div>
            <div class="bestiary-root" id="bestiary-root"></div>
            <footer class="site-footer">
                © Gabriel Martín Moran. Todos los derechos reservados —
                <a href="LICENSE" target="_blank" rel="noopener">Licencia MIT</a>.
            </footer>
        `);
        const root = layout.getMainEl().querySelector('#bestiary-root');
        const searchInput = layout.getMainEl().querySelector('#beast-search');
        const naListEl = layout.getMainEl().querySelector('#beast-na-list');
        const clearBtn = layout.getMainEl().querySelector('#beast-clear-filters');
        // Load YAML bestiary (cards already include js-yaml on index.html)
        let data = { creatures: [] };
        try {
            const res = await fetch('config/bestiary.yml');
            const txt = await res.text();
            const jsYaml = window.jsyaml || window.jsYAML || (window.jsyaml == null ? null : window.jsyaml);
            const parsed = jsYaml ? jsYaml.load(txt) : null;
            if (parsed && typeof parsed === 'object' && Array.isArray(parsed.creatures)) data = parsed;
        } catch (_) {}
        // Facets
        const naFacets = Array.from(new Set((data.creatures || []).map((c) => Number(c.na) || 0))).sort(
            (a, b) => a - b
        );
        if (naListEl)
            naListEl.innerHTML = naFacets
                .map(
                    (na) =>
                        `<label class="filters-check"><input type="checkbox" name="na-filter" value="${na}" /> ${na}</label>`
                )
                .join('');

        let search = '';
        let naFilters = [];
        const getFiltered = () =>
            (data.creatures || [])
                .filter((c) =>
                    removeDiacritics(String(c.name || ''))
                        .toLowerCase()
                        .includes(String(search || '').toLowerCase())
                )
                .filter((c) => (naFilters.length ? naFilters.includes(Number(c.na) || 0) : true));
        const renderAll = () => {
            const list = getFiltered().slice().sort((a, b) => {
                const naA = Number(a.na) || 0;
                const naB = Number(b.na) || 0;
                if (naA !== naB) return naA - naB;
                const nameA = removeDiacritics(String(a.name || '')).toLowerCase();
                const nameB = removeDiacritics(String(b.name || '')).toLowerCase();
                return nameA.localeCompare(nameB);
            });
            const tocItems = list.map((c) => ({ id: slugify(c.name), text: c.name, children: [] }));
            layout.setSidebarExtra('Indice', renderTocHtml(tocItems));
            root.innerHTML = list.map(renderCreature).join('');
        };
        let debTimer = null;
        if (searchInput)
            searchInput.addEventListener('input', (e) => {
                search = removeDiacritics(e.target.value || '');
                clearTimeout(debTimer);
                debTimer = setTimeout(renderAll, 150);
            });
        layout.getMainEl().addEventListener('change', (e) => {
            const target = e.target;
            if (!target || target.tagName !== 'INPUT') return;
            const name = target.getAttribute('name') || '';
            if (name !== 'na-filter') return;
            const val = Number(target.value) || 0;
            if (target.checked) {
                if (!naFilters.includes(val)) naFilters.push(val);
            } else {
                naFilters = naFilters.filter((x) => x !== val);
            }
            renderAll();
        });
        if (clearBtn)
            clearBtn.addEventListener('click', () => {
                search = '';
                naFilters = [];
                if (searchInput) searchInput.value = '';
                layout
                    .getMainEl()
                    .querySelectorAll('input[name="na-filter"]')
                    .forEach((ch) => (ch.checked = false));
                renderAll();
            });
        renderAll();
    };

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
    const renderUses = (uses) => {
        if (!uses || typeof uses !== 'object') return '';
        const type = String(uses.type || '').toUpperCase();
        const qty = Number(uses.qty) || 0;
        if (type === 'RELOAD') return html`<span class="chip">Recarga ${qty}+</span>`;
        if (type === 'USES') return html`<span class="chip">${qty} ${qty === 1 ? 'uso' : 'usos'}</span>`;
        return '';
    };
    const renderKV = (k, v) => `<span class="kv"><strong>${k}:</strong> ${escapeHtml(v)}</span>`;
    const renderList = (items) =>
        items && items.length ? `<ul class="list">${items.map((x) => `<li>${escapeHtml(x)}</li>`).join('')}</ul>` : '';
    const renderPairs = (items) =>
        items && items.length
            ? html`<ul class="list">
                  ${items
                      .map(
                          (x) =>
                              `<li><strong>${escapeHtml(x.name)}:</strong> ${escapeHtml(x.detail || x.note || '')}</li>`
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
                              `<li><strong>${escapeHtml(a.name)}:</strong> +${Number(a.bonus) || 0} (${escapeHtml(
                                  a.damage
                              )})${a.note ? ` — ${escapeHtml(a.note)}` : ''}</li>`
                      )
                      .join('')}
              </ul>`
            : '';
    const renderCreature = (c) => {
        const esquivaNote = c.stats?.esquiva?.note ? ` (${escapeHtml(c.stats.esquiva.note)})` : '';
        const mitigNote = c.stats?.mitigacion?.note ? ` (${escapeHtml(c.stats.mitigacion.note)})` : '';
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
                                      `<li><strong>${escapeHtml(a.name)} (<em>${renderUses(a.uses)}</em>):</strong>
                           ${escapeHtml(a.detail || '')}</li>`
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
    };

    return {
        init() {
            container.innerHTML = render();
            mount();
        },
    };
};

export default BestiaryPage;
