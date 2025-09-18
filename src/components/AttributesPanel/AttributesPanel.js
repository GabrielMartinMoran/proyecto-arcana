const html = window.html || String.raw;
import { ensureStyle } from '../../utils/style-utils.js';

/**
 * AttributesPanel - editable attribute grid with roll buttons
 * @param {HTMLElement} container
 * @param {{ attributes: Record<string, number>, rules: any, suerte:number, suerteMax:number, readOnly?:boolean, onChange:(key:string,val:number)=>void, onRoll:(key:string)=>void, onLuckChange:(newLuck:number)=>void }} props
 */
const AttributesPanel = (container, props = {}) => {
    let state = {
        attributes: props.attributes || {},
        rules: props.rules || { attributeMin: 1, attributeMax: 6 },
        suerte: Number(props.suerte) || 0,
        suerteMax: Number(props.suerteMax) || 0,
        readOnly: !!props.readOnly,
        onChange: typeof props.onChange === 'function' ? props.onChange : () => {},
        onRoll: typeof props.onRoll === 'function' ? props.onRoll : () => {},
        onLuckChange: typeof props.onLuckChange === 'function' ? props.onLuckChange : () => {},
    };

    const render = () => html`
        <div class="attributes-panel">
            <div class="attrs">
                ${Object.entries(state.attributes)
                    .map(
                        ([k, v]) =>
                            html`<div class="attr">
                                <span>${k}</span>
                                <input
                                    type="number"
                                    min="${state.rules.attributeMin}"
                                    max="${state.rules.attributeMax}"
                                    step="1"
                                    data-attr="${k}"
                                    value="${v}"
                                    ${state.readOnly ? 'disabled' : ''}
                                />
                                <button class="button" data-roll-attr="${k}" title="Tirar">🎲</button>
                            </div>`
                    )
                    .join('')}
                <div class="attr">
                    <span>Suerte</span>
                    <div class="hp-wrap">
                        <input
                            type="number"
                            id="suerte"
                            data-max="${state.suerteMax}"
                            min="0"
                            step="1"
                            value="${state.suerte}"
                            ${state.readOnly ? 'disabled' : ''}
                        />
                        / <strong>${state.suerteMax}</strong>
                    </div>
                </div>
            </div>
        </div>
    `;

    const bind = () => {
        if (!state.readOnly)
            container.querySelectorAll('input[data-attr]').forEach((inp) =>
                inp.addEventListener('change', (e) => {
                    const key = e.target.getAttribute('data-attr');
                    const val = Math.max(
                        state.rules.attributeMin,
                        Math.min(state.rules.attributeMax, Number(e.target.value) || state.rules.attributeMin)
                    );
                    state.onChange(key, val);
                })
            );
        container.querySelectorAll('[data-roll-attr]').forEach((btn) =>
            btn.addEventListener('click', () => {
                const key = btn.getAttribute('data-roll-attr');
                state.onRoll(key);
            })
        );
        if (!state.readOnly) {
            const luck = container.querySelector('#suerte');
            if (luck)
                luck.addEventListener('change', (e) => {
                    const max = Number(e.target.getAttribute('data-max')) || Infinity;
                    const val = Math.max(0, Math.min(Number(e.target.value) || 0, max));
                    state.onLuckChange(val);
                });
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
            ensureStyle('./src/components/AttributesPanel/AttributesPanel.css');
            setState({});
        },
        setState,
    };
};

export default AttributesPanel;
