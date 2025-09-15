/**
 * Mount an <img> inside container with safe fallback on error.
 * - Hides broken image
 * - Adds a placeholder element with provided text
 * - Applies referrerpolicy="no-referrer"
 *
 * @param {HTMLElement} container - Wrapper element where the image will be placed
 * @param {{ src: string, alt?: string, className?: string, placeholderText?: string }} opts
 */
export function mountImageWithFallback(container, opts = {}) {
    if (!container) return;
    const { src, alt = '', className = '', placeholderText = 'Sin retrato' } = opts;
    container.innerHTML = '';
    if (!src) {
        const ph = document.createElement('div');
        ph.className = 'portrait-placeholder';
        ph.textContent = placeholderText;
        container.appendChild(ph);
        return;
    }
    const img = document.createElement('img');
    if (className) img.className = className;
    img.src = src;
    img.alt = alt;
    img.referrerPolicy = 'no-referrer';
    img.addEventListener('error', () => {
        img.style.display = 'none';
        const ph = document.createElement('div');
        ph.className = 'portrait-placeholder';
        ph.textContent = placeholderText;
        container.appendChild(ph);
    });
    container.appendChild(img);
}


