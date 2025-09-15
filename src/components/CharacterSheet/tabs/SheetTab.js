const html = window.html || String.raw;
import PanelHeader from '../../PanelHeader/PanelHeader.js';

export function renderSheetTab(c, derived, RULES, opts = {}) {
    const readOnly = !!opts.readOnly;
    return html`
        <div class="editor-grid">
            <div class="panel">
                ${PanelHeader({ title: 'Atributos' })}
                <div id="attributes-host" data-readonly="${readOnly ? '1' : '0'}"></div>
            </div>
            <div class="panel">
                ${PanelHeader({ title: 'Derivados' })}
                <div id="derived-host" data-readonly="${readOnly ? '1' : '0'}"></div>
            </div>
            <div class="panel">
                ${PanelHeader({ title: 'Economía' })}
                <div class="attrs">
                    <div class="attr">
                        <span>Oro</span><input class="long-input" type="number" id="gold" min="0" step="1" value="${
        c.gold || 0
    }" ${readOnly ? 'disabled' : ''} />
                    </div>
                </div>
            </div>
            <div class="panel">
                ${PanelHeader({ title: 'Lenguas' })}
                <input id="languages" type="text" class="languages-input" value="${c.languages || ''}" ${
        readOnly ? 'disabled' : ''
    } />
            </div>
            <div class="panel">
                ${PanelHeader({ title: 'Equipo' })}
                <div id="equip-list" data-readonly="${readOnly ? '1' : '0'}"></div>
            </div>
        </div>
    `;
}



