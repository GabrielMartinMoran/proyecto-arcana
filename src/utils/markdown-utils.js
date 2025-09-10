/**
 * MarkdownUtils - fetch and render markdown with Marked
 */
export async function fetchMarkdown(path) {
    const candidates = [path, `./${path.replace(/^\.\/?/, '')}`, `/${path.replace(/^\/?/, '')}`];
    let lastError = null;
    for (const url of candidates) {
        try {
            const res = await fetch(url, { cache: 'no-store' });
            if (res.ok) return res.text();
            lastError = new Error(`HTTP ${res.status} for ${url}`);
        } catch (err) {
            lastError = err;
        }
    }
    throw lastError || new Error('Failed to load markdown');
}

export function renderMarkdown(mdText) {
    const markedRef = window.marked || (window.globalThis && window.globalThis.marked);
    if (!markedRef) return mdText;
    return markedRef.parse(mdText, { mangle: false, headerIds: true, gfm: true });
}

export function buildTocFromContainer(container) {
    const items = [];
    /** @type {{id:string,text:string,children:any[]} | null} */
    let currentH1 = null;
    const headers = container.querySelectorAll('h1, h2');
    headers.forEach((h) => {
        if (!h.id) {
            const slug = h.textContent
                .trim()
                .toLowerCase()
                .replace(/[^a-z0-9\s-]/g, '')
                .replace(/\s+/g, '-');
            h.id = slug;
        }
        const node = { id: h.id, text: h.textContent.trim(), children: [] };
        if (h.tagName.toLowerCase() === 'h1') {
            items.push(node);
            currentH1 = node;
        } else {
            if (currentH1) currentH1.children.push(node);
            else items.push(node);
        }
    });
    return items;
}

export function renderTocHtml(items) {
    const render = (nodes) =>
        `\n<ul class="toc-list">${nodes
            .map(
                (n) =>
                    `\n  <li><a href="#${n.id}" data-toc="1">${n.text}</a>${
                        n.children && n.children.length
                            ? `\n    <ul class=\"toc-sub\">${n.children
                                  .map((c) => `\n      <li><a href=\"#${c.id}\" data-toc=\"1\">${c.text}</a></li>`)
                                  .join('')}\n    </ul>`
                            : ''
                    }</li>`
            )
            .join('')}\n</ul>`;
    return render(items);
}

const PENDING_ANCHOR_KEY = 'arcana:pendingAnchor';

/**
 * Attach click behavior so markdown links don't navigate away
 * - In-page anchors (#id) scroll smoothly
 * - Relative .md links route to the SPA page and preserve anchor via sessionStorage
 * @param {HTMLElement} container
 * @param {string} currentRoute e.g. '/player' or '/gm'
 */
export function bindMarkdownLinks(container, currentRoute) {
    container.addEventListener('click', (e) => {
        const anchor = e.target?.closest && e.target.closest('a[href]');
        if (!anchor) return;
        const href = anchor.getAttribute('href');
        if (!href) return;

        // In-page anchors
        if (href.startsWith('#')) {
            e.preventDefault();
            const id = decodeURIComponent(href.slice(1));
            const target = container.querySelector(`#${CSS.escape(id)}`);
            if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
            return;
        }

        // External links: allow default
        if (/^https?:\/\//i.test(href)) return;

        // Relative markdown links
        if (/\.md(#[^\s]+)?$/i.test(href)) {
            e.preventDefault();
            const hashIndex = href.indexOf('#');
            const anchorId = hashIndex >= 0 ? href.substring(hashIndex + 1) : '';
            if (anchorId)
                try {
                    sessionStorage.setItem(PENDING_ANCHOR_KEY, anchorId);
                } catch (_) {}
            // naive route inference
            const route = href.toLowerCase().includes('gm')
                ? '/gm'
                : href.toLowerCase().includes('player')
                  ? '/player'
                  : currentRoute;
            location.hash = route; // let router render the page
            return;
        }

        // Other relative links: keep within current route
        if (!href.startsWith('/')) {
            e.preventDefault();
            location.hash = currentRoute;
        }
    });
}

/**
 * If a pending anchor exists (set by bindMarkdownLinks), scroll to it
 * Call after the markdown has been inserted into the DOM
 * @param {HTMLElement} container
 */
export function applyPendingAnchor(container) {
    try {
        const id = sessionStorage.getItem(PENDING_ANCHOR_KEY);
        if (!id) return;
        sessionStorage.removeItem(PENDING_ANCHOR_KEY);
        const target = container.querySelector(`#${CSS.escape(id)}`);
        if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } catch (_) {}
}
