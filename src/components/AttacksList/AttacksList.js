const html = window.html || String.raw;
import { ensureStyle } from '../../utils/style-utils.js';
import DebugUtils from '../../utils/debug-utils.js';
import DamageUtils from '../../utils/damage-utils.js';
import DiceService from '../../services/dice-service.js';
import { openRollModal } from '../../pages/CharactersPage/RollModal.js';

/**
 * AttacksList - editable list of attacks (similar UX to EquipmentList)
 * Props:
 *  - items: Array<{ name, attackFormula, damageFormula, notes }>
 *  - readOnly?: boolean
 *  - onChange: function(items) called on commit (change) or structural change (add/remove)
 *
 * Behavior:
 *  - Updates inputs in-place while typing (preserves focus)
 *  - Notifies parent only on 'change' events (commit) or when adding/removing an attack
 *  - Provides buttons to roll attack (exploding 1d6 + optional attack bonus if attackFormula includes a bonus) and roll damage (parses formula)
 */
const AttacksList = (container, props = {}) => {
    let state = {
        items: Array.isArray(props.items)
            ? props.items.map((x) => ({
                  name: String(x.name || ''),
                  attackFormula: String(x.attackFormula || ''),
                  damageFormula: String(x.damageFormula || ''),
                  notes: String(x.notes || ''),
              }))
            : [],
        readOnly: !!props.readOnly,
        onChange: typeof props.onChange === 'function' ? props.onChange : () => {},
        // optional variables map (attributes) and current luck/suerte provided by parent (SheetTab)
        variables: props.variables && typeof props.variables === 'object' ? props.variables : {},
        currentSuerte: Number(props.currentSuerte) || 0,
        // characterName: prefer explicit prop.characterName, fallback to props.character.name if provided
        characterName:
            typeof props.characterName === 'string'
                ? props.characterName
                : (props.character && props.character.name) || '',
        // onRoll callback: notify parent of roll results (attack/damage)
        onRoll: typeof props.onRoll === 'function' ? props.onRoll : () => {},
    };

    // Suppress notify while we're programmatically patching DOM to avoid loops
    let suppressNotify = false;

    // Track whether we've been initialized (to avoid double-binding)
    let _inited = false;

    const renderRow = (it, idx) => {
        return html`<div class="attack-row" data-attack-idx="${idx}">
            <input
                class="attack-name"
                type="text"
                placeholder="Nombre"
                value="${it.name || ''}"
                ${state.readOnly ? 'disabled' : ''}
            />
            <div class="attack-inline">
                <input
                    class="attack-formula"
                    type="text"
                    placeholder="Bono"
                    value="${it.attackFormula || ''}"
                    ${state.readOnly ? 'disabled' : ''}
                />
                <button class="button small btn-roll-attack" data-roll-attack-idx="${idx}" title="Tirar ataque">
                    🎯
                </button>
            </div>
            <div class="attack-inline">
                <input
                    class="damage-formula"
                    type="text"
                    placeholder="Daño"
                    value="${it.damageFormula || ''}"
                    ${state.readOnly ? 'disabled' : ''}
                />
                <button class="button small btn-roll-damage" data-roll-damage-idx="${idx}" title="Tirar daño">
                    💥
                </button>
            </div>
            <input
                class="attack-notes"
                type="text"
                placeholder="Notas"
                value="${it.notes || ''}"
                ${state.readOnly ? 'disabled' : ''}
            />
            ${state.readOnly
                ? ''
                : html`<button
                      class="button small btn-remove-attack"
                      data-remove-attack="${idx}"
                      title="Eliminar ataque"
                  >
                      🗑️
                  </button>`}
        </div>`;
    };

    const render = () => {
        return html`<div class="attacks-list ${state.readOnly ? 'readonly' : ''}">
            ${(Array.isArray(state.items) ? state.items : []).map((it, idx) => renderRow(it, idx)).join('')}
            ${state.readOnly
                ? ''
                : '<div style="display:flex; justify-content:flex-end; margin-top:.5rem;"><button class="button" data-attack-add>Añadir ataque</button></div>'}
        </div>`;
    };

    // Helpers to roll attack: exploding d6 + optional bonus parsed from attackFormula
    const parseAttackBonus = (attackFormula) => {
        // Accept simple bonus patterns like "+2" or "1d6+2" or just a number
        try {
            if (!attackFormula) return 0;
            const s = String(attackFormula).trim();
            // Look for +N or -N at end or after dice
            const m = s.match(/([+-]\s*\d+)(?!.*[+-]\s*\d+)/);
            if (m) {
                return Number(m[1].replace(/\s+/g, '')) || 0;
            }
            // If the whole formula is a number
            const num = Number(s);
            if (!Number.isNaN(num) && !/\d+d\d+/i.test(s)) {
                return num;
            }
        } catch (_) {}
        return 0;
    };

    const explodeRoll = (faces) => {
        const rolls = [];
        let r = 1 + Math.floor(Math.random() * faces);
        rolls.push(r);
        while (r === faces) {
            r = 1 + Math.floor(Math.random() * faces);
            rolls.push(r);
        }
        const sum = rolls.reduce((s, v) => s + v, 0);
        return { rolls, sum };
    };

    // Event handlers (delegated)
    const handleClick = (e) => {
        // Prevent any click handling when in readonly mode
        if (state.readOnly) return;

        const addBtn = e.target && e.target.closest && e.target.closest('[data-attack-add]');
        if (addBtn) {
            state.items.push({ name: '', attackFormula: '', damageFormula: '', notes: '' });
            setState({});
            // Notify structure change immediately
            try {
                state.onChange(state.items);
            } catch (_) {}
            return;
        }

        const rem = e.target && e.target.closest && e.target.closest('[data-remove-attack]');
        if (rem) {
            const idx = Number(rem.getAttribute('data-remove-attack')) || 0;
            state.items.splice(idx, 1);
            setState({});
            try {
                state.onChange(state.items);
            } catch (_) {}
            return;
        }

        const rollAtkBtn = e.target && e.target.closest && e.target.closest('[data-roll-attack-idx]');
        if (rollAtkBtn) {
            const idx = Number(rollAtkBtn.getAttribute('data-roll-attack-idx')) || 0;
            const item = state.items[idx];

            // Open the standard roll modal so the user can pick ventaja/desventaja, add modifiers
            // and use character variables (if provided). We pass the attack formula as initial modifiers.
            try {
                const initialMods = item && item.attackFormula ? String(item.attackFormula) : '';
                const vars = state.variables || {};
                const currentSuerte = Number(state.currentSuerte) || 0;

                openRollModal(
                    container && container.ownerDocument && container.ownerDocument.body
                        ? container.ownerDocument.body
                        : document.body,
                    {
                        attributeName: item && item.name ? item.name : 'Ataque',
                        attributeValue: 0, // attack uses mods input for bonus/dice
                        currentSuerte: currentSuerte,
                        initialMods: initialMods,
                        variables: vars,
                    },
                    (result) => {
                        if (!result) return;
                        const total = result.total;
                        const rolls = result.d6Rolls || (result.d6 ? [result.d6] : []);
                        const breakdown = `d6=${(result.d6Rolls || [result.d6]).join('+')} ; mods=${result.extras} ; luck=${result.luck}`;
                        DiceService.showRollToast({
                            characterName: state.characterName || (item && item.name ? item.name : 'Ataque'),
                            rollType: `${item && item.name ? item.name : 'Ataque'} (ataque)`,
                            total,
                            rolls,
                            breakdown,
                        });
                        // Notify parent / logger about the roll (attack)
                        try {
                            state.onRoll({
                                type: 'attack',
                                attackName: item && item.name ? item.name : 'Ataque',
                                total,
                                rolls,
                                breakdown,
                                details: result,
                            });
                        } catch (_) {}
                    }
                );
            } catch (err) {
                // Fallback: if modal fails for some reason, do a quick exploding d6 + parsed numeric bonus
                const bonus = parseAttackBonus(item && item.attackFormula);
                const atk = explodeRoll(6);
                const total = atk.sum + bonus;
                const breakdown = `attack(1d6 exploding)=${atk.rolls.join('+')} ; bonus=${bonus}`;
                DiceService.showRollToast({
                    characterName: state.characterName || (item && item.name ? item.name : 'Ataque'),
                    rollType: `${item && item.name ? item.name : 'Ataque'} (ataque)`,
                    total,
                    rolls: atk.rolls,
                    breakdown,
                });
                // Notify parent / logger about the fallback attack roll
                try {
                    state.onRoll({
                        type: 'attack',
                        attackName: item && item.name ? item.name : 'Ataque',
                        total,
                        rolls: atk.rolls,
                        breakdown,
                        details: { exploding: true, rolls: atk.rolls, bonus },
                    });
                } catch (_) {}
            }

            return;
        }

        const rollDmgBtn = e.target && e.target.closest && e.target.closest('[data-roll-damage-idx]');
        if (rollDmgBtn) {
            const idx = Number(rollDmgBtn.getAttribute('data-roll-damage-idx')) || 0;
            const item = state.items[idx];
            const formula = item && item.damageFormula ? item.damageFormula : '';
            if (!formula || !String(formula).trim()) {
                DiceService.showRollToast({
                    characterName: state.characterName || (item && item.name ? item.name : 'Daño'),
                    rollType: `${item && item.name ? item.name : 'Daño'} (daño)`,
                    total: formula,
                    rolls: [],
                    breakdown: 'No hay fórmula de daño',
                });
                return;
            }
            try {
                const parts = DamageUtils.parseDamageFormula(formula);
                if (!parts.length) {
                    DiceService.showRollToast({
                        characterName: state.characterName || (item && item.name ? item.name : 'Daño'),
                        rollType: `${item && item.name ? item.name : 'Daño'} (daño)`,
                        total: formula,
                        rolls: [],
                        breakdown: `Fórmula: ${formula}`,
                    });
                    // notify empty / invalid damage attempt
                    try {
                        state.onRoll({
                            type: 'damage',
                            attackName: item && item.name ? item.name : 'Daño',
                            total: null,
                            rolls: [],
                            breakdown: `Fórmula inválida: ${formula}`,
                            details: { formula },
                        });
                    } catch (_) {}
                    return;
                }
                const res = DamageUtils.evaluateDamageParts(parts, { explodeDice: false });
                DiceService.showRollToast({
                    characterName: state.characterName || (item && item.name ? item.name : 'Daño'),
                    rollType: `${item && item.name ? item.name : 'Daño'} (daño)`,
                    total: res.total,
                    rolls: res.flatRolls,
                    breakdown: `${formula} => ${res.breakdown} => ${res.total}`,
                });
                // Notify parent / logger about the damage roll result
                try {
                    state.onRoll({
                        type: 'damage',
                        attackName: item && item.name ? item.name : 'Daño',
                        total: res.total,
                        rolls: res.flatRolls,
                        breakdown: `${formula} => ${res.breakdown}`,
                        details: { parts: parts, partsResults: res.partsResults || [], eval: res },
                    });
                } catch (_) {}
            } catch (err) {
                console.error('AttacksList rollDamage error', err);
                DiceService.showRollToast({
                    characterName: state.characterName || (item && item.name ? item.name : 'Daño'),
                    rollType: `${item && item.name ? item.name : 'Daño'} (daño)`,
                    total: formula,
                    rolls: [],
                    breakdown: `Fórmula: ${formula}`,
                });
                // Notify parent about the error / fallback
                try {
                    state.onRoll({
                        type: 'damage',
                        attackName: item && item.name ? item.name : 'Daño',
                        total: null,
                        rolls: [],
                        breakdown: `Error: ${String(err)}`,
                        details: { error: String(err), formula },
                    });
                } catch (_) {}
            }
            return;
        }
    };

    const handleInput = (e) => {
        if (state.readOnly) return;
        if (suppressNotify) return;
        const target = e.target;
        if (!target) return;
        const row = target.closest && target.closest('.attack-row');
        const idx = Number(row && row.getAttribute('data-attack-idx')) || 0;
        if (!Number.isFinite(idx) || !state.items[idx]) return;

        const isChange = e.type === 'change';

        if (target.classList.contains('attack-name')) {
            state.items[idx].name = target.value;
            if (isChange) {
                try {
                    state.onChange(state.items);
                } catch (_) {}
            }
            return;
        }
        if (target.classList.contains('attack-formula')) {
            state.items[idx].attackFormula = target.value;
            if (isChange) {
                try {
                    state.onChange(state.items);
                } catch (_) {}
            }
            return;
        }
        if (target.classList.contains('damage-formula')) {
            state.items[idx].damageFormula = target.value;
            if (isChange) {
                try {
                    state.onChange(state.items);
                } catch (_) {}
            }
            return;
        }
        if (target.classList.contains('attack-notes')) {
            state.items[idx].notes = target.value;
            if (isChange) {
                try {
                    state.onChange(state.items);
                } catch (_) {}
            }
            return;
        }
    };

    const bind = () => {
        if (!container) return;
        // Always remove before add to keep idempotent binding
        try {
            container.removeEventListener('click', handleClick);
            container.removeEventListener('input', handleInput);
            container.removeEventListener('change', handleInput);
        } catch (_) {}
        // Only bind interactive handlers when not readOnly
        container.addEventListener('click', handleClick);
        container.addEventListener('input', handleInput);
        container.addEventListener('change', handleInput);
    };

    const unbind = () => {
        if (!container) return;
        try {
            container.removeEventListener('click', handleClick);
            container.removeEventListener('input', handleInput);
            container.removeEventListener('change', handleInput);
        } catch (_) {}
    };

    const setState = (partial) => {
        const prevRows = container ? container.querySelectorAll('.attack-row').length : 0;
        state = { ...state, ...partial };

        try {
            DebugUtils.logRender('AttacksList.setState', { itemsCount: state.items.length, prevRows });
        } catch (_) {}

        // Suppress notifications while patching DOM
        suppressNotify = true;
        try {
            if (container && prevRows === state.items.length && prevRows > 0) {
                // In-place update
                try {
                    const active = document.activeElement;
                    let activeInfo = null;
                    if (active && container.contains(active)) {
                        const rowEl = active.closest && active.closest('.attack-row');
                        if (rowEl) {
                            activeInfo = {
                                tag: active.tagName,
                                type: active.className,
                                idx: Number(rowEl.getAttribute('data-attack-idx')),
                                selectionStart: active.selectionStart,
                                selectionEnd: active.selectionEnd,
                                value: active.value,
                            };
                        }
                    }
                    for (let i = 0; i < state.items.length; i++) {
                        const it = state.items[i];
                        const row = container.querySelector(`.attack-row[data-attack-idx="${i}"]`);
                        if (!row) continue;
                        const name = row.querySelector('.attack-name');
                        const atk = row.querySelector('.attack-formula');
                        const dmg = row.querySelector('.damage-formula');
                        const notes = row.querySelector('.attack-notes');
                        if (name && name.value !== (it.name || '')) name.value = it.name || '';
                        if (atk && atk.value !== (it.attackFormula || '')) atk.value = it.attackFormula || '';
                        if (dmg && dmg.value !== (it.damageFormula || '')) dmg.value = it.damageFormula || '';
                        if (notes && notes.value !== (it.notes || '')) notes.value = it.notes || '';
                    }
                    if (activeInfo) {
                        try {
                            const rowEl = container.querySelector(`.attack-row[data-attack-idx="${activeInfo.idx}"]`);
                            if (rowEl) {
                                let selector = activeInfo.type.includes('attack-name') ? '.attack-name' : null;
                                if (!selector) {
                                    if (activeInfo.type.includes('attack-formula')) selector = '.attack-formula';
                                    if (activeInfo.type.includes('damage-formula')) selector = '.damage-formula';
                                    if (activeInfo.type.includes('attack-notes')) selector = '.attack-notes';
                                }
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
                    // Finished in-place patch
                    return;
                } catch (err) {
                    // fallback to full render on any error
                    // continue to full render below
                }
            }

            // Full render path
            try {
                if (container) {
                    // Render fresh HTML
                    container.innerHTML = render();
                    // Rebind handlers
                    bind();
                }
            } catch (err) {
                console.error('AttacksList: full render error', err);
                // As a last resort, try to set innerHTML to empty to avoid broken DOM
                try {
                    if (container) container.innerHTML = '';
                } catch (_) {}
            }
        } finally {
            suppressNotify = false;
        }
    };

    const init = () => {
        if (!container) return;
        if (_inited) return;
        _inited = true;
        try {
            ensureStyle('./src/components/AttacksList/AttacksList.css');
        } catch (_) {}
        // Initial render
        try {
            container.innerHTML = render();
        } catch (err) {
            console.error('AttacksList.init: render error', err);
            try {
                container.innerHTML = '';
            } catch (_) {}
        }
        // Bind events
        bind();
    };

    const destroy = () => {
        unbind();
        // clear references (best-effort)
        try {
            if (container) container.innerHTML = '';
        } catch (_) {}
        _inited = false;
    };

    // Public API
    return {
        init,
        setState,
        destroy,
    };
};

export default AttacksList;
