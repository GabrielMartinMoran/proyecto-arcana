const html = window.html || String.raw;

import SidebarComponent from '../../components/SidebarComponent/SidebarComponent.js';
import { renderTocHtml } from '../../utils/markdown-utils.js';
import MarkdownDoc from '../../components/MarkdownDoc/MarkdownDoc.js';
import LayoutWithSidebar from '../../components/LayoutWithSidebar/LayoutWithSidebar.js';
import Footer from '../../components/Footer/Footer.js';

const PlayerManualPage = (container) => {
    let lastTocHtml = '';
    const loadStyles = () => {
        const href = './src/pages/PlayerManualPage/PlayerManualPage.css';
        if (![...document.querySelectorAll('link[rel="stylesheet"]')].some((l) => l.getAttribute('href') === href)) {
            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = href;
            document.head.appendChild(link);
        }
    };

    const render = () => html`<div id="layout"></div>`;

    const mount = async () => {
        const layoutRoot = container.querySelector('#layout');
        const layout = LayoutWithSidebar(layoutRoot, { title: 'Manual del jugador' });
        layout.init();
        layout.setMainHtml(html`
            <article id="md" class="doc"></article>
            ${Footer()}
        `);
        const mdEl = layout.getMainEl().querySelector('#md');
        const doc = MarkdownDoc(mdEl, {
            mdPath: 'docs/player.md',
            route: '/player',
            onToc: (tocHtml) => {
                lastTocHtml = tocHtml;
                layout.setSidebarExtra('Indice', tocHtml);
            },
        });
        doc.init();
    };

    return {
        init() {
            loadStyles();
            container.innerHTML = render();
            mount();
        },
    };
};

export default PlayerManualPage;
