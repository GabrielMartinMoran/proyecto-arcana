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
                label: 'Proyecto Arcana',
                children: [{ path: '/', label: 'Inicio' }],
                expanded: false,
            },
            {
                label: 'Referencias',
                children: [
                    { path: '/player', label: 'Manual del jugador' },
                    { path: '/cards', label: 'Galería de cartas' },
                    { path: '/gm', label: 'Manual del DJ' },
                    { path: '/bestiary', label: 'Bestiario' },
                ],
                expanded: false,
            },
            {
                label: 'Personajes',
                children: [
                    { path: '/characters', label: 'Mis personajes' },
                    { path: '/characters/examples', label: 'Personajes de ejemplo' },
                ],
                expanded: false,
            },
            {
                label: 'Herramientas',
                children: [
                    { path: '/encounters', label: 'Gestor de encuentros' },
                ],
                expanded: false,
            },
        ],
        extraTitle: '',
        extraHtml: '',
    };

    const currentPath = () => (location.hash || '#/').replace(/^#/, '');

    const render = () => html`
        <aside class="sidebar-nav">
            <nav>
                <ul class="sidebar-list">
                    ${state.items
                        .map((it) => {
                            if (it.children && it.children.length) {
                                return html`<li>
                                    <div class="sidebar-section-header" data-section="${it.label}" title="${it.expanded ? 'Colapsar' : 'Expandir'}" role="button" tabindex="0" aria-expanded="${it.expanded}" aria-label="${it.expanded ? 'Colapsar' : 'Expandir'} sección ${it.label}">
                                        <span class="sidebar-section-title">${it.label}</span>
                                        <span class="sidebar-toggle-icon" aria-hidden="true">${it.expanded ? '▼' : '▶'}</span>
                                    </div>
                                    <ul class="sidebar-sublist ${it.expanded ? 'expanded' : 'collapsed'}">
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

    const updateExpandedState = () => {
        const current = currentPath();
        // First, collapse all sections
        state.items.forEach((item) => {
            if (item.children && item.children.length) {
                item.expanded = false;
            }
        });
        // Then, expand the section with the active child
        state.items.forEach((item) => {
            if (item.children && item.children.length) {
                // Check if any child is active
                const hasActiveChild = item.children.some((child) => child.path === current);
                if (hasActiveChild) {
                    item.expanded = true;
                }
            }
        });
    };

    const onHashChange = () => {
        updateExpandedState();
        const links = container.querySelectorAll('.sidebar-link');
        links.forEach((a) => {
            const url = new URL(a.getAttribute('href'), location.href);
            const path = url.hash.replace(/^#/, '');
            if (path === currentPath()) a.classList.add('active');
            else a.classList.remove('active');
        });
        // Re-render to update expanded state
        container.innerHTML = render();
        bindEvents();
    };

    const bindEvents = () => {
        // Remove existing listeners to avoid duplicates
        window.removeEventListener('hashchange', onHashChange);
        window.addEventListener('hashchange', onHashChange);
        
        // Remove existing listeners to avoid duplicates
        container.removeEventListener('click', handleClick);
        container.removeEventListener('keydown', handleKeydown);
        container.addEventListener('click', handleClick);
        container.addEventListener('keydown', handleKeydown);
    };

    const updateSectionHeader = (header, item) => {
        // Update header attributes
        header.setAttribute('aria-expanded', item.expanded);
        header.setAttribute('title', item.expanded ? 'Colapsar' : 'Expandir');
        header.setAttribute('aria-label', `${item.expanded ? 'Colapsar' : 'Expandir'} sección ${item.label}`);
        
        // Update toggle icon
        const icon = header.querySelector('.sidebar-toggle-icon');
        if (icon) {
            icon.textContent = item.expanded ? '▼' : '▶';
        }
        
        // Update sublist visibility
        const sublist = header.parentElement.querySelector('.sidebar-sublist');
        if (sublist) {
            sublist.className = `sidebar-sublist ${item.expanded ? 'expanded' : 'collapsed'}`;
        }
    };

    const toggleSection = (header) => {
        const sectionLabel = header.getAttribute('data-section');
        const item = state.items.find((it) => it.label === sectionLabel);
        if (item) {
            // If expanding this section, collapse all others
            if (!item.expanded) {
                state.items.forEach((otherItem) => {
                    if (otherItem.children && otherItem.children.length && otherItem !== item) {
                        otherItem.expanded = false;
                        // Update other collapsed sections
                        const otherHeader = container.querySelector(`[data-section="${otherItem.label}"]`);
                        if (otherHeader) {
                            updateSectionHeader(otherHeader, otherItem);
                        }
                    }
                });
            }
            item.expanded = !item.expanded;
            // Update only the affected section instead of full re-render
            updateSectionHeader(header, item);
        }
    };

    const handleKeydown = (e) => {
        const header = e.target && e.target.closest && e.target.closest('.sidebar-section-header');
        if (header && (e.key === 'Enter' || e.key === ' ')) {
            e.preventDefault();
            e.stopPropagation();
            toggleSection(header);
            return;
        }
    };

    const handleClick = (e) => {
        const header = e.target && e.target.closest && e.target.closest('.sidebar-section-header');
        if (header) {
            e.preventDefault();
            e.stopPropagation();
            toggleSection(header);
            return;
        }
        
        // Intercept TOC anchor clicks to avoid changing the hash and breaking SPA route reload
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
    };

    const unbind = () => {
        window.removeEventListener('hashchange', onHashChange);
        container.removeEventListener('click', handleClick);
        container.removeEventListener('keydown', handleKeydown);
    };

    const api = {
        init() {
            loadStyles();
            updateExpandedState();
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
