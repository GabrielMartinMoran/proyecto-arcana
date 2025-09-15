const html = window.html || String.raw;

import LayoutWithSidebar from '../../components/LayoutWithSidebar/LayoutWithSidebar.js';
import Footer from '../../components/Footer/Footer.js';
import MarkdownDoc from '../../components/MarkdownDoc/MarkdownDoc.js';
import { ensureStyle } from '../../utils/style-utils.js';
import { renderTocHtml } from '../../utils/markdown-utils.js';
import { removeDiacritics } from '../../utils/formatting-utils.js';
import BestiaryFilters from '../../components/BestiaryFilters/BestiaryFilters.js';
import { renderBestiaryStatblock } from '../../components/BestiaryStatblock/BestiaryStatblock.js';
import { validateBestiary } from '../../services/yaml-validate.js';

const BestiaryPage = (container) => {
    const render = () => html`<div id="layout"></div>`;

    const mount = async () => {
        ensureStyle('./src/pages/BestiaryPage/BestiaryPage.css');
        const layoutRoot = container.querySelector('#layout');
        const layout = LayoutWithSidebar(layoutRoot, { title: 'Bestiario' });
        layout.init();
        layout.setMainHtml(html`
            <div id="filters-host"></div>
            <div class="bestiary-root" id="bestiary-root"></div>
            ${Footer()}
        `);
        const root = layout.getMainEl().querySelector('#bestiary-root');
        const filtersHost = layout.getMainEl().querySelector('#filters-host');
        // Load YAML bestiary (cards already include js-yaml on index.html)
        let data = { creatures: [] };
        try {
            const res = await fetch('config/bestiary.yml');
            const txt = await res.text();
            const jsYaml = window.jsyaml || window.jsYAML || (window.jsyaml == null ? null : window.jsyaml);
            const parsed = jsYaml ? jsYaml.load(txt) : null;
            if (parsed && typeof parsed === 'object') data = validateBestiary(parsed);
        } catch (_) {}
        // Facets
        const naFacets = Array.from(new Set((data.creatures || []).map((c) => Number(c.na) || 0))).sort((a, b) => a - b);
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
            root.innerHTML = list.map(renderBestiaryStatblock).join('');
        };
        // Mount filters component
        const bf = BestiaryFilters(filtersHost, {
            search,
            naOptions: naFacets,
            selectedNA: naFilters,
            onChange: (val) => {
                search = removeDiacritics(val.search || '');
                naFilters = (val.selectedNA || []).slice();
                renderAll();
            },
            onClear: () => {
                search = '';
                naFilters = [];
                renderAll();
            },
        });
        bf.init();
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
    // componentized statblock, remove inline helpers

    return {
        init() {
            container.innerHTML = render();
            mount();
        },
    };
};

export default BestiaryPage;
