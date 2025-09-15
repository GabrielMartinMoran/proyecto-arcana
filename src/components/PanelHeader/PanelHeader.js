const html = window.html || String.raw;
import { ensureStyle } from '../../utils/style-utils.js';

/**
 * PanelHeader - title with right-aligned actions slot
 * @param {{ title: string, actionsHtml?: string }} props
 */
export default function PanelHeader(props = {}) {
    ensureStyle('./src/components/PanelHeader/PanelHeader.css');
    const title = String(props.title || '');
    const actions = String(props.actionsHtml || '');
    return html`<div class="panel-header">
        <label style="margin:0;">${title}</label>
        <div class="panel-header-actions">${actions}</div>
    </div>`;
}


