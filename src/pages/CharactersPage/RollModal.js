const html = window.html || String.raw;

import ModalComponent from '../../components/ModalComponent/ModalComponent.js';
import { evalFormula, rollDice } from '../../utils/dice-utils.js';
import { ensureStyle } from '../../utils/style-utils.js';

export function openRollModal(container, { attributeName, attributeValue, maxSuerte, currentSuerte }, onResult) {
    // Load modal styles
    ensureStyle('./src/pages/CharactersPage/RollModal.css');
    
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
                <label>Tienes ${currentSuerte || 0} puntos de suerte</label>
                <input type="number" id="luck" min="0" max="${currentSuerte || 0}" step="1" value="0" />
            </div>
            <div class="actions">
                <button class="button primary full-width" id="do-roll" title="Tirar">🎲 Tirar</button>
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
        const luck = Math.max(0, Math.min(Number(luckInp.value) || 0, Number(currentSuerte) || 0));
        const base = Number(attributeValue) || 0;
        const d6 = rollDice('1d6');
        let advMod = 0;
        if (advantage === 'ventaja') advMod = rollDice('1d4');
        else if (advantage === 'desventaja') advMod = -rollDice('1d4');
        const extras = evalFormula(modsInp.value || '0', {
            cuerpo: 0,
            reflejos: 0,
            mente: 0,
            instinto: 0,
            presencia: 0,
        });
        const die = d6 + (advMod || 0);
        const total = die + base + extras + luck;
        
        // Call result callback immediately
        if (typeof onResult === 'function') onResult({ d6, advMod, advantage, base, extras, luck, total });
        
        // Close modal automatically
        modal.close();
    });
}
