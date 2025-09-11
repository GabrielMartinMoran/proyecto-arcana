const html = window.html || String.raw;
import CardService from '../../services/card-service.js';
import GalleryComponent from '../../components/GalleryComponent/GalleryComponent.js';
import FiltersComponent from '../../components/FiltersComponent/FiltersComponent.js';
import LayoutWithSidebar from '../../components/LayoutWithSidebar/LayoutWithSidebar.js';

/**
 * HomePage - Main gallery and filters page
 * @param {HTMLElement} container
 */
const HomePage = (container) => {
    let state = {
        allCards: [],
        filtered: [],
        facets: { attributes: [], tags: [], types: ['Activable', 'Efecto'], levels: [1, 2, 3, 4, 5] },
        loading: true,
        error: null,
        criteria: { text: '', levels: [], types: [], attributes: [], tags: [] },
    };

    const renderLoading = () => html`
        <div class="container" style="padding: var(--spacing-xl) 0;">
            <div class="empty-state">Loading cards…</div>
        </div>
    `;

    const renderContent = () => html`<div id="layout"></div>`;

    const render = () => (state.loading ? renderLoading() : renderContent());

    const init = async () => {
        // Load page styles
        const href = './src/pages/HomePage/HomePage.css';
        if (![...document.querySelectorAll('link[rel="stylesheet"]')].some((l) => l.getAttribute('href') === href)) {
            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = href;
            document.head.appendChild(link);
        }
        container.innerHTML = render();
        if (state.loading) await loadData();
        container.innerHTML = render();
        mountChildren();
    };

    const loadData = async () => {
        try {
            const cards = await CardService.loadAll();
            state.allCards = cards;
            state.filtered = CardService.filter(cards, state.criteria).sort(
                (a, b) => Number(a.level) - Number(b.level) || String(a.name).localeCompare(String(b.name))
            );
            state.facets = CardService.getFacets(cards);
            state.loading = false;
        } catch (error) {
            state.error = error;
            state.loading = false;
        }
    };

    const mountChildren = () => {
        const layoutRoot = container.querySelector('#layout');
        const layout = LayoutWithSidebar(layoutRoot, { title: 'Galería de cartas' });
        layout.init();
        layout.setMainHtml(html`
            <div id="filters"></div>
            <div id="gallery"></div>
            <footer class="site-footer">
                © Gabriel Martín Moran. Todos los derechos reservados —
                <a href="LICENSE" target="_blank" rel="noopener">Licencia MIT</a>.
            </footer>
        `);
        const mainEl = layout.getMainEl();
        const filtersEl = mainEl.querySelector('#filters');
        const galleryEl = mainEl.querySelector('#gallery');

        // Filters
        const filters = FiltersComponent(filtersEl, {
            facets: state.facets,
            value: state.criteria,
            onChange: (value) => {
                state.criteria = value;
                const filtered = CardService.filter(state.allCards, state.criteria).sort(
                    (a, b) => Number(a.level) - Number(b.level) || String(a.name).localeCompare(String(b.name))
                );
                gallery.setState({ cards: filtered });
            },
            onClear: () => {
                state.criteria = { text: '', levels: [], types: [], attributes: [], tags: [] };
                filters.setState({ value: state.criteria });
                const filtered = CardService.filter(state.allCards, state.criteria).sort(
                    (a, b) => Number(a.level) - Number(b.level) || String(a.name).localeCompare(String(b.name))
                );
                gallery.setState({ cards: filtered });
            },
        });
        filters.init();

        // Gallery
        const gallery = GalleryComponent(galleryEl, { cards: state.filtered });
        gallery.init();
    };

    return { init };
};

export default HomePage;
