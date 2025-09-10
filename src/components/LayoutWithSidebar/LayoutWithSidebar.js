const html = window.html || String.raw;

import SidebarComponent from '../SidebarComponent/SidebarComponent.js';
import { ensureStyle } from '../../utils/style-utils.js';

const LayoutWithSidebar = (container, props = {}) => {
    let state = { title: props.title || '' };
    let sidebarApi = null;
    let lastExtra = { title: 'Indice', html: '' };

    const loadStyles = () => { ensureStyle('./src/components/LayoutWithSidebar/LayoutWithSidebar.css'); };

    const render = () => html`
        <div class="container">
            <div class="layout-with-sidebar">
                <div id="sidebar"></div>
                <div class="main-panel">
                    <div class="page-header"><button class="nav-toggle" id="open-drawer" aria-label="Abrir menú">☰</button> <h1 class="page-title">${state.title}</h1></div>
                    <div class="layout-slot"></div>
                </div>
            </div>
        </div>
    `;

    const mount = () => {
        const sideEl = container.querySelector('#sidebar');
        sidebarApi = SidebarComponent(sideEl);
        sidebarApi.init();
        const openDrawerBtn = container.querySelector('#open-drawer');
        if (openDrawerBtn) openDrawerBtn.addEventListener('click', () => {
            const existing = document.querySelector('.drawer-backdrop');
            if (existing) { existing.remove(); document.body.classList.remove('no-scroll'); return; }
            const backdrop = document.createElement('div');
            backdrop.className = 'drawer-backdrop open';
            backdrop.innerHTML = '<div class="drawer-panel"><div id="drawer-sidebar"></div></div>';
            document.body.appendChild(backdrop);
            document.body.classList.add('no-scroll');
            const drawerContainer = document.getElementById('drawer-sidebar');
            const drawerSidebar = SidebarComponent(drawerContainer);
            drawerSidebar.init();
            if (lastExtra.html) drawerSidebar.setExtra(lastExtra.title, lastExtra.html);
            const closeAll = () => { backdrop.remove(); document.body.classList.remove('no-scroll'); };
            backdrop.addEventListener('click', (e) => { if (e.target === backdrop) closeAll(); });
            const panel = backdrop.querySelector('.drawer-panel');
            if (panel) panel.addEventListener('click', (e) => {
                const link = e.target && e.target.closest && e.target.closest('a');
                if (link) setTimeout(closeAll, 0);
            });
        });
    };

    return {
        init() { loadStyles(); container.innerHTML = render(); mount(); },
        setMainHtml(htmlContent) {
            const slot = container.querySelector('.layout-slot');
            if (slot) slot.innerHTML = htmlContent;
        },
        getMainEl() { return container.querySelector('.layout-slot'); },
        setSidebarExtra(title, html) { lastExtra = { title: title || 'Indice', html: html || '' }; if (sidebarApi) sidebarApi.setExtra(lastExtra.title, lastExtra.html); },
    };
};

export default LayoutWithSidebar;
