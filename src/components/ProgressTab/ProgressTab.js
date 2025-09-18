const html = window.html || String.raw;
import { ensureStyle } from '../../utils/style-utils.js';
import DebugUtils from '../../utils/debug-utils.js';

/**
 * ProgressTab - Component for progress points management
 * @param {HTMLElement} container
 * @param {{ character: Object, onUpdate: Function }} props
 */
const ProgressTab = (container, props = {}) => {
    let state = {
        character: props.character || {},
        onUpdate: typeof props.onUpdate === 'function' ? props.onUpdate : () => {},
    };

    const render = () => {
        const c = state.character;
        const ppSpent = (c.ppHistory || [])
            .filter((x) => x && x.type === 'spend')
            .reduce((sum, x) => sum + Math.abs(Number(x.amount) || 0), 0);

        return html`
            <div class="editor-grid two-col pp-tab">
                <div class="panel">
                    <label>Estado</label>
                    <div class="pp-status">
                        <div class="pp-current">
                            <span>PP actuales</span>
                            <strong class="${(Number(c.pp) || 0) < 0 ? 'pp-negative' : ''}">${c.pp || 0}</strong>
                        </div>
                        <div class="pp-spent">
                            <span>PP gastados</span>
                            <strong class="${ppSpent < 0 ? 'pp-negative' : ''}">${ppSpent}</strong>
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
                            <button class="button" id="pp-spend" title="Gastar">-</button>
                            <button class="button" id="pp-add" title="Adquirir">+</button>
                        </div>
                    </div>
                </div>
                <div class="panel pp-history-panel">
                    <div class="panel-header">
                        <label style="margin:0;">Historial</label>
                    </div>
                    <div id="pp-history"></div>
                </div>
            </div>
        `;
    };

    const bindEvents = () => {
        if (!container) return;

        // Remove any previously attached direct button handlers (idempotent)
        try {
            if (container.__ppSpendHandler) {
                const prev = container.querySelector('#pp-spend');
                if (prev && container.__ppSpendHandler) prev.removeEventListener('click', container.__ppSpendHandler);
            }
        } catch (_) {}
        try {
            if (container.__ppAddHandler) {
                const prev = container.querySelector('#pp-add');
                if (prev && container.__ppAddHandler) prev.removeEventListener('click', container.__ppAddHandler);
            }
        } catch (_) {}

        // Attach direct handlers to the add/spend buttons for reliable clicks
        try {
            const spendBtn = container.querySelector('#pp-spend');
            const addBtn = container.querySelector('#pp-add');

            const spendHandler = (ev) => {
                ev && ev.stopPropagation && ev.stopPropagation();
                try {
                    DebugUtils.logRender('ProgressTab.click', { action: 'spend' });
                } catch (_) {}
                handleSpend();
            };
            const addHandler = (ev) => {
                ev && ev.stopPropagation && ev.stopPropagation();
                try {
                    DebugUtils.logRender('ProgressTab.click', { action: 'add' });
                } catch (_) {}
                handleAdd();
            };

            if (spendBtn) {
                spendBtn.addEventListener('click', spendHandler);
                container.__ppSpendHandler = spendHandler;
            }
            if (addBtn) {
                addBtn.addEventListener('click', addHandler);
                container.__ppAddHandler = addHandler;
            }
        } catch (_) {}

        // Delegate rollback clicks inside history container (single delegated listener)
        try {
            // remove previous if any
            if (container.__ppHistoryHandler) {
                container.removeEventListener('click', container.__ppHistoryHandler);
            }
        } catch (_) {}
        const historyHandler = (e) => {
            const target = e.target;
            if (!target) return;
            const btn = (target.closest && target.closest('[data-rollback-index]')) || null;
            if (!btn) return;
            const index = parseInt(btn.getAttribute('data-rollback-index'));
            if (Number.isFinite(index)) {
                try {
                    DebugUtils.logRender('ProgressTab.click', { action: 'rollback', index });
                } catch (_) {}
                handleRollback(index);
            }
        };
        container.__ppHistoryHandler = historyHandler;
        container.addEventListener('click', historyHandler);

        // Simple input listener for potential validation (no heavy logic here)
        try {
            if (container.__ppInputHandler) container.removeEventListener('input', container.__ppInputHandler);
        } catch (_) {}
        const inputHandler = (e) => {
            const id = e.target && e.target.id;
            if (id === 'pp-delta' || id === 'pp-reason') {
                try {
                    DebugUtils.logRender('ProgressTab.input', { id });
                } catch (_) {}
            }
        };
        container.__ppInputHandler = inputHandler;
        container.addEventListener('input', inputHandler);
    };

    const handleSpend = () => {
        const deltaInput = container.querySelector('#pp-delta');
        const reasonInput = container.querySelector('#pp-reason');

        if (!deltaInput || !reasonInput) return;

        // Debug entry
        try {
            console.debug &&
                console.debug('ProgressTab.handleSpend invoked', {
                    delta: deltaInput.value,
                    reason: (reasonInput.value || '').trim(),
                });
            DebugUtils.logRender('ProgressTab.handler', { handler: 'spend' });
        } catch (_) {}

        const amount = Number(deltaInput.value) || 1;
        const reason = reasonInput.value.trim() || 'Sin motivo especificado';

        if (amount <= 0) return;

        const newEntry = {
            type: 'spend',
            amount: -amount,
            reason,
            timestamp: new Date().toISOString(),
        };

        const updatedCharacter = {
            ...state.character,
            pp: (Number(state.character.pp) || 0) - amount,
            ppHistory: [...(state.character.ppHistory || []), newEntry],
        };

        // Update local state and UI first (so the user sees immediate feedback)
        try {
            state.character = { ...updatedCharacter };
            // Update PP current display
            const ppCurrentEl = container.querySelector('.pp-current strong');
            if (ppCurrentEl) {
                ppCurrentEl.textContent = String(state.character.pp || 0);
                try {
                    if (Number(state.character.pp) < 0) ppCurrentEl.classList.add('pp-negative');
                    else ppCurrentEl.classList.remove('pp-negative');
                } catch (_) {}
            }
            // Re-render history panel
            renderHistory();
            // Update PP spent display
            try {
                const ppSpentEl = container.querySelector('.pp-spent strong');
                if (ppSpentEl) {
                    const ppSpent = (state.character.ppHistory || [])
                        .filter((x) => x && x.type === 'spend')
                        .reduce((sum, x) => sum + Math.abs(Number(x.amount) || 0), 0);
                    ppSpentEl.textContent = String(ppSpent);
                }
            } catch (_) {}
        } catch (_) {}

        // Notify parent and persist via both onUpdate and global event
        try {
            if (DebugUtils.isEnabled()) {
                DebugUtils.instrumentRender('ProgressTab.applySpend', () => state.onUpdate(updatedCharacter), {
                    amount,
                });
            } else {
                state.onUpdate(updatedCharacter);
            }
        } catch (_) {
            try {
                state.onUpdate(updatedCharacter);
            } catch (_) {}
        }

        try {
            DebugUtils.logRender('ProgressTab.spend', { amount });
        } catch (_) {}

        // Dispatch a global save event so the page can persist this change without causing re-entrant updates
        try {
            const evt = new CustomEvent('arcana:save', {
                detail: { id: state.character && state.character.id ? state.character.id : null, updatedCharacter },
            });
            window.dispatchEvent(evt);
        } catch (_) {}

        // Clear inputs
        deltaInput.value = '1';
        reasonInput.value = '';
    };

    const handleAdd = () => {
        const deltaInput = container.querySelector('#pp-delta');
        const reasonInput = container.querySelector('#pp-reason');

        if (!deltaInput || !reasonInput) return;

        // Debug entry
        try {
            console.debug &&
                console.debug('ProgressTab.handleAdd invoked', {
                    delta: deltaInput.value,
                    reason: (reasonInput.value || '').trim(),
                });
            DebugUtils.logRender('ProgressTab.handler', { handler: 'add' });
        } catch (_) {}

        const amount = Number(deltaInput.value) || 1;
        const reason = reasonInput.value.trim() || 'Sin motivo especificado';

        if (amount <= 0) return;

        const newEntry = {
            type: 'add',
            amount: amount,
            reason,
            timestamp: new Date().toISOString(),
        };

        const updatedCharacter = {
            ...state.character,
            pp: (Number(state.character.pp) || 0) + amount,
            ppHistory: [...(state.character.ppHistory || []), newEntry],
        };

        // Update local state and UI first
        try {
            state.character = { ...updatedCharacter };
            const ppCurrentEl = container.querySelector('.pp-current strong');
            if (ppCurrentEl) {
                ppCurrentEl.textContent = String(state.character.pp || 0);
                try {
                    if (Number(state.character.pp) < 0) ppCurrentEl.classList.add('pp-negative');
                    else ppCurrentEl.classList.remove('pp-negative');
                } catch (_) {}
            }
            renderHistory();
            // Update PP spent display
            try {
                const ppSpentEl = container.querySelector('.pp-spent strong');
                if (ppSpentEl) {
                    const ppSpent = (state.character.ppHistory || [])
                        .filter((x) => x && x.type === 'spend')
                        .reduce((sum, x) => sum + Math.abs(Number(x.amount) || 0), 0);
                    ppSpentEl.textContent = String(ppSpent);
                }
            } catch (_) {}
        } catch (_) {}

        // Notify parent and persist
        try {
            if (DebugUtils.isEnabled()) {
                DebugUtils.instrumentRender('ProgressTab.applyAdd', () => state.onUpdate(updatedCharacter), { amount });
            } else {
                state.onUpdate(updatedCharacter);
            }
        } catch (_) {
            try {
                state.onUpdate(updatedCharacter);
            } catch (_) {}
        }

        try {
            DebugUtils.logRender('ProgressTab.add', { amount });
        } catch (_) {}

        // Dispatch a global save event so the page can persist this change without causing re-entrant updates
        try {
            const evt = new CustomEvent('arcana:save', {
                detail: { id: state.character && state.character.id ? state.character.id : null, updatedCharacter },
            });
            window.dispatchEvent(evt);
        } catch (_) {}

        // Clear inputs
        deltaInput.value = '1';
        reasonInput.value = '';
    };

    const handleRollback = (index) => {
        const history = state.character.ppHistory || [];
        if (index < 0 || index >= history.length) return;

        const entry = history[index];
        const amount = Math.abs(Number(entry.amount) || 0);
        const isSpend = entry.type === 'spend';
        const action = isSpend ? 'gasto' : 'adición';

        // Confirmación antes de deshacer
        const confirmed = confirm(
            `¿Estás seguro de que quieres deshacer este ${action} de ${amount} PP?\n\n` +
                `Motivo: ${entry.reason}\n\n` +
                `Esta acción no se puede deshacer.`
        );

        if (!confirmed) return;

        // Para rollback: si era un gasto (amount negativo), ahora sumamos a PP actuales
        // Si era una adición (amount positivo), ahora restamos de PP actuales
        const rollbackAmount = -Number(entry.amount);

        const updatedCharacter = {
            ...state.character,
            pp: (Number(state.character.pp) || 0) + rollbackAmount,
            ppHistory: history.filter((_, i) => i !== index),
        };

        // Update local UI and state
        try {
            state.character = { ...updatedCharacter };
            const ppCurrentEl = container.querySelector('.pp-current strong');
            if (ppCurrentEl) {
                ppCurrentEl.textContent = String(state.character.pp || 0);
                try {
                    if (Number(state.character.pp) < 0) ppCurrentEl.classList.add('pp-negative');
                    else ppCurrentEl.classList.remove('pp-negative');
                } catch (_) {}
            }
            renderHistory();
            // Update PP spent display
            try {
                const ppSpentEl = container.querySelector('.pp-spent strong');
                if (ppSpentEl) {
                    const ppSpent = (state.character.ppHistory || [])
                        .filter((x) => x && x.type === 'spend')
                        .reduce((sum, x) => sum + Math.abs(Number(x.amount) || 0), 0);
                    ppSpentEl.textContent = String(ppSpent);
                }
            } catch (_) {}
        } catch (_) {}

        // Notify parent and persist the rollback
        try {
            state.onUpdate(updatedCharacter);
        } catch (_) {
            try {
                state.onUpdate(updatedCharacter);
            } catch (_) {}
        }

        try {
            const evt = new CustomEvent('arcana:save', {
                detail: { id: state.character && state.character.id ? state.character.id : null, updatedCharacter },
            });
            window.dispatchEvent(evt);
        } catch (_) {}
    };

    const renderHistory = () => {
        const historyContainer = document.getElementById('pp-history');
        if (!historyContainer) return;

        const history = state.character.ppHistory || [];
        if (history.length === 0) {
            historyContainer.innerHTML = '<p class="text-secondary">No hay historial de progreso</p>';
            return;
        }

        historyContainer.innerHTML = history
            .slice()
            .reverse()
            .map((entry, reverseIndex) => {
                const isSpend = entry.type === 'spend';
                const amount = Math.abs(Number(entry.amount) || 0);
                const originalIndex = history.length - 1 - reverseIndex; // Convertir índice reverso a original

                return html`
                    <div class="log-row">
                        <div class="log-content">
                            <span class="log-amount ${isSpend ? 'text-danger' : 'text-success'}">
                                ${isSpend ? '-' : '+'} ${amount} PP
                            </span>
                            <span class="log-reason">${entry.reason}</span>
                        </div>
                        <button
                            class="button small rollback-btn"
                            data-rollback-index="${originalIndex}"
                            title="Deshacer esta acción"
                        >
                            ↶
                        </button>
                    </div>
                `;
            })
            .join('');
    };

    const update = () => {
        if (!container) return;
        container.innerHTML = render();
        bindEvents();
        renderHistory();
    };

    return {
        init() {
            ensureStyle('./src/components/ProgressTab/ProgressTab.css');
            update();
        },
        setState(partial) {
            state = { ...state, ...partial };
            update();
        },
    };
};

export default ProgressTab;
