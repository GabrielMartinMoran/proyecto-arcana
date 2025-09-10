const html = window.html || String.raw;

import LayoutWithSidebar from '../../components/LayoutWithSidebar/LayoutWithSidebar.js';
import MarkdownDoc from '../../components/MarkdownDoc/MarkdownDoc.js';

const BestiaryPage = (container) => {
    const render = () => html`<div id="layout"></div>`;

    const mount = async () => {
        const layoutRoot = container.querySelector('#layout');
        const layout = LayoutWithSidebar(layoutRoot, { title: 'Bestiario' });
        layout.init();
        layout.setMainHtml(html`
            <article id="md" class="doc"></article>
            <footer class="site-footer">
                © Gabriel Martín Moran. Todos los derechos reservados —
                <a href="LICENSE" target="_blank" rel="noopener">Licencia MIT</a>.
            </footer>
        `);
        const mdEl = layout.getMainEl().querySelector('#md');
        const doc = MarkdownDoc(mdEl, {
            mdPath: 'docs/bestiary.md',
            route: '/bestiary',
            onToc: (tocHtml) => layout.setSidebarExtra('Indice', tocHtml),
        });
        doc.init();
    };

    return {
        init() {
            container.innerHTML = render();
            mount();
        },
    };
};

export default BestiaryPage;
