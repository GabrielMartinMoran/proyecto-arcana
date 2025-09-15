const html = window.html || String.raw;
import PanelHeader from '../../PanelHeader/PanelHeader.js';
import InlineStat from '../../InlineStat/InlineStat.js';

export function renderConfigTab(c, derived, allowedFields) {
    return html`
        <div class="editor-grid one-col">
            <div class="panel">
                ${PanelHeader({ title: 'Retrato' })}
                <div class="attrs">
                    <div class="attr">
                        <span>URL</span>
                        <input type="text" id="portrait-url" class="portrait-url-input" value="${
                            c.portraitUrl || ''
                        }" />
                    </div>
                </div>
            </div>
            <div class="panel">
                ${PanelHeader({ title: 'Listado de modificadores' })}
                <div id="mods-host"></div>
                <div class="config-vars-help">
                    <small>Variables disponibles: cuerpo, reflejos, mente, instinto, presencia, salud, velocidad, esquiva, mitigacion, ndMente, ndInstinto, suerteMax, pp, gold.</small>
                </div>
                <label>Valores actuales</label>
                <div class="config-summary">
                    ${InlineStat('Salud', derived.salud)}
                    ${InlineStat('Velocidad', derived.velocidad)}
                    ${InlineStat('Esquiva', derived.esquiva)}
                    ${InlineStat('Mitigación', derived.mitigacion)}
                    ${InlineStat('ND (Mente)', derived.ndMente)}
                    ${InlineStat('ND (Instinto)', derived.ndInstinto)}
                    ${InlineStat('Suerte máx.', derived.suerteMax)}
                </div>
            </div>
        </div>
    `;
}



