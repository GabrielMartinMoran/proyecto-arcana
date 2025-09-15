const html = window.html || String.raw;

export function renderProgressTab(c) {
    return html`
        <div class="editor-grid one-col pp-tab">
            <div class="panel">
                <label>Estado</label>
                <div class="attrs">
                    <div class="pp-inline">
                        <div class="attr">
                            <span>PP actuales</span
                            ><strong class="${(Number(c.pp) || 0) < 0 ? 'pp-negative' : ''}">${c.pp || 0}</strong>
                        </div>
                        <div class="attr">
                            <span>PP gastados</span
                            ><strong>${(c.ppHistory || [])
                                .filter((x) => x && x.type === 'spend')
                                .reduce((sum, x) => sum + (Number(x.amount) || 0), 0)}</strong>
                        </div>
                    </div>
                </div>
            </div>
            <div class="panel">
                <label>Actualizar progreso</label>
                <div class="pp-inputs">
                    <div class="pp-qty">
                        <span>Cantidad</span>
                        <input type="number" id="pp-delta" min="1" step="1" value="1" />
                    </div>
                    <div class="pp-reason">
                        <span>Razón</span>
                        <input type="text" id="pp-reason" placeholder="Describe el motivo" />
                    </div>
                    <div class="pp-buttons">
                        <button class="button" id="pp-spend" title="Gastar">➖</button>
                        <button class="button" id="pp-add" title="Adquirir">➕</button>
                    </div>
                </div>
            </div>
            <div class="panel">
                <div class="panel-header">
                    <label style="margin:0;">Historial</label>
                </div>
                <div id="pp-history"></div>
            </div>
        </div>
    `;
}



