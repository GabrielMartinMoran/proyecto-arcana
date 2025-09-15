const html = window.html || String.raw;
import { ensureStyle } from '../../utils/style-utils.js';

/**
 * InlineStat - renders a name/value pair in a compact inline row
 * @param {string} name
 * @param {string|number} value
 */
export default function InlineStat(name, value) {
    ensureStyle('./src/components/InlineStat/InlineStat.css');
    return html`<div class="inline-stat"><span>${String(name)}</span><strong>${String(value)}</strong></div>`;
}
