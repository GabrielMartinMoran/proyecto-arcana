const html = window.html || String.raw;
import PanelHeader from '../PanelHeader/PanelHeader.js';
import { ensureStyle } from '../../utils/style-utils.js';
import { openRollModal } from '../../pages/CharactersPage/RollModal.js';
import DiceService from '../../services/dice-service.js';

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
                            <input class="long-input" type="number" id="gold" min="0" step="1" value="${c.gold || 0}" ${readOnly ? 'disabled' : ''} />
                        </div>
                    </div>
                </div>
                <div class="panel">
                    ${PanelHeader({ title: 'Lenguas' })}
                    <input id="languages" type="text" class="languages-input" value="${c.languages || ''}" ${readOnly ? 'disabled' : ''} />
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
        container.addEventListener('blur', (e) => {
            if (e.target.id === 'gold' || e.target.id === 'languages') {
                // Trigger update if needed
                state.onUpdate(state.character);
            }
        }, true);
    };

    const handleGoldChange = (value) => {
        const gold = Number(value) || 0;
        state.character.gold = gold;
        state.onUpdate(state.character);
    };

    const handleLanguagesChange = (value) => {
        state.character.languages = value.trim();
        state.onUpdate(state.character);
    };

    const handleAttributeRoll = (attributeKey) => {
        const attributeValue = state.character.attributes?.[attributeKey] || 0;
        if (attributeValue <= 0) return;

        // Open roll modal with modifiers and advantage/disadvantage
        openRollModal(container, {
            attributeName: attributeKey,
            attributeValue: attributeValue,
            maxSuerte: Number(state.derived.suerteMax) || 0,
            currentSuerte: Number(state.character.suerte) || 0
        }, (result) => {
            if (!result) return;

            // Deduct luck if used
            if (result.luck > 0) {
                state.character.suerte = Math.max(0, (state.character.suerte || 0) - result.luck);
            }

            // Create roll entry
            const entry = {
                type: 'attribute',
                ts: Date.now(),
                notation: `${attributeKey} (${attributeValue}d6)`,
                rolls: [result.d6],
                total: result.total,
                attribute: attributeKey,
                attributeValue: attributeValue,
                details: {
                    d6: result.d6,
                    advMod: result.advMod,
                    advantage: result.advantage,
                    base: result.base,
                    extras: result.extras,
                    luck: result.luck,
                    parts: [{
                        type: 'attribute',
                        attribute: attributeKey,
                        value: attributeValue,
                        notation: `${attributeValue}d6`,
                        rolls: [result.d6],
                        sum: result.total,
                        sign: 1
                    }]
                }
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

            // Show toast with result using DiceService
            DiceService.showAttributeRoll({
                characterName: state.character.name,
                attributeName: attributeKey,
                result: result
            });

            // Update character
            state.onUpdate(state.character);
        });
    };

    const mountSubComponents = async () => {
        // Mount AttributesPanel
        try {
            const attrsHost = container.querySelector('#attributes-host');
            if (attrsHost && state.rules) {
                const AttributesPanel = (await import('../AttributesPanel/AttributesPanel.js')).default;
                const comp = AttributesPanel(attrsHost, {
                    attributes: { ...state.character.attributes },
                    rules: state.rules,
                    suerte: Number(state.character.suerte) || 0,
                    suerteMax: Number(state.derived.suerteMax) || 0,
                    onChange: (key, val) => {
                        state.character.attributes[key] = val;
                        state.onUpdate(state.character);
                    },
                    onRoll: (attributeKey) => {
                        handleAttributeRoll(attributeKey);
                    },
                    onLuckChange: (val) => {
                        state.character.suerte = val;
                        state.onUpdate(state.character);
                    },
                });
                comp.init();
            }
        } catch (error) {
            console.error('SheetTab: Error mounting AttributesPanel:', error);
        }

        // Mount DerivedStatsPanel
        try {
            const derivedHost = container.querySelector('#derived-host');
            if (derivedHost && state.derived) {
                const DerivedStatsPanel = (await import('../DerivedStatsPanel/DerivedStatsPanel.js')).default;
                const comp = DerivedStatsPanel(derivedHost, {
                    derived: state.derived,
                    hp: Number(state.character.hp) || 0,
                    tempHp: Number(state.character.tempHp) || 0,
                    onHpChange: (hpVal) => {
                        state.character.hp = hpVal;
                        state.onUpdate(state.character);
                    },
                    onTempHpChange: (tempVal) => {
                        state.character.tempHp = tempVal;
                        state.onUpdate(state.character);
                    },
                });
                comp.init();
            }
        } catch (_) {}

        // Mount EquipmentList
        try {
            const equipHost = container.querySelector('#equip-list');
            if (equipHost) {
                const EquipmentList = (await import('../EquipmentList/EquipmentList.js')).default;
                const comp = EquipmentList(equipHost, {
                    items: Array.isArray(state.character.equipmentList) ? state.character.equipmentList : [],
                    onChange: (items) => {
                        state.character.equipmentList = items;
                        state.onUpdate(state.character);
                    },
                });
                comp.init();
            }
        } catch (_) {}
    };

    const update = async () => {
        if (!container) return;
        container.innerHTML = render();
        bindEvents();
        await mountSubComponents();
    };

    return {
        async init() {
            ensureStyle('./src/components/SheetTab/SheetTab.css');
            await update();
        },
        async setState(partial) {
            state = { ...state, ...partial };
            await update();
        },
    };
};

export default SheetTab;