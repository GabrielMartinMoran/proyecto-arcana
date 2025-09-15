const html = window.html || String.raw;

export function renderDiceTab() {
    return html`
        <div class="editor-grid one-col dice-tab">
            <div class="panel">
                <label>Tirar dados</label>
                <div class="dice-section">
                    <label>Rápido</label>
                    <div class="dice-quick">
                        <button class="button" data-dice="1d4">d4</button>
                        <button class="button" data-dice="1d6">d6</button>
                        <button class="button" data-dice="1d8">d8</button>
                        <button class="button" data-dice="1d10">d10</button>
                        <button class="button" data-dice="1d20">d20</button>
                        <button class="button" data-dice="1d100">d100</button>
                    </div>
                </div>
                <div class="dice-section">
                    <label>Personalizado</label>
                    <div class="dice-custom">
                        <input type="number" id="dice-n" min="1" step="1" placeholder="N" />
                        <span>d</span>
                        <input type="number" id="dice-f" min="2" step="1" placeholder="M" />
                        <button class="button" id="dice-roll">Tirar</button>
                    </div>
                </div>
            </div>
            <div class="panel">
                <div class="panel-header">
                    <label style="margin:0;">Historial</label>
                    <button class="button" data-dice-clear>Limpiar historial</button>
                </div>
                <div id="dice-history"></div>
            </div>
        </div>
    `;
}



