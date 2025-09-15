const html = window.html || String.raw;
import { ensureStyle } from '../../utils/style-utils.js';

export default function EmptyState(message = 'Sin datos') {
    ensureStyle('./src/components/EmptyState/EmptyState.css');
    return html`<div class="empty-state">${String(message)}</div>`;
}


