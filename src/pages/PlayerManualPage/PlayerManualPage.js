const html = window.html || String.raw;

import SidebarComponent from "../../components/SidebarComponent/SidebarComponent.js";
import { fetchMarkdown, renderMarkdown, buildTocFromContainer, renderTocHtml, bindMarkdownLinks, applyPendingAnchor } from "../../utils/markdown-utils.js";

const PlayerManualPage = (container) => {
    const loadStyles = () => {
        const href = './src/pages/PlayerManualPage/PlayerManualPage.css';
        if (![...document.querySelectorAll('link[rel="stylesheet"]')].some(l => l.getAttribute('href') === href)) {
            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = href;
            document.head.appendChild(link);
        }
    };

    const render = () => html`
        <div class="container">
            <div class="layout-with-sidebar">
                <div id="sidebar"></div>
                <div class="main-panel">
                    <div class="page-header"><button class="nav-toggle" id="open-drawer" aria-label="Abrir menú">☰</button> <h1 class="page-title">Manual del jugador</h1></div>
                    <article id="md" class="doc"></article>
                </div>
            </div>
        </div>
    `;

    const mount = async () => {
        const sidebarEl = container.querySelector('#sidebar');
        const sidebar = SidebarComponent(sidebarEl);
        sidebar.init();
        const openDrawerBtn = container.querySelector('#open-drawer');
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

        const mdEl = container.querySelector('#md');
        try {
            const text = await fetchMarkdown('docs/player.md');
            mdEl.innerHTML = renderMarkdown(text);
            const items = buildTocFromContainer(mdEl);
            const tocHtml = renderTocHtml(items);
            sidebar.setExtra('Indice', tocHtml);
            bindMarkdownLinks(mdEl, '/player');
            applyPendingAnchor(mdEl);
        } catch (error) {
            mdEl.innerHTML = `<p style="color:#f88">Failed to load markdown</p>`;
        }
    };

    return {
        init() { loadStyles(); container.innerHTML = render(); mount(); }
    };
};

export default PlayerManualPage;


