const html = window.html || String.raw;
import { ensureStyle } from '../../utils/style-utils.js';

/**
 * ModifiersList - editable list of modifiers
 * @param {HTMLElement} container
 * @param {{ items: Array<{field:string,mode:'add'|'set',expr:string,label?:string}>, allowedFields: string[], onChange: (items:any[])=>void }} props
 */
const ModifiersList = (container, props = {}) => {
    let state = {
        items: Array.isArray(props.items)
            ? props.items.map((m) => ({
                  field: String(m.field || ''),
                  mode: m.mode === 'set' ? 'set' : 'add',
                  expr: String(m.expr || ''),
                  label: String(m.label || ''),
              }))
            : [],
        allowedFields: Array.isArray(props.allowedFields) ? props.allowedFields.slice() : [],
        onChange: typeof props.onChange === 'function' ? props.onChange : () => {},
    };

    const render = () => html`
        <div class="modifiers-list">
            <div class="mods">
                ${state.items
                    .map(
                        (m, idx) =>
                            html`<div class="mod-row" data-idx="${idx}">
                                <select data-mod-field>
                                    ${state.allowedFields
                                        .map(
                                            (f) =>
                                                html`<option value="${f}" ${m.field === f ? 'selected' : ''}>
                                                    ${f}
                                                </option>`
                                        )
                                        .join('')}
                                </select>
                                <select data-mod-mode>
                                    <option value="add" ${m.mode !== 'set' ? 'selected' : ''}>+</option>
                                    <option value="set" ${m.mode === 'set' ? 'selected' : ''}>=</option>
                                </select>
                                <input
                                    type="text"
                                    data-mod-expr
                                    placeholder="expresion (e.g., 2, cuerpo*2)"
                                    value="${m.expr || ''}"
                                />
                                <input
                                    type="text"
                                    data-mod-label
                                    placeholder="Etiqueta (opcional)"
                                    value="${m.label || ''}"
                                />
                                <button class="button" data-mod-remove>Eliminar</button>
                            </div>`
                    )
                    .join('')}
                <div class="mods-actions">
                    <button class="button" data-mod-add title="Agregar modificador">➕ Agregar modificador</button>
                </div>
            </div>
        </div>
    `;

    const bind = () => {
        container.addEventListener('click', (e) => {
            const add = e.target && e.target.closest && e.target.closest('[data-mod-add]');
            const rem = e.target && e.target.closest && e.target.closest('[data-mod-remove]');
            if (add) {
                state.items.push({ field: state.allowedFields[0] || 'salud', mode: 'add', expr: '0', label: '' });
                setState({});
                state.onChange(state.items);
                return;
            }
            if (rem) {
                const row = rem.closest('.mod-row');
                const idx = Number(row && row.getAttribute('data-idx')) || 0;
                state.items.splice(idx, 1);
                setState({});
                state.onChange(state.items);
                return;
            }
        });
        container.querySelectorAll('.mod-row').forEach((row) => {
            const idx = Number(row.getAttribute('data-idx'));
            const fieldSel = row.querySelector('[data-mod-field]');
            const modeSel = row.querySelector('[data-mod-mode]');
            const exprInp = row.querySelector('[data-mod-expr]');
            const labelInp = row.querySelector('[data-mod-label]');
            if (fieldSel)
                fieldSel.addEventListener('change', (e) => {
                    if (state.items[idx]) state.items[idx].field = e.target.value;
                    state.onChange(state.items);
                });
            if (modeSel)
                modeSel.addEventListener('change', (e) => {
                    if (state.items[idx]) state.items[idx].mode = e.target.value === 'set' ? 'set' : 'add';
                    state.onChange(state.items);
                });
            if (exprInp)
                exprInp.addEventListener('input', (e) => {
                    if (state.items[idx]) state.items[idx].expr = e.target.value;
                    state.onChange(state.items);
                });
            if (labelInp)
                labelInp.addEventListener('input', (e) => {
                    if (state.items[idx]) state.items[idx].label = e.target.value;
                    state.onChange(state.items);
                });
        });
    };

    const setState = (partial) => {
        state = { ...state, ...partial };
        container.innerHTML = render();
        bind();
    };

    return {
        init: () => {
            ensureStyle('./src/components/ModifiersList/ModifiersList.css');
            setState({});
        },
        setState,
    };
};

export default ModifiersList;
