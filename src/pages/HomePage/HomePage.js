const html = window.html || String.raw;
import CardService from "../../services/card-service.js";
import GalleryComponent from "../../components/GalleryComponent/GalleryComponent.js";
import FiltersComponent from "../../components/FiltersComponent/FiltersComponent.js";
import SidebarComponent from "../../components/SidebarComponent/SidebarComponent.js";

/**
 * HomePage - Main gallery and filters page
 * @param {HTMLElement} container
 */
const HomePage = (container) => {
    let state = {
        allCards: [],
        filtered: [],
        facets: { attributes: [], tags: [], types: ["Accionable","De Efecto"], levels: [1,2,3,4,5] },
        loading: true,
        error: null,
        criteria: { text: '', levels: [], types: [], attributes: [], tags: [] }
    };

    const renderLoading = () => html`
        <div class="container" style="padding: var(--spacing-xl) 0;">
            <div class="empty-state">Loading cards…</div>
        </div>
    `;

    const renderContent = () => html`
        <div class="container">
            <div class="layout-with-sidebar">
                <div id="sidebar"></div>
                <div class="main-panel">
                    <div class="page-header"><button class="nav-toggle" id="open-drawer" aria-label="Abrir menú">☰</button> <h1 class="page-title">Galería de cartas</h1></div>
                    <div id="filters"></div>
                    <div id="gallery"></div>
                </div>
            </div>
        </div>
    `;

    const render = () => state.loading ? renderLoading() : renderContent();

    const init = async () => {
        // Load page styles
        const href = './src/pages/HomePage/HomePage.css';
        if (![...document.querySelectorAll('link[rel="stylesheet"]')].some(l => l.getAttribute('href') === href)) {
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
            state.filtered = CardService.filter(cards, state.criteria)
                .sort((a, b) => String(a.name).localeCompare(String(b.name)));
            state.facets = CardService.getFacets(cards);
            state.loading = false;
        } catch (error) {
            state.error = error;
            state.loading = false;
        }
    };

    const mountChildren = () => {
        const filtersEl = container.querySelector('#filters');
        const galleryEl = container.querySelector('#gallery');
        const sidebarEl = container.querySelector('#sidebar');
        const openDrawerBtn = container.querySelector('#open-drawer');
        // Sidebar
        const sidebar = SidebarComponent(sidebarEl);
        sidebar.init();
        if (openDrawerBtn) openDrawerBtn.addEventListener('click', () => {
            const backdrop = document.createElement('div');
            backdrop.className = 'drawer-backdrop open';
            backdrop.innerHTML = '<div class="drawer-panel"><div id="drawer-sidebar"></div></div>';
            document.body.appendChild(backdrop);
            const drawerContainer = document.getElementById('drawer-sidebar');
            const drawerSidebar = SidebarComponent(drawerContainer);
            drawerSidebar.init();
            backdrop.addEventListener('click', (e) => { if (e.target === backdrop) backdrop.remove(); });
        });

        // Filters
        const filters = FiltersComponent(filtersEl, {
            facets: state.facets,
            value: state.criteria,
            onChange: (value) => {
                state.criteria = value;
                const filtered = CardService.filter(state.allCards, state.criteria)
                    .sort((a, b) => String(a.name).localeCompare(String(b.name)));
                gallery.setState({ cards: filtered });
            },
            onClear: () => {
                state.criteria = { text: '', levels: [], types: [], attributes: [], tags: [] };
                filters.setState({ value: state.criteria });
                const filtered = CardService.filter(state.allCards, state.criteria)
                    .sort((a, b) => String(a.name).localeCompare(String(b.name)));
                gallery.setState({ cards: filtered });
            }
        });
        filters.init();

        // Gallery
        const gallery = GalleryComponent(galleryEl, { cards: state.filtered });
        gallery.init();
    };

    return { init };
};

export default HomePage;


