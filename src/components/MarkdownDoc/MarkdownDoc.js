const html = window.html || String.raw;

import {
    fetchMarkdown,
    renderMarkdown,
    buildTocFromContainer,
    renderTocHtml,
    bindMarkdownLinks,
    applyPendingAnchor,
} from '../../utils/markdown-utils.js';
import { ensureStyle } from '../../utils/style-utils.js';

/**
 * MarkdownDoc - Render a markdown document inside a container
 * @param {HTMLElement} container
 * @param {{ mdPath: string, route: string, onToc?: (html:string)=>void }} props
 */
const MarkdownDoc = (container, props = {}) => {
    let state = {
        mdPath: props.mdPath || '',
        route: props.route || '/',
        onToc: typeof props.onToc === 'function' ? props.onToc : () => {},
    };

    const loadStyles = () => {
        ensureStyle('./src/components/MarkdownDoc/MarkdownDoc.css');
    };

    const render = () => html`<article class="doc"></article>`;

    const mount = async () => {
        const mdEl = container.querySelector('.doc');
        if (!mdEl) return;
        try {
            const text = await fetchMarkdown(state.mdPath);
            mdEl.innerHTML = renderMarkdown(text);
            const items = buildTocFromContainer(mdEl);
            const tocHtml = renderTocHtml(items);
            state.onToc(tocHtml);
            bindMarkdownLinks(mdEl, state.route);
            applyPendingAnchor(mdEl);
        } catch (error) {
            console.error('MarkdownDoc error:', error);
            mdEl.innerHTML = `<p style="color:#f88">Failed to load markdown</p>`;
        }
    };

    const setState = (partial) => {
        state = { ...state, ...partial };
        container.innerHTML = render();
        mount();
    };

    return {
        init() {
            loadStyles();
            setState({});
        },
        setState,
    };
};

export default MarkdownDoc;
