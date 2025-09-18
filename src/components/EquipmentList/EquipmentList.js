const html = window.html || String.raw;
import { ensureStyle } from '../../utils/style-utils.js';
import DebugUtils from '../../utils/debug-utils.js';

/**
 * EquipmentList - interactive list of equipment items
 * @param {HTMLElement} container
 * @param {{ items: Array<{qty:number,name:string,notes:string}>, readOnly?:boolean, onChange: (items:any[])=>void }} props
 */
const EquipmentList = (container, props = {}) => {
    let state = {
        items: Array.isArray(props.items)
            ? props.items.map((x) => ({
                  qty: Number(x.qty) || 0,
                  name: String(x.name || ''),
                  notes: String(x.notes || ''),
              }))
            : [],
        readOnly: !!props.readOnly,
        onChange: typeof props.onChange === 'function' ? props.onChange : () => {},
    };
    // Suppression flag: when true, input/change handlers won't call parent onChange.
    // This is used to avoid notification loops when the parent programmatically updates
    // the list via setState (e.g., SheetTab.updateCharacter -> mountedComponents.equipment.setState).
    let suppressNotify = false;

    const render = () => html`
        <div class="equip-list ${state.readOnly ? 'readonly' : ''}">
            ${state.items
                .map(
                    (it, idx) =>
                        html`<div class="equip-row ${state.readOnly ? 'readonly' : ''}" data-eq-idx="${idx}">
                            <input
                                type="number"
                                min="0"
                                step="1"
                                data-eq-qty
                                value="${Number(it.qty) || 0}"
                                ${state.readOnly ? 'disabled' : ''}
                            />
                            <input
                                type="text"
                                data-eq-name
                                placeholder="Nombre"
                                value="${it.name || ''}"
                                ${state.readOnly ? 'disabled' : ''}
                            />
                            <input
                                type="text"
                                data-eq-notes
                                placeholder="Notas"
                                value="${it.notes || ''}"
                                ${state.readOnly ? 'disabled' : ''}
                            />
                            ${state.readOnly
                                ? ''
                                : '<button class="button" data-eq-remove title="Eliminar">🗑️</button>'}
                        </div>`
                )
                .join('')}
            ${state.readOnly
                ? ''
                : '<div style="display:flex; justify-content:flex-end;"><button class="button" data-eq-add>Añadir ítem</button></div>'}
        </div>
    `;

    // Delegated event handlers to avoid per-row listeners and prevent re-renders while typing.
    // We update state.items in-place for input events and only re-render when the list
    // structure changes (add/remove) so the focused input is not lost.
    const handleClick = (e) => {
        const add = e.target && e.target.closest && e.target.closest('[data-eq-add]');
        const rem = e.target && e.target.closest && e.target.closest('[data-eq-remove]');
        if (add) {
            state.items.push({ qty: 1, name: '', notes: '' });
            // Re-render to add the new row and rebind delegated handlers
            setState({});
            try {
                DebugUtils.logRender('EquipmentList.change', { action: 'add', count: state.items.length });
            } catch (_) {}
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
            // Re-render to remove the row and rebind delegated handlers
            setState({});
            try {
                DebugUtils.logRender('EquipmentList.change', { action: 'remove', idx, count: state.items.length });
            } catch (_) {}
            state.onChange(state.items);
            return;
        }
    };

    const handleInput = (e) => {
        // If suppression is active we must not notify parent or act on input events,
        // because those may be triggered by our own DOM updates and can cause loops.
        if (suppressNotify) return;

        const target = e.target;
        if (!target) return;
        const row = target.closest && target.closest('.equip-row');
        const idx = Number(row && row.getAttribute('data-eq-idx')) || 0;
        if (idx == null || !state.items[idx]) return;

        // Distinguish between 'input' (typing) and 'change' (commit) events.
        const isChangeEvent = e.type === 'change';

        if (target.hasAttribute && target.hasAttribute('data-eq-qty')) {
            const v = Math.max(0, Number(target.value) || 0);
            if (state.items[idx]) state.items[idx].qty = v;
            // Notify parent only on commit (change) to avoid update loops while typing
            if (isChangeEvent) {
                try {
                    DebugUtils.logRender('EquipmentList.change', { action: 'edit-qty', idx, value: v });
                } catch (_) {}
                state.onChange(state.items);
            }
            return;
        }

        if (target.hasAttribute && target.hasAttribute('data-eq-name')) {
            if (state.items[idx]) state.items[idx].name = target.value;
            if (isChangeEvent) {
                try {
                    DebugUtils.logRender('EquipmentList.change', { action: 'edit-name', idx, value: target.value });
                } catch (_) {}
                state.onChange(state.items);
            }
            return;
        }

        if (target.hasAttribute && target.hasAttribute('data-eq-notes')) {
            if (state.items[idx]) state.items[idx].notes = target.value;
            if (isChangeEvent) {
                try {
                    DebugUtils.logRender('EquipmentList.change', { action: 'edit-notes', idx, value: target.value });
                } catch (_) {}
                state.onChange(state.items);
            }
            return;
        }
    };

    const bind = () => {
        if (state.readOnly) return;

        // Remove previous delegated listeners to avoid duplicates
        try {
            container.removeEventListener('click', handleClick);
            container.removeEventListener('input', handleInput);
            container.removeEventListener('change', handleInput);
        } catch (_) {}

        // Add delegated listeners (single per container)
        container.addEventListener('click', handleClick);
        // Use both input and change to capture typing and commit events for number inputs
        container.addEventListener('input', handleInput);
        container.addEventListener('change', handleInput);
    };

    const setState = (partial) => {
        // Preserve previous DOM row count to decide whether a full re-render is necessary.
        const prevRows = container ? container.querySelectorAll('.equip-row').length : 0;

        // Merge new state
        state = { ...state, ...partial };

        // Log this render call for diagnostics (no-op unless debug enabled)
        try {
            DebugUtils.logRender('EquipmentList.setState', { itemsCount: state.items.length, prevRows });
        } catch (_) {}

        // Suppress notifications while we patch the DOM to avoid spurious 'change' events
        // triggering parent updates (which can cause a notification loop).
        suppressNotify = true;
        try {
            // If the number of rows hasn't changed, update inputs in-place to preserve focus.
            // This avoids replacing the DOM for every keystroke and keeps the caret position.
            if (container && prevRows === state.items.length && prevRows > 0) {
                try {
                    // Capture active element info if it's inside the container so we can restore selection if needed.
                    const active = document.activeElement;
                    let activeInfo = null;
                    if (active && container.contains(active)) {
                        const rowEl = active.closest && active.closest('.equip-row');
                        if (rowEl) {
                            activeInfo = {
                                tag: active.tagName,
                                type: active.getAttribute('data-eq-qty')
                                    ? 'qty'
                                    : active.getAttribute('data-eq-name')
                                      ? 'name'
                                      : active.getAttribute('data-eq-notes')
                                        ? 'notes'
                                        : null,
                                idx: Number(rowEl.getAttribute('data-eq-idx')),
                                selectionStart: active.selectionStart,
                                selectionEnd: active.selectionEnd,
                                value: active.value,
                            };
                        }
                    }

                    // Patch each visible row's inputs only when values differ.
                    for (let idx = 0; idx < state.items.length; idx++) {
                        const it = state.items[idx];
                        const row = container.querySelector(`.equip-row[data-eq-idx="${idx}"]`);
                        if (!row) continue;
                        const qty = row.querySelector('[data-eq-qty]');
                        const name = row.querySelector('[data-eq-name]');
                        const notes = row.querySelector('[data-eq-notes]');

                        if (qty && String(qty.value) !== String(it.qty)) qty.value = Number(it.qty) || 0;
                        if (name && name.value !== (it.name || '')) name.value = it.name || '';
                        if (notes && notes.value !== (it.notes || '')) notes.value = it.notes || '';
                    }

                    // Update visual badge counter if present
                    try {
                        const info = container && container.__equipDebug;
                        if (DebugUtils.isEnabled() && info) DebugUtils.countRender(info, 1);
                    } catch (_) {}

                    // Restore selection on the active element if needed (preserve caret)
                    if (activeInfo) {
                        try {
                            const rowEl = container.querySelector(`.equip-row[data-eq-idx="${activeInfo.idx}"]`);
                            if (rowEl) {
                                let selector = '[data-eq-name]';
                                if (activeInfo.type === 'qty') selector = '[data-eq-qty]';
                                else if (activeInfo.type === 'notes') selector = '[data-eq-notes]';
                                const el = rowEl.querySelector(selector);
                                if (el) {
                                    el.focus();
                                    if (
                                        typeof activeInfo.selectionStart === 'number' &&
                                        typeof el.setSelectionRange === 'function'
                                    ) {
                                        const start = Math.min(activeInfo.selectionStart, (el.value || '').length);
                                        const end = Math.min(activeInfo.selectionEnd || start, (el.value || '').length);
                                        el.setSelectionRange(start, end);
                                    }
                                }
                            }
                        } catch (_) {}
                    }

                    // Values updated in-place; do NOT notify parent on every keystroke to avoid update loops.
                    // Parent will be notified on the 'change' event (commit) instead.
                    return;
                } catch (err) {
                    // If something unexpected happens, fall back to full render below
                }
            }

            // Otherwise perform a full render (structure changed or initial render).
            // Instrument the actual render so we can measure time when debugging
            if (DebugUtils.isEnabled()) {
                try {
                    DebugUtils.instrumentRender(
                        'EquipmentList.render',
                        () => {
                            container.innerHTML = render();
                            bind();
                        },
                        { phase: 'render' }
                    );
                } catch (e) {
                    // fallback
                    container.innerHTML = render();
                    bind();
                }
            } else {
                container.innerHTML = render();
                bind();
            }

            // Update visual badge counter if present
            try {
                const info = container && container.__equipDebug;
                if (DebugUtils.isEnabled() && info) DebugUtils.countRender(info, 1);
            } catch (_) {}
        } finally {
            // Always re-enable notifications after DOM patches are done
            suppressNotify = false;
        }
    };

    return {
        init: () => {
            ensureStyle('./src/components/EquipmentList/EquipmentList.css');
            try {
                DebugUtils.logRender('EquipmentList.init');
                if (DebugUtils.isEnabled()) {
                    // attach a small visual badge to help debugging renders
                    const info = DebugUtils.addRenderCounterBadge(container, 'equip-renders');
                    // store on container for later increments
                    container.__equipDebug = info;
                }
            } catch (_) {}
            setState({});
        },
        setState,
    };
};

export default EquipmentList;
