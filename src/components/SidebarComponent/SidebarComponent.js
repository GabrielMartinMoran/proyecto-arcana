const html = window.html || String.raw;
import { ensureStyle } from '../../utils/style-utils.js';

/**
 * SidebarComponent - Lateral navigation
 * @param {HTMLElement} container
 */
const SidebarComponent = (container) => {
    let state = {
        items: [
            {
                label: 'Guías',
                children: [
                    { path: '/player', label: 'Manual del jugador' },
                    { path: '/gm', label: 'Manual del director de juego' },
                    { path: '/cards', label: 'Galería de cartas' },
                ],
            },
            {
                label: 'Personajes',
                children: [
                    { path: '/characters', label: 'Mis personajes' },
                    { path: '/characters/examples', label: 'Personajes de ejemplo' },
                ],
            },
        ],
        extraTitle: '',
        extraHtml: '',
    };

    const currentPath = () => (location.hash || '#/cards').replace(/^#/, '');

    const render = () => html`
        <aside class="sidebar-nav">
            <nav>
                <ul class="sidebar-list">
                    ${state.items
                        .map((it) => {
                            if (it.children && it.children.length) {
                                return html`<li>
                                    <div class="sidebar-section-title" style="margin-top:.25rem;">${it.label}</div>
                                    <ul class="sidebar-sublist">
                                        ${it.children
                                            .map(
                                                (ch) =>
                                                    html`<li>
                                                        <a
                                                            href="#${ch.path}"
                                                            class="sidebar-link ${currentPath() === ch.path
                                                                ? 'active'
                                                                : ''}"
                                                            >${ch.label}</a
                                                        >
                                                    </li>`
                                            )
                                            .join('')}
                                    </ul>
                                </li>`;
                            }
                            return html`<li>
                                <a href="#${it.path}" class="sidebar-link ${currentPath() === it.path ? 'active' : ''}"
                                    >${it.label}</a
                                >
                            </li>`;
                        })
                        .join('')}
                </ul>
            </nav>
            ${state.extraHtml
                ? html` <div class="sidebar-extra">
                      <div class="sidebar-section-title">${state.extraTitle || 'Indice'}</div>
                      <div class="sidebar-section-content">${state.extraHtml}</div>
                  </div>`
                : ''}
        </aside>
    `;

    const loadStyles = () => {
        ensureStyle('./src/components/SidebarComponent/SidebarComponent.css');
    };

    const onHashChange = () => {
        const links = container.querySelectorAll('.sidebar-link');
        links.forEach((a) => {
            const url = new URL(a.getAttribute('href'), location.href);
            const path = url.hash.replace(/^#/, '');
            if (path === currentPath()) a.classList.add('active');
            else a.classList.remove('active');
        });
    };

    const bindEvents = () => {
        window.addEventListener('hashchange', onHashChange);
        // Intercept TOC anchor clicks to avoid changing the hash and breaking SPA route reload
        container.addEventListener('click', (e) => {
            const a = e.target && e.target.closest && e.target.closest('a[data-toc]');
            if (!a) return;
            const href = a.getAttribute('href') || '';
            if (!href.startsWith('#')) return;
            e.preventDefault();
            const id = decodeURIComponent(href.slice(1));
            // Prefer searching inside the markdown article if present
            const md = document.querySelector('#md');
            const target = (md && md.querySelector(`#${CSS.escape(id)}`)) || document.getElementById(id);
            if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
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
        destroy() {
            unbind();
        },
    };

    return api;
};

export default SidebarComponent;
