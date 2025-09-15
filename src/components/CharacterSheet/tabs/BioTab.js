const html = window.html || String.raw;
import PanelHeader from '../../PanelHeader/PanelHeader.js';

export function renderBioTab(c, opts = {}) {
    const readOnly = !!opts.readOnly;
    return html`
        <div class="editor-grid one-col">
            <div class="panel">
                ${PanelHeader({ title: 'Retrato' })}
                <div class="portrait-wrap"><div id="portrait-mount"></div></div>
            </div>
            <div class="panel">
                ${PanelHeader({ title: 'Historia' })}
                ${readOnly
                    ? html`<div class="bio-content">${c.bio || ''}</div>`
                    : html`<textarea id="bio-text" rows="10">${c.bio || ''}</textarea>`}
            </div>
        </div>
    `;
}



