/**
 * Ensure a stylesheet is present once in the document head.
 * Accepts a relative href (as used in the codebase) and injects a <link> if missing.
 * Returns true if the stylesheet is present (already or after injection).
 */
export function ensureStyle(href) {
    if (!href) return false;
    const links = Array.from(document.querySelectorAll('link[rel="stylesheet"]'));
    const exists = links.some((l) => l.getAttribute('href') === href || (l.href && l.href.endsWith(href.replace(/^\.\//, ''))));
    if (exists) return true;
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = href;
    document.head.appendChild(link);
    return true;
}

/** Ensure multiple styles by calling ensureStyle for each href. */
export function ensureStyles(hrefs = []) {
    hrefs.forEach((h) => ensureStyle(h));
}


