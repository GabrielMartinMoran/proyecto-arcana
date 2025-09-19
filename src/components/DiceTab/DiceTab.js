const html = window.html || String.raw;
import { ensureStyle } from '../../utils/style-utils.js';
import DiceService from '../../services/dice-service.js';
import rollStore from '../../services/roll-store.js';
import { evaluateDiceExpression } from '../../utils/dice-utils.js';

/**
 * DiceTab - Component for dice rolling interface
 * @param {HTMLElement} container
 * @param {{ character: Object, onRoll: Function }} props
 */
const DiceTab = (container, props = {}) => {
    let state = {
        character: props.character || {},
        onRoll: typeof props.onRoll === 'function' ? props.onRoll : null,
    };

    const render = () => html`
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
                    <div class="dice-custom" style="grid-template-columns: 1fr auto;">
                        <input type="text" id="dice-expr" placeholder="Ej: 2d6+1d4+3 o mente+1d6" />
                        <button class="button" id="dice-expr-roll">Tirar</button>
                    </div>
                    <div
                        id="dice-vars"
                        class="dice-vars"
                        style="margin-top:.5rem; color: var(--text-secondary); font-size:.9rem;"
                    ></div>
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

    const bind = () => {
        // Event delegation for dice buttons
        container.addEventListener('click', (e) => {
            const btn = e.target && e.target.closest && e.target.closest('[data-dice]');
            const clearBtn = e.target && e.target.closest && e.target.closest('[data-dice-clear]');
            const delBtn = e.target && e.target.closest && e.target.closest('[data-dice-del]');

            if (clearBtn) {
                if (!state.character.rollLog) state.character.rollLog = [];
                state.character.rollLog = [];
                renderHistory();
                return;
            }

            if (delBtn) {
                const ts = parseInt(delBtn.getAttribute('data-dice-del'));
                if (!state.character.rollLog) state.character.rollLog = [];
                state.character.rollLog = state.character.rollLog.filter((entry) => entry.ts !== ts);
                renderHistory();
                return;
            }

            if (btn) {
                const notation = btn.getAttribute('data-dice');
                const m = notation.match(/^(\d*)d(\d+)$/i);
                if (!m) return;
                const n = Math.max(1, Number(m[1] || 1));
                const faces = Number(m[2] || 0);
                if (!faces) return;

                const rolls = [];
                let sum = 0;
                for (let i = 0; i < n; i++) {
                    const r = 1 + Math.floor(Math.random() * faces);
                    rolls.push(r);
                    sum += r;
                }

                // Ensure rollLog exists
                if (!Array.isArray(state.character.rollLog)) {
                    state.character.rollLog = [];
                }

                const entry = {
                    type: 'dice',
                    ts: Date.now(),
                    notation: notation.toLowerCase(),
                    rolls,
                    total: sum,
                    details: { parts: [{ type: 'dice', notation: notation.toLowerCase(), rolls, sum, sign: 1 }] },
                };

                state.character.rollLog.unshift(entry);
                // Limit to 50 entries to prevent infinite growth
                if (state.character.rollLog.length > 50) {
                    state.character.rollLog.length = 50;
                }

                // Show toast with result
                DiceService.showDiceRoll({
                    characterName: state.character.name,
                    notation: notation.toLowerCase(),
                    rolls: rolls,
                    total: sum,
                });

                // Publish roll: prefer parent's onRoll callback, fallback to global rollStore
                try {
                    const entryWithWho = { ...entry, who: state.character.name };
                    if (typeof state.onRoll === 'function') {
                        // Delegate publishing to parent (e.g., EncounterManager)
                        state.onRoll(entryWithWho);
                    } else {
                        // Standalone behavior: write to global roll store
                        rollStore.addRoll(entryWithWho);
                    }
                } catch (_) {}

                renderHistory();
            }
        });

        // Custom dice expression
        const exprBtn = container.querySelector('#dice-expr-roll');
        const exprInp = container.querySelector('#dice-expr');

        if (exprBtn && exprInp) {
            const doExprRoll = () => {
                const expr = String(exprInp.value || '').trim();
                if (!expr) return;

                // Evaluate dice expression with explosive dice support
                const { total, parts } = evaluateDiceExpression(
                    expr,
                    state.character.attributes || {},
                    state.character
                );

                // Ensure rollLog exists
                if (!Array.isArray(state.character.rollLog)) {
                    state.character.rollLog = [];
                }

                const entry = {
                    type: 'dice',
                    ts: Date.now(),
                    notation: expr.toLowerCase(),
                    rolls: parts.flatMap((p) => p.rolls || []),
                    total,
                    details: { parts },
                };

                state.character.rollLog.unshift(entry);
                // Limit to 50 entries to prevent infinite growth
                if (state.character.rollLog.length > 50) {
                    state.character.rollLog.length = 50;
                }

                // Show toast with result
                const extractedRolls = parts.flatMap((p) => p.rolls || []);
                DiceService.showDiceRoll({
                    characterName: state.character.name,
                    notation: expr.toLowerCase(),
                    rolls: extractedRolls,
                    total: total,
                    details: {
                        parts: parts, // Pass the parts to identify which dice exploded
                    },
                });

                // Publish roll: prefer parent's onRoll callback, fallback to global rollStore
                try {
                    const entryWithWho = { ...entry, who: state.character.name };
                    if (typeof state.onRoll === 'function') {
                        state.onRoll(entryWithWho);
                    } else {
                        rollStore.addRoll(entryWithWho);
                    }
                } catch (_) {}
                renderHistory();
                exprInp.value = '';
                exprInp.focus();
            };

            exprBtn.addEventListener('click', doExprRoll);
            exprInp.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    doExprRoll();
                }
            });
        }

        // Show available variables and explosive dice syntax
        const varsHost = container.querySelector('#dice-vars');
        if (varsHost) {
            const allowed = ['cuerpo', 'reflejos', 'mente', 'instinto', 'presencia', 'esquiva', 'mitigacion', 'suerte'];
            varsHost.innerHTML = `Variables: ${allowed.map((k) => '`' + k + '`').join(', ')}<br/>Dados explosivos: usa 'e' (ej: 1d6e, 2d4e)`;
        }
    };

    const renderHistory = () => {
        const host = container.querySelector('#dice-history');
        if (!host) return;

        const items = (state.character.rollLog || [])
            .filter((e) => e && e.notation && e.total !== undefined) // Filter out invalid entries
            .map((e) => ({
                ts: e.ts,
                text: `${state.character.name}: ${e.notation || 'unknown'} → ${e.total || 0}${e.rolls && e.rolls.length ? ` (${e.rolls.join(', ')})` : ''}`,
            }));

        host.innerHTML = items.length
            ? items
                  .map(
                      (it) =>
                          html`<div class="log-row">
                              <span class="log-text">${it.text}</span
                              ><button
                                  class="button icon-only"
                                  data-dice-del="${it.ts}"
                                  aria-label="Eliminar"
                                  title="Eliminar"
                              >
                                  🗑️
                              </button>
                          </div>`
                  )
                  .join('')
            : html`<div class="empty-state">Sin tiradas aún</div>`;
    };

    return {
        init: () => {
            ensureStyle('./src/components/DiceTab/DiceTab.css');
            container.innerHTML = render();
            bind();
            renderHistory();
        },
        setState: (partial) => {
            state = { ...state, ...partial };
            container.innerHTML = render();
            bind();
            renderHistory();
        },
    };
};

export default DiceTab;
