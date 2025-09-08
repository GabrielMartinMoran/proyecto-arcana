const html = window.html || String.raw;

import ModalComponent from "../../components/ModalComponent/ModalComponent.js";
import { evalFormula, rollWithAdvantage } from "../../utils/dice-utils.js";

export function openRollModal(container, { attributeName, attributeValue, maxSuerte }, onResult) {
    const host = document.createElement('div');
    container.appendChild(host);
    const modal = ModalComponent(host, { title: `Tirada: ${attributeName}` });
    modal.init();

    const content = html`
        <div class="roll-modal">
            <div class="field">
                <label>Tipo de tirada</label>
                <select id="adv">
                    <option value="normal">Normal</option>
                    <option value="ventaja">Con ventaja</option>
                    <option value="desventaja">Con desventaja</option>
                </select>
            </div>
            <div class="field">
                <label>Modificadores extra (fórmulas y dados)</label>
                <input type="text" id="mods" placeholder="e.g., +2, 1d4, cuerpo*2" />
            </div>
            <div class="field">
                <label>Usar suerte (máx ${maxSuerte})</label>
                <input type="number" id="luck" min="0" max="${maxSuerte}" step="1" value="0" />
            </div>
            <div class="actions">
                <button class="button primary" id="do-roll">Tirar</button>
            </div>
            <div id="roll-result" class="result" style="margin-top: .5rem;"></div>
        </div>
    `;
    modal.open(content, `Tirada: ${attributeName}`);

    const advSel = host.querySelector('#adv');
    const modsInp = host.querySelector('#mods');
    const luckInp = host.querySelector('#luck');
    const rollBtn = host.querySelector('#do-roll');
    const resultEl = host.querySelector('#roll-result');

    rollBtn.addEventListener('click', () => {
        const advantage = advSel.value;
        const luck = Math.max(0, Math.min(Number(luckInp.value)||0, Number(maxSuerte)||0));
        const base = Number(attributeValue)||0;
        const d20 = rollWithAdvantage(base, advantage);
        const extras = evalFormula(modsInp.value || '0', { cuerpo:0, agilidad:0, mente:0, instinto:0, presencia:0 });
        const total = d20 + base + extras + luck;
        const breakdown = `d20=${d20}  |  atributo=${base}  |  mods=${extras}  |  suerte=${luck}`;
        resultEl.innerHTML = `<div class="total" title="${breakdown}">${total}</div>`;
        if (typeof onResult === 'function') onResult({ d20, base, extras, luck, total });
    });
}


