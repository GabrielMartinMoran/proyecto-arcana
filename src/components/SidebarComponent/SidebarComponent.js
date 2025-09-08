const html = window.html || String.raw;

/**
 * SidebarComponent - Lateral navigation
 * @param {HTMLElement} container
 */
const SidebarComponent = (container) => {
    let state = {
        items: [
            { path: "/player", label: "Manual del jugador" },
            { path: "/gm", label: "Manual del director de juego" },
            { path: "/cards", label: "Galería de cartas" },
            { path: "/characters", label: "Personajes" }
        ],
        extraTitle: "",
        extraHtml: ""
    };

    const currentPath = () => (location.hash || "#/cards").replace(/^#/, "");

    const render = () => html`
        <aside class="sidebar-nav">
            <nav>
                <ul class="sidebar-list">
                    ${state.items.map(it => html`
                        <li>
                            <a href="#${it.path}" class="sidebar-link ${currentPath() === it.path ? 'active' : ''}">
                                ${it.label}
                            </a>
                        </li>
                    `).join("")}
                </ul>
            </nav>
            ${state.extraHtml ? html`
            <div class="sidebar-extra">
                <div class="sidebar-section-title">${state.extraTitle || 'Indice'}</div>
                <div class="sidebar-section-content">${state.extraHtml}</div>
            </div>` : ''}
        </aside>
    `;

    const loadStyles = () => {
        const href = './src/components/SidebarComponent/SidebarComponent.css';
        if (![...document.querySelectorAll('link[rel="stylesheet"]')].some(l => l.getAttribute('href') === href)) {
            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = href;
            document.head.appendChild(link);
        }
    };

    const onHashChange = () => {
        const links = container.querySelectorAll('.sidebar-link');
        links.forEach(a => {
            const url = new URL(a.getAttribute('href'), location.href);
            const path = url.hash.replace(/^#/, "");
            if (path === currentPath()) a.classList.add('active'); else a.classList.remove('active');
        });
    };

    const bindEvents = () => {
        window.addEventListener('hashchange', onHashChange);
    };

    const unbind = () => {
        window.removeEventListener('hashchange', onHashChange);
    };

    const api = {
        init() {
            loadStyles();
            container.innerHTML = render();
            bindEvents();
        },
        setExtra(title, htmlContent) {
            state.extraTitle = title || 'Indice';
            state.extraHtml = htmlContent || '';
            // Partial update: only replace the extra container if exists
            const extra = container.querySelector('.sidebar-extra .sidebar-section-content');
            if (extra) {
                extra.innerHTML = state.extraHtml;
                const titleEl = container.querySelector('.sidebar-extra .sidebar-section-title');
                if (titleEl) titleEl.textContent = state.extraTitle;
            } else {
                container.innerHTML = render();
                bindEvents();
            }
        },
        destroy() { unbind(); }
    };

    return api;
};

export default SidebarComponent;


