const html = window.html || String.raw;
import { ensureStyle } from '../../utils/style-utils.js';

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

        // Event delegation for PP buttons
        container.addEventListener('click', (e) => {
            if (e.target.id === 'pp-spend') {
                handleSpend();
            } else if (e.target.id === 'pp-add') {
                handleAdd();
            } else if (e.target.hasAttribute('data-rollback-index')) {
                const index = parseInt(e.target.getAttribute('data-rollback-index'));
                handleRollback(index);
            }
        });

        // Event delegation for input changes
        container.addEventListener('input', (e) => {
            if (e.target.id === 'pp-delta' || e.target.id === 'pp-reason') {
                // Auto-save or validate if needed
            }
        });
    };

    const handleSpend = () => {
        const deltaInput = document.getElementById('pp-delta');
        const reasonInput = document.getElementById('pp-reason');
        
        if (!deltaInput || !reasonInput) return;

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

        state.onUpdate(updatedCharacter);
        
        // Clear inputs
        deltaInput.value = '1';
        reasonInput.value = '';
    };

    const handleAdd = () => {
        const deltaInput = document.getElementById('pp-delta');
        const reasonInput = document.getElementById('pp-reason');
        
        if (!deltaInput || !reasonInput) return;

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

        state.onUpdate(updatedCharacter);
        
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

        state.onUpdate(updatedCharacter);
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
                        <button class="button small rollback-btn" data-rollback-index="${originalIndex}" title="Deshacer esta acción">
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