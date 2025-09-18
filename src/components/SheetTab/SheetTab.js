/*
 proyecto-arcana/src/components/SheetTab/SheetTab.js

 Component that mounts the character sheet tab and its subcomponents:
 - Attributes panel
 - Derived stats panel
 - Equipment list
 - Attacks list

 This file restores a correct and balanced mounting sequence for the AttacksList,
 passing the expected variables, suerte and characterName to the child component.
*/

const html = window.html || String.raw;
import PanelHeader from '../PanelHeader/PanelHeader.js';
import { ensureStyle } from '../../utils/style-utils.js';
import { openRollModal } from '../../pages/CharactersPage/RollModal.js';
import DiceService from '../../services/dice-service.js';
import rollStore from '../../services/roll-store.js';
import DebugUtils from '../../utils/debug-utils.js';

/**
 * SheetTab - Component for character sheet display
 * @param {HTMLElement} container
 * @param {{ character: Object, derived: Object, rules: Object, readOnly: boolean, onUpdate: Function }} props
 */
const SheetTab = (container, props = {}) => {
    let state = {
        character: props.character || {},
        derived: props.derived || {},
        rules: props.rules || {},
        readOnly: !!props.readOnly,
        onUpdate: typeof props.onUpdate === 'function' ? props.onUpdate : () => {},
    };

    // Registry for mounted subcomponents
    let mountedComponents = {};

    // Guard to suppress parent notifications while programmatic updates happen
    let suppressOnUpdate = false;

    const render = () => {
        const c = state.character;
        const readOnly = state.readOnly;

        return html`
            <div class="editor-grid">
                <div class="panel">
                    ${PanelHeader({ title: 'Atributos' })}
                    <div id="attributes-host" data-readonly="${readOnly ? '1' : '0'}"></div>
                </div>
                <div class="panel">
                    ${PanelHeader({ title: 'Derivados' })}
                    <div id="derived-host" data-readonly="${readOnly ? '1' : '0'}"></div>
                </div>
                <div class="panel">
                    ${PanelHeader({ title: 'Ataques' })}
                    <div id="attacks-list" data-readonly="${readOnly ? '1' : '0'}"></div>
                </div>

                <div class="panel">
                    ${PanelHeader({ title: 'Economía' })}
                    <div class="attrs">
                        <div class="attr">
                            <span>Oro</span>
                            <input
                                class="long-input"
                                type="number"
                                id="gold"
                                min="0"
                                step="1"
                                value="${c.gold || 0}"
                                ${readOnly ? 'disabled' : ''}
                            />
                        </div>
                    </div>
                </div>

                <div class="panel">
                    ${PanelHeader({ title: 'Lenguas' })}
                    <input
                        id="languages"
                        type="text"
                        class="languages-input"
                        value="${c.languages || ''}"
                        ${readOnly ? 'disabled' : ''}
                    />
                </div>

                <div class="panel">
                    ${PanelHeader({ title: 'Equipo' })}
                    <div id="equip-list" data-readonly="${readOnly ? '1' : '0'}"></div>
                </div>
            </div>
        `;
    };

    const bindEvents = () => {
        if (!container) return;

        // Input delegation for simple fields
        container.addEventListener('input', (e) => {
            if (e.target.id === 'gold') {
                handleGoldChange(e.target.value);
            } else if (e.target.id === 'languages') {
                handleLanguagesChange(e.target.value);
            }
        });

        // Blur auto-save for simple inputs
        container.addEventListener(
            'blur',
            (e) => {
                if (e.target.id === 'gold' || e.target.id === 'languages') {
                    if (!suppressOnUpdate) state.onUpdate(state.character);
                }
            },
            true
        );
    };

    const handleGoldChange = (value) => {
        const gold = Number(value) || 0;
        state.character.gold = gold;
        if (!suppressOnUpdate) state.onUpdate(state.character);
    };

    const handleLanguagesChange = (value) => {
        state.character.languages = value.trim();
        if (!suppressOnUpdate) state.onUpdate(state.character);
    };

    const handleAttributeRoll = (attributeKey) => {
        const attributeValue = state.character.attributes?.[attributeKey] || 0;
        if (attributeValue <= 0) return;

        openRollModal(
            container,
            {
                attributeName: attributeKey,
                attributeValue: attributeValue,
                maxSuerte: Number(state.derived.suerteMax) || 0,
                currentSuerte: Number(state.character.suerte) || 0,
            },
            (result) => {
                if (!result) return;

                // Deduct luck if used
                if (result.luck > 0) {
                    state.character.suerte = Math.max(0, (state.character.suerte || 0) - result.luck);
                }

                // Build roll entry
                const entry = {
                    type: 'attribute',
                    ts: Date.now(),
                    notation: `${attributeKey} (${attributeValue}d6${result.d6Rolls && result.d6Rolls.length > 1 ? ' explotando' : ''})`,
                    rolls: result.d6Rolls || [result.d6],
                    total: result.total,
                    attribute: attributeKey,
                    attributeValue,
                    details: {
                        d6: result.d6,
                        d6Rolls: result.d6Rolls,
                        advMod: result.advMod,
                        advantage: result.advantage,
                        base: result.base,
                        extras: result.extras,
                        luck: result.luck,
                        exploded: result.d6Rolls && result.d6Rolls.length > 1,
                        parts: [
                            {
                                type: 'attribute',
                                attribute: attributeKey,
                                value: attributeValue,
                                notation: `${attributeValue}d6${result.d6Rolls && result.d6Rolls.length > 1 ? ' explotando' : ''}`,
                                rolls: result.d6Rolls || [result.d6],
                                sum: result.total,
                                sign: 1,
                            },
                        ],
                    },
                };

                // Push to roll log
                if (!Array.isArray(state.character.rollLog)) state.character.rollLog = [];
                state.character.rollLog.unshift(entry);
                if (state.character.rollLog.length > 50) state.character.rollLog.length = 50;

                // Add to global store and show toast
                rollStore.addRoll({ ...entry, who: state.character.name });
                DiceService.showAttributeRoll({
                    characterName: state.character.name,
                    attributeName,
                    result,
                });

                if (!suppressOnUpdate) state.onUpdate(state.character);
            }
        );
    };

    const mountSubComponents = async () => {
        // ATTRIBUTES PANEL
        try {
            const attrsHost = container.querySelector('#attributes-host');
            if (attrsHost && state.rules) {
                const AttributesPanel = (await import('../AttributesPanel/AttributesPanel.js')).default;

                const initialAttrs =
                    state.character && state.character.attributes && Object.keys(state.character.attributes).length
                        ? { ...state.character.attributes }
                        : { Cuerpo: 1, Reflejos: 1, Mente: 1, Instinto: 1, Presencia: 1 };

                if (mountedComponents.attributes && typeof mountedComponents.attributes.setState === 'function') {
                    mountedComponents.attributes.setState({
                        attributes: initialAttrs,
                        rules: state.rules,
                        suerte: Number(state.character.suerte) || 0,
                        suerteMax: Number(state.derived.suerteMax) || 0,
                        readOnly: state.readOnly,
                    });
                } else {
                    const comp = AttributesPanel(attrsHost, {
                        attributes: initialAttrs,
                        rules: state.rules,
                        suerte: Number(state.character.suerte) || 0,
                        suerteMax: Number(state.derived.suerteMax) || 0,
                        onChange: (key, val) => {
                            state.character.attributes = { ...state.character.attributes, [key]: val };
                            if (!suppressOnUpdate) state.onUpdate(state.character);
                        },
                        onRoll: (attributeKey) => handleAttributeRoll(attributeKey),
                        onLuckChange: (val) => {
                            state.character.suerte = val;
                            if (!suppressOnUpdate) state.onUpdate(state.character);
                        },
                        onSave: () => {
                            if (!suppressOnUpdate) state.onUpdate(state.character);
                        },
                        onLuckSave: () => {
                            if (!suppressOnUpdate) state.onUpdate(state.character);
                        },
                    });
                    comp.init();
                    mountedComponents.attributes = comp;
                }
            }
        } catch (error) {
            console.error('SheetTab: Error mounting AttributesPanel:', error);
        }

        // DERIVED STATS PANEL
        try {
            const derivedHost = container.querySelector('#derived-host');
            if (derivedHost && state.derived) {
                const DerivedStatsPanel = (await import('../DerivedStatsPanel/DerivedStatsPanel.js')).default;

                if (mountedComponents.derived && typeof mountedComponents.derived.setState === 'function') {
                    mountedComponents.derived.setState({
                        derived: state.derived,
                        hp: Number(state.character.hp) || 0,
                        tempHp: Number(state.character.tempHp) || 0,
                        readOnly: state.readOnly,
                    });
                } else {
                    const comp = DerivedStatsPanel(derivedHost, {
                        derived: state.derived,
                        hp: Number(state.character.hp) || 0,
                        tempHp: Number(state.character.tempHp) || 0,
                        onHpChange: (hpVal) => {
                            state.character.hp = hpVal;
                            if (!suppressOnUpdate) state.onUpdate(state.character);
                        },
                        onTempHpChange: (tempVal) => {
                            state.character.tempHp = tempVal;
                            if (!suppressOnUpdate) state.onUpdate(state.character);
                        },
                    });
                    comp.init();
                    mountedComponents.derived = comp;
                }
            }
        } catch (error) {
            console.error('SheetTab: Error mounting DerivedStatsPanel:', error);
        }

        // EQUIPMENT LIST
        try {
            const equipHost = container.querySelector('#equip-list');
            if (equipHost) {
                const EquipmentList = (await import('../EquipmentList/EquipmentList.js')).default;

                if (mountedComponents.equipment && typeof mountedComponents.equipment.setState === 'function') {
                    mountedComponents.equipment.setState({
                        items: Array.isArray(state.character.equipmentList) ? state.character.equipmentList : [],
                        readOnly: state.readOnly,
                    });
                } else {
                    const comp = EquipmentList(equipHost, {
                        items: Array.isArray(state.character.equipmentList) ? state.character.equipmentList : [],
                        readOnly: state.readOnly,
                        onChange: (items) => {
                            state.character.equipmentList = items;
                            try {
                                if (!suppressOnUpdate) {
                                    state.onUpdate(state.character);
                                    try {
                                        const evt = new CustomEvent('arcana:save', {
                                            detail: {
                                                id: state.character && state.character.id ? state.character.id : null,
                                                equipmentList: state.character.equipmentList,
                                            },
                                        });
                                        window.dispatchEvent(evt);
                                    } catch (_) {}
                                }
                            } catch (_) {}
                        },
                    });
                    comp.init();
                    // call setState to ensure consistent rendering after init
                    try {
                        if (typeof comp.setState === 'function') {
                            comp.setState({
                                items: Array.isArray(state.character.equipmentList)
                                    ? state.character.equipmentList
                                    : [],
                                readOnly: state.readOnly,
                            });
                        }
                    } catch (_) {}
                    mountedComponents.equipment = comp;
                }
            }
        } catch (error) {
            console.error('SheetTab: Error mounting EquipmentList:', error);
        }

        // ATTACKS LIST
        try {
            const attacksHost = container.querySelector('#attacks-list');
            if (attacksHost) {
                const AttacksList = (await import('../AttacksList/AttacksList.js')).default;

                // Build attribute variables in lowercase for eval usage
                const vars = {
                    cuerpo:
                        Number(
                            (state.character.attributes &&
                                (state.character.attributes.Cuerpo ?? state.character.attributes.cuerpo)) ||
                                0
                        ) || 0,
                    reflejos:
                        Number(
                            (state.character.attributes &&
                                (state.character.attributes.Reflejos ?? state.character.attributes.reflejos)) ||
                                0
                        ) || 0,
                    mente:
                        Number(
                            (state.character.attributes &&
                                (state.character.attributes.Mente ?? state.character.attributes.mente)) ||
                                0
                        ) || 0,
                    instinto:
                        Number(
                            (state.character.attributes &&
                                (state.character.attributes.Instinto ?? state.character.attributes.instinto)) ||
                                0
                        ) || 0,
                    presencia:
                        Number(
                            (state.character.attributes &&
                                (state.character.attributes.Presencia ?? state.character.attributes.presencia)) ||
                                0
                        ) || 0,
                };

                if (mountedComponents.attacks && typeof mountedComponents.attacks.setState === 'function') {
                    // Update mounted attacks component
                    mountedComponents.attacks.setState({
                        items: Array.isArray(state.character.attacks) ? state.character.attacks : [],
                        readOnly: state.readOnly,
                        variables: vars,
                        currentSuerte: Number(state.character.suerte) || 0,
                        maxSuerte: Number(state.derived.suerteMax) || 0,
                        characterName: state.character && state.character.name ? state.character.name : '',
                    });
                } else {
                    const comp = AttacksList(attacksHost, {
                        items: Array.isArray(state.character.attacks) ? state.character.attacks : [],
                        readOnly: state.readOnly,
                        variables: vars,
                        currentSuerte: Number(state.character.suerte) || 0,
                        maxSuerte: Number(state.derived.suerteMax) || 0,
                        characterName: (state.character && state.character.name) || '',
                        // onRoll: receive roll entries from AttacksList and persist to character log + global rollStore
                        onRoll: (entry) => {
                            try {
                                if (!state.character) return;
                                if (!Array.isArray(state.character.rollLog)) state.character.rollLog = [];
                                const logEntry = {
                                    type: entry.type || 'attack',
                                    ts: entry.ts || Date.now(),
                                    notation: entry.attackName || entry.notation || '',
                                    rolls: entry.rolls || [],
                                    total: entry.total,
                                    details: entry.details || {},
                                };
                                // prepend to character roll log
                                state.character.rollLog.unshift(logEntry);
                                if (state.character.rollLog.length > 200) state.character.rollLog.length = 200;
                                // add to global roll store for UI/history
                                try {
                                    rollStore.addRoll({ ...logEntry, who: state.character.name });
                                } catch (_) {}
                                // persist change via parent onUpdate (guarded)
                                if (!suppressOnUpdate) state.onUpdate(state.character);
                            } catch (err) {
                                console.error('SheetTab:onRoll error', err);
                            }
                        },
                        onChange: (items) => {
                            state.character.attacks = items;
                            try {
                                if (!suppressOnUpdate) state.onUpdate(state.character);
                                try {
                                    const evt = new CustomEvent('arcana:save', {
                                        detail: {
                                            id: state.character && state.character.id ? state.character.id : null,
                                            updatedCharacter: { attacks: items },
                                        },
                                    });
                                    window.dispatchEvent(evt);
                                } catch (_) {}
                            } catch (_) {}
                        },
                    });

                    comp.init();
                    // ensure consistent render after init
                    try {
                        if (typeof comp.setState === 'function') {
                            comp.setState({
                                items: Array.isArray(state.character.attacks) ? state.character.attacks : [],
                                readOnly: state.readOnly,
                                variables: vars,
                                currentSuerte: Number(state.character.suerte) || 0,
                                maxSuerte: Number(state.derived.suerteMax) || 0,
                                characterName: state.character && state.character.name ? state.character.name : '',
                            });
                        }
                    } catch (_) {}
                    mountedComponents.attacks = comp;
                }
            }
        } catch (error) {
            console.error('SheetTab: Error mounting AttacksList:', error);
        }
    };

    const update = async () => {
        if (!container) return;

        try {
            DebugUtils.logRender('SheetTab.update', { reason: 'update-called' });
        } catch (_) {}

        // Destroy mounted components before re-rendering
        try {
            for (const key in mountedComponents) {
                const comp = mountedComponents[key];
                if (comp && typeof comp.destroy === 'function') {
                    try {
                        comp.destroy();
                    } catch (_) {
                        // ignore destroy errors
                    }
                }
            }
        } catch (_) {}
        mountedComponents = {};

        container.innerHTML = render();
        bindEvents();

        try {
            await DebugUtils.instrumentRender(
                'SheetTab.mountSubComponents',
                async () => {
                    await mountSubComponents();
                },
                { phase: 'mount' }
            );
        } catch (e) {
            // fallback if instrumentation fails
            await mountSubComponents();
        }
    };

    return {
        async init() {
            ensureStyle('./src/components/SheetTab/SheetTab.css');
            ensureStyle('./src/components/AttacksList/AttacksList.css');
            await update();
        },

        async setState(partial) {
            state = { ...state, ...partial };
            try {
                DebugUtils.logRender('SheetTab.setState', { keys: Object.keys(partial || {}) });
            } catch (_) {}
            await update();
        },

        updateCharacter(partial = {}) {
            if (!partial || typeof partial !== 'object') return;
            state.character = { ...state.character, ...partial };

            // Patch simple inputs
            try {
                const goldInput = container.querySelector('#gold');
                if (goldInput && partial.hasOwnProperty('gold')) goldInput.value = Number(partial.gold) || 0;

                const languagesInput = container.querySelector('#languages');
                if (languagesInput && partial.hasOwnProperty('languages'))
                    languagesInput.value = partial.languages || '';
            } catch (_) {}

            // Patch mounted subcomponents (safely)
            if (
                (mountedComponents.attributes && typeof mountedComponents.attributes.setState === 'function') ||
                (mountedComponents.equipment && typeof mountedComponents.equipment.setState === 'function') ||
                (mountedComponents.attacks && typeof mountedComponents.attacks.setState === 'function')
            ) {
                try {
                    suppressOnUpdate = true;
                    if (mountedComponents.attributes && typeof mountedComponents.attributes.setState === 'function') {
                        mountedComponents.attributes.setState({
                            attributes: { ...state.character.attributes },
                            suerte: Number(state.character.suerte) || 0,
                        });
                    }
                    if (mountedComponents.equipment && typeof mountedComponents.equipment.setState === 'function') {
                        mountedComponents.equipment.setState({
                            items: Array.isArray(state.character.equipmentList) ? state.character.equipmentList : [],
                            readOnly: state.readOnly,
                        });
                    }
                    if (mountedComponents.attacks && typeof mountedComponents.attacks.setState === 'function') {
                        // Recompute vars and pass updated characterName/suerte
                        const vars = {
                            cuerpo:
                                Number(
                                    (state.character.attributes &&
                                        (state.character.attributes.Cuerpo ?? state.character.attributes.cuerpo)) ||
                                        0
                                ) || 0,
                            reflejos:
                                Number(
                                    (state.character.attributes &&
                                        (state.character.attributes.Reflejos ?? state.character.attributes.reflejos)) ||
                                        0
                                ) || 0,
                            mente:
                                Number(
                                    (state.character.attributes &&
                                        (state.character.attributes.Mente ?? state.character.attributes.mente)) ||
                                        0
                                ) || 0,
                            instinto:
                                Number(
                                    (state.character.attributes &&
                                        (state.character.attributes.Instinto ?? state.character.attributes.instinto)) ||
                                        0
                                ) || 0,
                            presencia:
                                Number(
                                    (state.character.attributes &&
                                        (state.character.attributes.Presencia ??
                                            state.character.attributes.presencia)) ||
                                        0
                                ) || 0,
                        };
                        mountedComponents.attacks.setState({
                            items: Array.isArray(state.character.attacks) ? state.character.attacks : [],
                            readOnly: state.readOnly,
                            variables: vars,
                            currentSuerte: Number(state.character.suerte) || 0,
                            maxSuerte: Number(state.derived.suerteMax) || 0,
                            characterName: state.character && state.character.name ? state.character.name : '',
                        });
                    }
                } finally {
                    suppressOnUpdate = false;
                }
            }
        },

        updateDerived(partialDerived = {}) {
            if (!partialDerived || typeof partialDerived !== 'object') return;
            state.derived = { ...state.derived, ...partialDerived };

            if (mountedComponents.derived && typeof mountedComponents.derived.setState === 'function') {
                mountedComponents.derived.setState({
                    derived: state.derived,
                    hp: Number(state.character.hp) || 0,
                    tempHp: Number(state.character.tempHp) || 0,
                });
            }

            if (mountedComponents.attributes && typeof mountedComponents.attributes.setState === 'function') {
                mountedComponents.attributes.setState({
                    suerteMax: Number(state.derived.suerteMax) || 0,
                });
            }
        },
    };
};

export default SheetTab;
