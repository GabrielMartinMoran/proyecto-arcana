const html = window.html || String.raw;
import { ensureStyle } from '../../utils/style-utils.js';

/**
 * EquipmentList - interactive list of equipment items
 * @param {HTMLElement} container
 * @param {{ items: Array<{qty:number,name:string,notes:string}>, readOnly?:boolean, onChange: (items:any[])=>void }} props
 */
const EquipmentList = (container, props = {}) => {
    let state = {
        items: Array.isArray(props.items) ? props.items.map((x) => ({ qty: Number(x.qty)||0, name: String(x.name||''), notes: String(x.notes||'') })) : [],
        readOnly: !!props.readOnly,
        onChange: typeof props.onChange === 'function' ? props.onChange : () => {},
    };

    const render = () => html`
        <div class="equip-list ${state.readOnly ? 'readonly' : ''}">
            ${state.items
                .map(
                    (it, idx) => html`<div class="equip-row ${state.readOnly ? 'readonly' : ''}" data-eq-idx="${idx}">
                        <input type="number" min="0" step="1" data-eq-qty value="${Number(it.qty) || 0}" ${state.readOnly ? 'disabled' : ''} />
                        <input type="text" data-eq-name placeholder="Nombre" value="${it.name || ''}" ${state.readOnly ? 'disabled' : ''} />
                        <input type="text" data-eq-notes placeholder="Notas" value="${it.notes || ''}" ${state.readOnly ? 'disabled' : ''} />
                        ${state.readOnly ? '' : '<button class="button" data-eq-remove title="Eliminar">🗑️</button>'}
                    </div>`
                )
                .join('')}
            ${state.readOnly ? '' : '<div style="display:flex; justify-content:flex-end;"><button class="button" data-eq-add>Añadir ítem</button></div>'}
        </div>
    `;

    const bind = () => {
        if (state.readOnly) return;
        container.addEventListener('click', (e) => {
            const add = e.target && e.target.closest && e.target.closest('[data-eq-add]');
            const rem = e.target && e.target.closest && e.target.closest('[data-eq-remove]');
            if (add) {
                state.items.push({ qty: 1, name: '', notes: '' });
                setState({});
                state.onChange(state.items);
                return;
            }
            if (rem) {
                const row = rem.closest('.equip-row');
                const idx = Number(row && row.getAttribute('data-eq-idx')) || 0;
                const item = state.items[idx];
                const label = item && item.name ? `"${item.name}"` : 'este ítem';
                const ok = window.confirm(`¿Eliminar ${label}?`);
                if (!ok) return;
                state.items.splice(idx, 1);
                setState({});
                state.onChange(state.items);
                return;
            }
        });
        container.querySelectorAll('.equip-row').forEach((row) => {
            const idx = Number(row.getAttribute('data-eq-idx'));
            const qty = row.querySelector('[data-eq-qty]');
            const name = row.querySelector('[data-eq-name]');
            const notes = row.querySelector('[data-eq-notes]');
            if (qty && !state.readOnly)
                qty.addEventListener('change', (e) => {
                    const v = Math.max(0, Number(e.target.value) || 0);
                    if (state.items[idx]) state.items[idx].qty = v;
                    state.onChange(state.items);
                });
            if (name && !state.readOnly)
                name.addEventListener('input', (e) => {
                    if (state.items[idx]) state.items[idx].name = e.target.value;
                    state.onChange(state.items);
                });
            if (notes && !state.readOnly)
                notes.addEventListener('input', (e) => {
                    if (state.items[idx]) state.items[idx].notes = e.target.value;
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
            ensureStyle('./src/components/EquipmentList/EquipmentList.css');
            setState({});
        },
        setState,
    };
};

export default EquipmentList;
