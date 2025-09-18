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

    // Local registry for mounted subcomponents inside this tab.
    // Declared here to avoid ReferenceError when attempting to reuse or destroy
    // previously mounted subcomponents during re-renders.
    let mountedComponents = {};

    // Guard flag used to suppress onUpdate notifications while we programmatically
    // patch subcomponents. This prevents re-entrant notification loops when
    // updateCharacter/updateDerived call child.setState(...) that would otherwise
    // trigger state.onUpdate -> parent -> child loops.
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

        // Event delegation for input changes
        container.addEventListener('input', (e) => {
            if (e.target.id === 'gold') {
                handleGoldChange(e.target.value);
            } else if (e.target.id === 'languages') {
                handleLanguagesChange(e.target.value);
            }
        });

        // Event delegation for blur events (auto-save)
        container.addEventListener(
            'blur',
            (e) => {
                if (e.target.id === 'gold' || e.target.id === 'languages') {
                    // Trigger update if needed (guarded to avoid loops)
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

        // Open roll modal with modifiers and advantage/disadvantage
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

                // Create roll entry with explosion data
                const entry = {
                    type: 'attribute',
                    ts: Date.now(),
                    notation: `${attributeKey} (${attributeValue}d6${
                        result.d6Rolls && result.d6Rolls.length > 1 ? ` explotando` : ''
                    })`,
                    rolls: result.d6Rolls || [result.d6], // Use explosion rolls if available
                    total: result.total,
                    attribute: attributeKey,
                    attributeValue: attributeValue,
                    details: {
                        d6: result.d6,
                        d6Rolls: result.d6Rolls, // Individual explosion rolls
                        advMod: result.advMod,
                        advantage: result.advantage,
                        base: result.base,
                        extras: result.extras,
                        luck: result.luck,
                        exploded: result.d6Rolls && result.d6Rolls.length > 1, // Flag for explosion
                        parts: [
                            {
                                type: 'attribute',
                                attribute: attributeKey,
                                value: attributeValue,
                                notation: `${attributeValue}d6${
                                    result.d6Rolls && result.d6Rolls.length > 1 ? ` explotando` : ''
                                }`,
                                rolls: result.d6Rolls || [result.d6],
                                sum: result.total,
                                sign: 1,
                            },
                        ],
                    },
                };

                // Add to roll log
                if (!Array.isArray(state.character.rollLog)) {
                    state.character.rollLog = [];
                }
                state.character.rollLog.unshift(entry);

                // Limit roll log size
                if (state.character.rollLog.length > 50) {
                    state.character.rollLog.length = 50;
                }

                // Add to global roll store
                rollStore.addRoll({ ...entry, who: state.character.name });

                // Show toast with result using DiceService
                DiceService.showAttributeRoll({
                    characterName: state.character.name,
                    attributeName: attributeKey,
                    result: result,
                });

                // Update character (guarded to avoid reentrancy)
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

                // If component already mounted, re-use and update its state instead of re-creating it.
                if (mountedComponents.attributes && typeof mountedComponents.attributes.setState === 'function') {
                    // Provide a fallback set of attributes when the character has none
                    const initialAttrs =
                        state.character && state.character.attributes && Object.keys(state.character.attributes).length
                            ? { ...state.character.attributes }
                            : { Cuerpo: 1, Reflejos: 1, Mente: 1, Instinto: 1, Presencia: 1 };
                    mountedComponents.attributes.setState({
                        attributes: initialAttrs,
                        rules: state.rules,
                        suerte: Number(state.character.suerte) || 0,
                        suerteMax: Number(state.derived.suerteMax) || 0,
                        readOnly: state.readOnly,
                    });
                } else {
                    const initialAttrs =
                        state.character && state.character.attributes && Object.keys(state.character.attributes).length
                            ? { ...state.character.attributes }
                            : { Cuerpo: 1, Reflejos: 1, Mente: 1, Instinto: 1, Presencia: 1 };
                    const comp = AttributesPanel(attrsHost, {
                        attributes: initialAttrs,
                        rules: state.rules,
                        suerte: Number(state.character.suerte) || 0,
                        suerteMax: Number(state.derived.suerteMax) || 0,
                        onChange: (key, val) => {
                            // keep character updated (immutable update)
                            state.character.attributes = { ...state.character.attributes, [key]: val };
                            // Notify parent via onUpdate (parent may choose to do a full page update).
                            // We still expose separate updateDerived() so parent can recompute derived without re-render.
                            if (!suppressOnUpdate) state.onUpdate(state.character);
                        },
                        onRoll: (attributeKey) => {
                            handleAttributeRoll(attributeKey);
                        },
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
                        onChange: (items) => {
                            // Update the local character equipment list in-place.
                            state.character.equipmentList = items;
                            try {
                                // Guarded notification to avoid re-entrant loops when we programmatically
                                // update children. If suppressOnUpdate is active, skip notifying.
                                if (!suppressOnUpdate) {
                                    state.onUpdate(state.character);
                                    // Also dispatch a global save event so external listeners (e.g., the page)
                                    // can persist the change without causing re-entrant sheet updates.
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
                    mountedComponents.equipment = comp;
                }
            }
        } catch (error) {
            console.error('SheetTab: Error mounting EquipmentList:', error);
        }
    };

    const update = async () => {
        if (!container) return;

        // Log this update for diagnostics
        try {
            DebugUtils.logRender('SheetTab.update', { reason: 'update-called' });
        } catch (_) {}

        // If there are already mounted subcomponents, try to destroy them cleanly
        // This avoids keeping references to components bound to DOM nodes that will be replaced
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
        // Clear references so mountSubComponents will re-initialize components on the new DOM
        mountedComponents = {};

        container.innerHTML = render();
        bindEvents();
        // Instrument mounting subcomponents to measure time
        try {
            await DebugUtils.instrumentRender(
                'SheetTab.mountSubComponents',
                async () => {
                    await mountSubComponents();
                },
                { phase: 'mount' }
            );
        } catch (e) {
            // if instrumentation fails for any reason, fallback to normal mount
            await mountSubComponents();
        }
    };

    return {
        async init() {
            ensureStyle('./src/components/SheetTab/SheetTab.css');
            await update();
        },

        /**
         * Full setState - preserves current behavior (re-renders whole tab).
         * Parent code can still call this when a full refresh is required.
         */
        async setState(partial) {
            state = { ...state, ...partial };
            try {
                DebugUtils.logRender('SheetTab.setState', { keys: Object.keys(partial || {}) });
            } catch (_) {}
            // Always update to ensure components are properly rendered
            await update();
        },

        /**
         * updateCharacter(partial) - apply small changes to the character object and
         * patch mounted subcomponents / DOM inputs without re-rendering the whole tab.
         *
         * Example usage: sheet.updateCharacter({ gold: 10, languages: 'Común' })
         */
        updateCharacter(partial = {}) {
            if (!partial || typeof partial !== 'object') return;
            // Merge character shallowly
            state.character = { ...state.character, ...partial };

            // Patch simple DOM inputs inside this tab (gold, languages) if present
            try {
                const goldInput = container.querySelector('#gold');
                if (goldInput && partial.hasOwnProperty('gold')) {
                    goldInput.value = Number(partial.gold) || 0;
                }
                const languagesInput = container.querySelector('#languages');
                if (languagesInput && partial.hasOwnProperty('languages')) {
                    languagesInput.value = partial.languages || '';
                }
            } catch (_) {}

            // Update mounted subcomponents that reflect character data.
            // Suppress onUpdate notifications while we programmatically update children
            // to avoid re-entrant loops (child.setState -> child.onChange -> parent.onUpdate -> child.updateCharacter).
            if (
                (mountedComponents.attributes && typeof mountedComponents.attributes.setState === 'function') ||
                (mountedComponents.equipment && typeof mountedComponents.equipment.setState === 'function')
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
                        });
                    }
                } finally {
                    suppressOnUpdate = false;
                }
            }
        },

        /**
         * updateDerived(partialDerived) - patch derived stats (salud, esquiva, velocidad, etc.)
         * and notify the DerivedStatsPanel to update without re-rendering the whole tab.
         */
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

            // Some components (attributes) may depend on derived values such as suerteMax
            if (mountedComponents.attributes && typeof mountedComponents.attributes.setState === 'function') {
                mountedComponents.attributes.setState({
                    suerteMax: Number(state.derived.suerteMax) || 0,
                });
            }
        },
    };
};

export default SheetTab;
