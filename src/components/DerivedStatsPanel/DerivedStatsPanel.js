const html = window.html || String.raw;
import { ensureStyle } from '../../utils/style-utils.js';

/**
 * DerivedStatsPanel - read-only derived stats panel with HP and Temp HP inputs
 * @param {HTMLElement} container
 * @param {{ derived: {salud:number, velocidad:number, esquiva:number, mitigacion:number, ndMente:number, ndInstinto:number}, hp:number, tempHp:number, readOnly?:boolean, onHpChange:(hp:number)=>void, onTempHpChange:(hp:number)=>void }} props
 */
const DerivedStatsPanel = (container, props = {}) => {
    let state = {
        derived: props.derived || {},
        hp: Number(props.hp) || 0,
        tempHp: Number(props.tempHp) || 0,
        readOnly: !!props.readOnly,
        onHpChange: typeof props.onHpChange === 'function' ? props.onHpChange : () => {},
        onTempHpChange: typeof props.onTempHpChange === 'function' ? props.onTempHpChange : () => {},
    };

    const render = () => html`
        <div class="derived-stats-panel">
            <div class="attrs attrs-deriv">
                <div class="attr">
                    <span>Salud</span>
                    <div class="hp-wrap">
                        <input
                            type="number"
                            id="hp"
                            min="0"
                            step="1"
                            value="${state.hp}"
                            ${state.readOnly ? 'disabled' : ''}
                        />
                        /
                        <strong>${state.derived.salud}</strong>
                    </div>
                </div>
                <div class="attr">
                    <span>Salud temporal</span
                    ><input
                        type="number"
                        id="temp-hp"
                        min="0"
                        step="1"
                        value="${state.tempHp}"
                        ${state.readOnly ? 'disabled' : ''}
                    />
                </div>
                <div class="attr"><span>Velocidad</span><strong>${state.derived.velocidad}</strong></div>
                <div class="attr"><span>Esquiva</span><strong>${state.derived.esquiva}</strong></div>
                <div class="attr"><span>Mitigación</span><strong>${state.derived.mitigacion}</strong></div>
                <div class="nd-spells">
                    <div class="attr" style="grid-column:1 / -1; padding-top:.25rem;">
                        <strong>ND de Conjuro</strong>
                    </div>
                    <div class="attr child"><span>ND (Mente)</span><strong>${state.derived.ndMente}</strong></div>
                    <div class="attr child"><span>ND (Instinto)</span><strong>${state.derived.ndInstinto}</strong></div>
                </div>
            </div>
        </div>
    `;

    const bind = () => {
        if (!state.readOnly) {
            const hp = container.querySelector('#hp');
            const temp = container.querySelector('#temp-hp');
            if (hp) hp.addEventListener('change', (e) => state.onHpChange(Math.max(0, Number(e.target.value) || 0)));
            if (temp)
                temp.addEventListener('change', (e) => state.onTempHpChange(Math.max(0, Number(e.target.value) || 0)));
        }
    };

    const setState = (partial) => {
        state = { ...state, ...partial };
        // Always update to ensure components are properly rendered
        container.innerHTML = render();
        bind();
    };

    return {
        init: () => {
            ensureStyle('./src/components/DerivedStatsPanel/DerivedStatsPanel.css');
            setState({});
        },
        setState,
    };
};

export default DerivedStatsPanel;
