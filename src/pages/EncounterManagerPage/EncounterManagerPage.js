const html = window.html || String.raw;

import LayoutWithSidebar from '../../components/LayoutWithSidebar/LayoutWithSidebar.js';
import { ensureStyles } from '../../utils/style-utils.js';
import CharacterList from '../../components/CharacterList/CharacterList.js';
import StorageUtils from '../../utils/storage-utils.js';
import CardService from '../../services/card-service.js';
import { renderBestiaryStatblock } from '../../components/BestiaryStatblock/BestiaryStatblock.js';
import {
    renderBestiaryStatblockWithRolls,
    bindBestiaryRollEvents,
} from '../../components/BestiaryStatblock/BestiaryStatblockWithRolls.js';
import CharacterSheet from '../../components/CharacterSheet/CharacterSheet.js';
import AttributesPanel from '../../components/AttributesPanel/AttributesPanel.js';
import DerivedStatsPanel from '../../components/DerivedStatsPanel/DerivedStatsPanel.js';
import CardComponent from '../../components/CardComponent/CardComponent.js';
import rollStore from '../../services/roll-store.js';
import { RULES, computeDerivedStats, applyModifiersToDerived } from '../../models/rules.js';
import EquipmentList from '../../components/EquipmentList/EquipmentList.js';
import EncounterParticipantPicker from '../../components/EncounterParticipantPicker/EncounterParticipantPicker.js';
import { mountImageWithFallback } from '../../utils/image-utils.js';
import DiceTabController from '../../components/DiceTab/DiceTabController.js';
import DiceTab from '../../components/DiceTab/DiceTab.js';
import ProgressTabController from '../../components/ProgressTab/ProgressTabController.js';
import { openRollModal } from '../CharactersPage/RollModal.js';
// 3D dice removed (no-op helpers retained)

const STORAGE_KEY_CHARACTERS = 'arcana:characters';
const STORAGE_KEY_ENCOUNTER = 'arcana:encounter';

const EncounterManagerPage = (container) => {
    let state = {
        party: StorageUtils.load(STORAGE_KEY_CHARACTERS, []),
        beasts: [],
        tracker: [], // [{type: 'pc'|'npc', id, name, img?, hp?, maxHp?, data, init? }]
        allCards: [],
        activeIdx: 0,
        log: [],
    };

    const loadStyles = () => {
        ensureStyles([
            './src/pages/CharactersPage/CharactersPage.css',
            './src/components/CardComponent/CardComponent.css',
            './src/pages/EncounterManagerPage/EncounterManagerPage.css',
        ]);
    };

    const render = () => html` <div id="layout"></div> `;

    const renderTrackerItem = (it, idx) => {
        const initial = (it.name || '?').trim().charAt(0).toUpperCase();
        const active = state.activeIdx === idx ? 'active' : '';
        const avatar = it.img ? html`<img src="${it.img}" alt="" referrerpolicy="no-referrer" />` : '';
        return html`<li>
            <button class="item ${active}" data-idx="${idx}">
                <span class="avatar ${it.img ? '' : 'placeholder'}"
                    >${avatar}<span class="initial">${initial}</span></span
                >
                <span class="item-name">${it.init != null ? `[${it.init}] ` : ''}${it.name}</span>
            </button>
        </li>`;
    };

    const renderMain = () => {
        const active = state.tracker[state.activeIdx];
        return html`
            <div class="characters">
                <div id="tracker-list"></div>
                <section class="characters-editor">
                    ${active
                        ? html`<div id="sheet-root"></div>`
                        : html`<div class="empty-state encounter-empty">Añade participantes al encuentro</div>`}
                </section>
            </div>
            <section class="encounter-log-section">
                <div class="panel">
                    <div class="panel-header" style="display:flex; justify-content:space-between; align-items:center;">
                        <label>Historial de tiradas</label>
                        <button class="button" data-log-clear title="Limpiar log">Limpiar</button>
                    </div>
                    <div class="global-log" id="global-log"></div>
                </div>
            </section>
        `;
    };

    const bind = (root) => {
        // Mount tracker sidebar
        const listRoot = root.querySelector('#tracker-list');
        const headerHtml = html`<div class="buttons-container encounter-toolbar">
            <button class="button" data-add-pc>➕ PC</button>
            <button class="button" data-add-npc>➕ Grupo de NPCs</button>
            <button class="button" data-roll-init title="Tirar iniciativa">🎲 Iniciativa</button>
            <button class="button" data-clear-encounter title="Nuevo encuentro">🗑️ Nuevo</button>
        </div>`;
        const list = CharacterList(listRoot, {
            items: state.tracker,
            selectedIndex: state.activeIdx,
            getName: (it) => `${it && it.name ? it.name : ''}`,
            getPortraitUrl: (it) => it.img || '',
            renderRight: (it, i) => {
                const quantityText =
                    it.type === 'npc-group' && it.quantity > 1
                        ? html`<span class="quantity-badge">x${it.quantity}</span>`
                        : '';
                return html`${quantityText}<input
                        class="init-input"
                        type="number"
                        step="1"
                        placeholder="-"
                        value="${it.init != null ? it.init : ''}"
                        data-init-idx="${i}"
                        title="Iniciativa"
                    />`;
            },
            onAfterRender: (host) => {
                host.querySelectorAll('.init-input').forEach((inp) => {
                    inp.addEventListener('click', (e) => e.stopPropagation());
                    const apply = () => {
                        const idx = Number(inp.getAttribute('data-init-idx')) || 0;
                        const val = inp.value;
                        const v = val === '' ? null : Number(val) || 0;
                        const item = state.tracker[idx];
                        if (!item) return;
                        item.init = v;
                        state.tracker.sort((a, b) => Number(b.init || 0) - Number(a.init || 0));
                        state.activeIdx = Math.max(
                            0,
                            state.tracker.findIndex((t) => t === item)
                        );
                        persistEncounter();
                        update();
                    };
                    inp.addEventListener('blur', apply);
                    inp.addEventListener('keydown', (e) => {
                        if (e.key === 'Enter') {
                            e.preventDefault();
                            inp.blur();
                        }
                    });
                });
            },
            headerHtml,
            onSelect: (i) => {
                state.activeIdx = i;
                update();
            },
        });
        list.init();

        const openAddModal = async (mode) => {
            if (mode === 'npc' && !state.beasts.length) {
                try {
                    const res = await fetch('config/bestiary.yml', { cache: 'no-store' });
                    const txt = await res.text();
                    const y = window.jsyaml.load(txt);
                    state.beasts = Array.isArray(y) ? y : Array.isArray(y && y.creatures) ? y.creatures : [];
                } catch (_) {}
            }
            // Create a dedicated container for the modal
            const modalContainer = document.createElement('div');
            document.body.appendChild(modalContainer);
            const host = modalContainer;
            const picker = EncounterParticipantPicker(host, {
                mode,
                party: state.party,
                beasts: state.beasts,
                tracker: state.tracker,
                onPick: (it) => {
                    if (mode === 'pc') {
                        state.tracker.push({
                            type: 'pc',
                            id: it.id,
                            name: it.name,
                            img: it.portraitUrl || '',
                            init: null,
                        });
                    } else {
                        // Handle creature groups
                        if (it.isGroup && it.quantity > 1) {
                            // Add as a group
                            const hp = Number(it?.stats?.salud) || 0;
                            state.tracker.push({
                                type: 'npc-group',
                                id: `group-${it.name}-${Date.now()}`,
                                name: it.name,
                                img: it.img || '',
                                hp,
                                maxHp: hp,
                                data: it,
                                init: null,
                                rollLog: [],
                                quantity: it.quantity,
                                // Maintain a monotonically increasing index so creature names/ids are persistent
                                nextCreatureIndex: it.quantity,
                                creatures: Array.from({ length: it.quantity }, (_, i) => ({
                                    id: `${it.name}-${i + 1}`,
                                    name: `${it.name} ${i + 1}`,
                                    hp: hp,
                                    maxHp: hp,
                                    data: it,
                                    rollLog: [],
                                })),
                            });
                        } else {
                            // Add as single creature
                            const hp = Number(it?.stats?.salud) || 0;
                            state.tracker.push({
                                type: 'npc',
                                id: it.name,
                                name: it.name,
                                img: it.img || '',
                                hp,
                                maxHp: hp,
                                data: it,
                                init: null,
                                rollLog: [],
                            });
                        }
                    }
                    state.activeIdx = state.tracker.length - 1;
                    update();
                },
            });
            picker.init();
            await picker.open();
        };

        const addPc = root.querySelector('[data-add-pc]');
        if (addPc) addPc.addEventListener('click', () => openAddModal('pc'));
        const addNpc = root.querySelector('[data-add-npc]');
        if (addNpc) addNpc.addEventListener('click', () => openAddModal('npc'));
        const rollInit = root.querySelector('[data-roll-init]');
        if (rollInit)
            rollInit.addEventListener('click', () => {
                const roll = () => 1 + Math.floor(Math.random() * 20);
                state.tracker.forEach((t) => (t.init = roll()));
                state.tracker.sort((a, b) => Number(b.init || 0) - Number(a.init || 0));
                state.activeIdx = 0;
                persistEncounter();
                update();
            });
        const clearBtn = root.querySelector('[data-clear-encounter]');
        if (clearBtn)
            clearBtn.addEventListener('click', () => {
                const ok = window.confirm('¿Iniciar un nuevo encuentro? Se perderán participantes e historial.');
                if (!ok) return;
                state.tracker = [];
                state.activeIdx = 0;
                state.log = [];
                persistEncounter();
                update();
            });

        // Mount detail editor
        const sheetRoot = root.querySelector('#sheet-root');
        const active = state.tracker[state.activeIdx];
        if (!active || !sheetRoot) return;

        if (active.type === 'pc') {
            const c = state.party.find((p) => p.id === active.id);
            if (!c) {
                sheetRoot.innerHTML = html`<div class="empty-state">Personaje no encontrado</div>`;
                return;
            }
            // Ensure required fields for Cards tab
            if (!Array.isArray(c.cards)) c.cards = [];
            if (!Array.isArray(c.activeCards)) c.activeCards = [];
            if (typeof c.activeSlots !== 'number') c.activeSlots = RULES.startingActiveCards;
            const derivedBase = computeDerivedStats(c.attributes);
            const ndBase = {
                ndMente: RULES.ndBase + (Number(c.attributes.Mente) || 0),
                ndInstinto: RULES.ndBase + (Number(c.attributes.Instinto) || 0),
            };
            const luckBase = { suerteMax: RULES.maxLuck };
            const derived = applyModifiersToDerived(
                { ...derivedBase, ...ndBase, ...luckBase, mitigacion: Number(c.mitigacion) || 0 },
                c
            );
            const facets = CardService.getFacets(state.allCards || []);
            const sheetState = {
                tab: 'sheet',
                allCards: state.allCards || [],
                facets,
                cardFilters: { levels: [], types: [], attributes: [], tags: [] },
                addOnlyEligible: true,
                filtersOpenAdd: false,
                cardSearch: '',
                focusCardSearch: false,
            };
            const sheet = CharacterSheet(sheetRoot, {
                state: sheetState,
                character: c,
                services: { CardService, meetsRequirements: () => true, RULES },
                derived,
                options: { readOnly: false, lockName: true },
                hooks: {
                    onBind: (ed) => {
                        // Tabs
                        ed.querySelectorAll('.tab').forEach((t) =>
                            t.addEventListener('click', () => {
                                const tab = t.getAttribute('data-tab');
                                sheet.setState({ tab });
                            })
                        );
                        // Mount panels if their hosts exist (works across tabs)
                        try {
                            const attrsHost = ed.querySelector('#attributes-host');
                            if (attrsHost) {
                                console.log('DEBUG: Mounting AttributesPanel for NPC:', c.name);
                                const comp = AttributesPanel(attrsHost, {
                                    attributes: { ...c.attributes },
                                    rules: RULES,
                                    suerte: Number(c.suerte) || 0,
                                    suerteMax: Number(derived.suerteMax) || 0,
                                    onChange: (key, val) => {
                                        c.attributes[key] = val;
                                        persistEncounter();
                                    },
                                    onRoll: (key) => {
                                        console.log('DEBUG: AttributesPanel onRoll called with key:', key);
                                        const val = Number(c.attributes[key]) || 0;
                                        console.log('DEBUG: Attribute value:', val);
                                        const base = computeDerivedStats(active.attributes);
                                        const ndBase2 = {
                                            ndMente: RULES.ndBase + (Number(active.attributes.Mente) || 0),
                                            ndInstinto: RULES.ndBase + (Number(active.attributes.Instinto) || 0),
                                        };
                                        const luckBase2 = { suerteMax: RULES.maxLuck };
                                        const derivedNow = applyModifiersToDerived(
                                            {
                                                ...base,
                                                ...ndBase2,
                                                ...luckBase2,
                                                mitigacion: Number(active.mitigacion) || 0,
                                            },
                                            active
                                        );
                                        console.log('DEBUG: Opening roll modal for:', key, 'with value:', val);
                                        openRollModal(
                                            document.body,
                                            {
                                                attributeName: key,
                                                attributeValue: val,
                                                maxSuerte: Number(derivedNow.suerteMax) || 0,
                                            },
                                            (res) => {
                                                console.log('DEBUG: Roll modal callback called with result:', res);
                                                if (res && res.luck)
                                                    active.suerte = Math.max(0, (active.suerte || 0) - res.luck);
                                                if (res) {
                                                    const entry = {
                                                        type: 'attribute',
                                                        ts: Date.now(),
                                                        attribute: key,
                                                        total: res.total,
                                                        details: {
                                                            d6: res.d6,
                                                            advMod: res.advMod,
                                                            advantage: res.advantage,
                                                            base: val,
                                                            extras: res.extras,
                                                            luck: res.luck,
                                                        },
                                                    };
                                                    active.rollLog = Array.isArray(active.rollLog)
                                                        ? active.rollLog
                                                        : [];
                                                    active.rollLog.unshift(entry);
                                                    if (active.rollLog.length > 200) active.rollLog.length = 200;
                                                    // Global log - use character name (active is the specific NPC)
                                                    const globalEntry = { ...entry, who: active.name };
                                                    console.log('DEBUG: Adding to global log:', globalEntry);
                                                    state.log.unshift(globalEntry);
                                                    if (state.log.length > 200) state.log.length = 200;
                                                    console.log('DEBUG: Global log length:', state.log.length);
                                                    console.log('DEBUG: Global log entries:', state.log.slice(0, 3));
                                                }
                                                persistEncounter();
                                                update();
                                                // Update global log display
                                                if (state._renderLog) state._renderLog();
                                            }
                                        );
                                    },
                                    onLuckChange: (val) => {
                                        c.suerte = val;
                                    },
                                });
                                comp.init();
                            }
                        } catch (_) {}
                        // Equipment (editable for PCs)
                        try {
                            const equipHost = ed.querySelector('#equip-list');
                            if (equipHost) {
                                const compEq = EquipmentList(equipHost, {
                                    items: Array.isArray(c.equipmentList) ? c.equipmentList : [],
                                    onChange: (items) => {
                                        c.equipmentList = items;
                                        persistEncounter();
                                    },
                                    readOnly: false,
                                });
                                compEq.init();
                            }
                        } catch (_) {}
                        try {
                            const derHost = ed.querySelector('#derived-host');
                            if (derHost) {
                                const comp2 = DerivedStatsPanel(derHost, {
                                    derived,
                                    hp: Number(c.hp) || 0,
                                    tempHp: Number(c.tempHp) || 0,
                                    onHpChange: (val) => {
                                        c.hp = val;
                                    },
                                    onTempHpChange: (val) => {
                                        c.tempHp = val;
                                    },
                                });
                                comp2.init();
                            }
                        } catch (_) {}
                        // Mount cards visuals wherever card slots appear
                        ed.querySelectorAll('.card-slot').forEach((slot) => {
                            const id = slot.getAttribute('data-id');
                            const card = (sheetState.allCards || []).find((x) => x.id === id);
                            if (!card) return;
                            const comp = CardComponent(slot, { card, actionsRenderer: () => '' });
                            comp.init();
                        });
                        // Mount portrait image (Bio tab)
                        try {
                            const pm = ed.querySelector('#portrait-mount');
                            if (pm) {
                                mountImageWithFallback(pm, {
                                    src: c && c.portraitUrl ? String(c.portraitUrl) : '',
                                    alt: `Retrato de ${c && c.name ? c.name : 'Personaje'}`,
                                    className: 'portrait-img',
                                    placeholderText: 'Sin retrato',
                                });
                            }
                        } catch (_) {}
                        // Mount controllers for Dice and Progress
                        try {
                            const diceCtrl = DiceTabController(ed, {
                                character: c,
                                onRoll: (e) => {
                                    state.log.unshift({ ...e, who: c.name });
                                    if (state.log.length > 200) state.log.length = 200;
                                    persistEncounter();
                                    if (state._renderLog) state._renderLog();
                                },
                            });
                            diceCtrl.init();
                        } catch (_) {}
                        try {
                            const progCtrl = ProgressTabController(ed, { character: c });
                            progCtrl.init();
                        } catch (_) {}
                        persistEncounter();
                    },
                },
            });
            sheet.init();
        } else {
            // NPC: tabs Hoja / Dados
            const b = active.data;
            const npcState = { tab: 'sheet', selectedCreature: active.type === 'npc-group' ? 0 : null };
            const renderNpc = () => {
                const isGroup = active.type === 'npc-group';

                if (isGroup) {
                    // Group layout with individual creature tabs
                    return html`
                        <div
                            class="editor-header"
                            style="display: flex; justify-content: space-between; align-items: center;"
                        >
                            <div
                                class="name-input"
                                style="border:1px solid var(--border-color); border-radius: var(--radius-md); padding: .5rem .75rem; background:#fff;"
                            >
                                ${b.name} (Grupo de ${active.quantity})
                            </div>
                            <button class="button small" id="add-creature">➕ Agregar NPC</button>
                        </div>

                        <!-- Individual Creature Tabs -->
                        <div class="tabs">
                            ${active.creatures
                                .map(
                                    (creature, idx) => html`
                                        <button
                                            class="tab ${npcState.selectedCreature === idx ? 'active' : ''}"
                                            data-creature-idx="${idx}"
                                        >
                                            ${creature.name}
                                        </button>
                                    `
                                )
                                .join('')}
                            <span class="tab-spacer"></span>
                            <button class="tab ${npcState.tab === 'dice' ? 'active' : ''} tab-right" data-tab="dice">
                                Dados
                            </button>
                        </div>

                        <!-- Creature Content -->
                        ${npcState.tab === 'dice'
                            ? html`<div id="dice-tab-container"></div>`
                            : npcState.selectedCreature !== null
                              ? html`
                                    <div class="panel">
                                        <div
                                            style="margin-bottom:.75rem; display:flex; gap:1rem; align-items:center; justify-content: space-between;"
                                        >
                                            <div style="display: flex; gap: 1rem; align-items: center;">
                                                <label>HP</label>
                                                <input
                                                    type="number"
                                                    id="npc-hp"
                                                    min="0"
                                                    step="1"
                                                    value="${active.creatures[npcState.selectedCreature].hp || 0}"
                                                />
                                                /
                                                <strong
                                                    >${active.creatures[npcState.selectedCreature].maxHp || 0}</strong
                                                >
                                            </div>
                                            <button
                                                class="button small"
                                                id="remove-creature"
                                                title="Quitar este NPC del grupo"
                                                style="width: 2rem; height: 2rem; padding: 0; display: flex; align-items: center; justify-content: center;"
                                            >
                                                🗑️
                                            </button>
                                        </div>
                                        <div id="attributes-host"></div>
                                        ${renderBestiaryStatblockWithRolls(b)}
                                    </div>
                                `
                              : ''}
                    `;
                } else {
                    // Single NPC layout
                    return html`
                        <div class="editor-header">
                            <div
                                class="name-input"
                                style="border:1px solid var(--border-color); border-radius: var(--radius-md); padding: .5rem .75rem; background:#fff;"
                            >
                                ${b.name}
                            </div>
                        </div>
                        <div class="tabs">
                            <button class="tab ${npcState.tab === 'sheet' ? 'active' : ''}" data-tab="sheet">
                                Hoja
                            </button>
                            <span class="tab-spacer"></span>
                            <button class="tab ${npcState.tab === 'dice' ? 'active' : ''} tab-right" data-tab="dice">
                                Dados
                            </button>
                        </div>
                        ${npcState.tab === 'sheet'
                            ? html`<div class="panel">
                                  <div style="margin-bottom:.75rem; display:flex; gap:1rem; align-items:center;">
                                      <label>HP</label>
                                      <input type="number" id="npc-hp" min="0" step="1" value="${active.hp || 0}" /> /
                                      <strong>${active.maxHp || 0}</strong>
                                  </div>
                                  <div id="attributes-host"></div>
                                  ${renderBestiaryStatblockWithRolls(b)}
                              </div>`
                            : html`<div id="dice-tab-container"></div>`}
                    `;
                }
            };
            const mountNpc = () => {
                sheetRoot.innerHTML = renderNpc();

                // Handle different tab types
                if (active.type === 'npc-group') {
                    // Group creature tabs
                    sheetRoot.querySelectorAll('[data-creature-idx]').forEach((t) => {
                        t.addEventListener('click', () => {
                            npcState.selectedCreature = Number(t.getAttribute('data-creature-idx'));
                            npcState.tab = 'sheet'; // Reset to sheet tab when selecting creature
                            mountNpc();
                        });
                    });

                    // Dice tab for groups
                    sheetRoot.querySelectorAll('[data-tab="dice"]').forEach((t) => {
                        t.addEventListener('click', () => {
                            npcState.tab = 'dice';
                            mountNpc();
                        });
                    });

                    // Add creature button
                    const addCreatureBtn = sheetRoot.querySelector('#add-creature');
                    if (addCreatureBtn) {
                        addCreatureBtn.addEventListener('click', () => {
                            // Use a monotonic nextCreatureIndex so removed indices are not reused.
                            active.nextCreatureIndex = (active.nextCreatureIndex || active.quantity || 0) + 1;
                            const newIndex = active.nextCreatureIndex;
                            active.quantity = (active.quantity || 0) + 1;
                            active.creatures.push({
                                id: `${active.data.name}-${newIndex}`,
                                name: `${active.data.name} ${newIndex}`,
                                hp: active.maxHp,
                                maxHp: active.maxHp,
                                data: active.data,
                                rollLog: [],
                            });
                            persistEncounter();
                            mountNpc();
                        });
                    }

                    // Remove specific creature button
                    const removeCreatureBtn = sheetRoot.querySelector('#remove-creature');
                    if (removeCreatureBtn) {
                        removeCreatureBtn.addEventListener('click', () => {
                            if (active.quantity > 1 && npcState.selectedCreature !== null) {
                                // Remove the selected creature; do NOT rename remaining creatures.
                                active.creatures.splice(npcState.selectedCreature, 1);
                                active.quantity = active.quantity - 1;

                                // Adjust selected creature index if it now points past the end
                                if (npcState.selectedCreature >= active.quantity) {
                                    npcState.selectedCreature = Math.max(0, active.quantity - 1);
                                }

                                // Intentionally DO NOT reassign names/ids for remaining creatures.
                                // This preserves the original numbering and avoids reuse of indices.

                                persistEncounter();
                                mountNpc();
                            }
                        });
                    }

                    // HP input for selected creature
                    const hpInp = sheetRoot.querySelector('#npc-hp');
                    if (hpInp) {
                        hpInp.addEventListener('input', (e) => {
                            if (npcState.selectedCreature !== null) {
                                active.creatures[npcState.selectedCreature].hp = Math.max(
                                    0,
                                    Number(e.target.value) || 0
                                );
                                persistEncounter();
                            }
                        });
                    }
                } else {
                    // Single NPC tabs
                    sheetRoot.querySelectorAll('.tab').forEach((t) =>
                        t.addEventListener('click', () => {
                            npcState.tab = t.getAttribute('data-tab');
                            mountNpc();
                        })
                    );

                    // HP input for single NPC
                    const hpInp = sheetRoot.querySelector('#npc-hp');
                    if (hpInp)
                        hpInp.addEventListener('input', (e) => {
                            active.hp = Math.max(0, Number(e.target.value) || 0);
                            persistEncounter();
                        });
                }
                if (npcState.tab === 'dice') {
                    try {
                        const diceContainer = sheetRoot.querySelector('#dice-tab-container');
                        if (diceContainer) {
                            // Determine the correct character for groups
                            const characterForDiceTab =
                                active.type === 'npc-group' && npcState.selectedCreature !== null
                                    ? active.creatures[npcState.selectedCreature]
                                    : active;

                            const diceTab = DiceTab(diceContainer, {
                                character: characterForDiceTab,
                                onRoll: (e) => {
                                    // Determine the correct character name for groups
                                    const characterName =
                                        active.type === 'npc-group' && npcState.selectedCreature !== null
                                            ? active.creatures[npcState.selectedCreature].name
                                            : active.name;

                                    // Add to roll store
                                    rollStore.addRoll({ ...e, who: characterName });

                                    persistEncounter();
                                },
                            });
                            diceTab.init();
                        }
                    } catch (_) {}
                }

                // Bind roll events for the creature (after all other bindings)
                if ((active.type === 'npc' || active.type === 'npc-group') && b) {
                    if (active.type === 'npc-group' && npcState.selectedCreature !== null) {
                        // For groups, use the selected creature's data
                        const selectedCreature = active.creatures[npcState.selectedCreature];
                        bindBestiaryRollEvents(
                            sheetRoot,
                            {
                                ...b,
                                name: selectedCreature.name,
                            },
                            active,
                            npcState.selectedCreature,
                            () => {
                                persistEncounter();
                            }
                        );
                    } else {
                        // For single NPCs, use the original data
                        bindBestiaryRollEvents(sheetRoot, b, active, null, () => {
                            persistEncounter();
                        });
                    }
                }
            };
            mountNpc();

            // Mount AttributesPanel for NPCs if we're in sheet tab
            if (npcState.tab === 'sheet') {
                try {
                    const attrsHost = sheetRoot.querySelector('#attributes-host');
                    if (attrsHost) {
                        const comp = AttributesPanel(attrsHost, {
                            attributes: { ...active.attributes },
                            rules: RULES,
                            suerte: Number(active.suerte) || 0,
                            suerteMax: Number(derived.suerteMax) || 0,
                            onChange: (key, val) => {
                                active.attributes[key] = val;
                                persistEncounter();
                            },
                            onRoll: (key) => {
                                const val = Number(active.attributes[key]) || 0;
                                const base = computeDerivedStats(active.attributes);
                                const ndBase2 = {
                                    ndMente: RULES.ndBase + (Number(active.attributes.Mente) || 0),
                                    ndInstinto: RULES.ndBase + (Number(active.attributes.Instinto) || 0),
                                };
                                const luckBase2 = { suerteMax: RULES.maxLuck };
                                const derivedNow = applyModifiersToDerived(
                                    { ...base, ...ndBase2, ...luckBase2, mitigacion: Number(active.mitigacion) || 0 },
                                    active
                                );
                                openRollModal(
                                    document.body,
                                    {
                                        attributeName: key,
                                        attributeValue: val,
                                        maxSuerte: Number(derivedNow.suerteMax) || 0,
                                    },
                                    (res) => {
                                        if (res && res.luck)
                                            active.suerte = Math.max(0, (active.suerte || 0) - res.luck);
                                        if (res) {
                                            const entry = {
                                                type: 'attribute',
                                                ts: Date.now(),
                                                attribute: key,
                                                total: res.total,
                                                details: {
                                                    d6: res.d6,
                                                    d6Rolls: res.d6Rolls, // Include explosion rolls
                                                    advMod: res.advMod,
                                                    advantage: res.advantage,
                                                    base: val,
                                                    extras: res.extras,
                                                    luck: res.luck,
                                                    exploded: res.d6Rolls && res.d6Rolls.length > 1,
                                                },
                                            };
                                            active.rollLog = Array.isArray(active.rollLog) ? active.rollLog : [];
                                            active.rollLog.unshift(entry);
                                            if (active.rollLog.length > 200) active.rollLog.length = 200;
                                            // Add to roll store
                                            rollStore.addRoll({
                                                ...entry,
                                                who: active.name,
                                            });
                                        }
                                        persistEncounter();
                                        update();
                                    }
                                );
                            },
                            onLuckChange: (val) => {
                                active.suerte = val;
                            },
                        });
                        comp.init();
                    }
                } catch (_) {}
            }
        }

        // Mount global log
        const logRoot = container.querySelector('#global-log');
        const btnClear = container.querySelector('[data-log-clear]');

        const renderLog = () => {
            const rolls = rollStore.getRolls();

            const rows = rolls
                .map((e, i) => {
                    const who = e.who || '—';
                    if (e.type === 'dice') {
                        const rolls = Array.isArray(e.rolls) ? e.rolls.join(', ') : '';
                        return html`<div class="log-row">
                            <span class="log-text"
                                >[${who}] ${e.notation} → <strong>${e.total}</strong>${rolls
                                    ? html` (${rolls})`
                                    : ''}</span
                            ><button
                                class="button icon-only"
                                data-log-del="${e.id}"
                                aria-label="Eliminar"
                                title="Eliminar"
                            >
                                🗑️
                            </button>
                        </div>`;
                    }
                    if (e.type === 'attribute') {
                        const d6Rolls = e.details?.d6Rolls || [e.details?.d6];
                        let rolls = '';
                        if (Array.isArray(d6Rolls)) {
                            rolls = d6Rolls
                                .map((roll, index) => {
                                    // Add explosion emoji for 6s (except the last one if it's not a 6)
                                    if (roll === 6 && index < d6Rolls.length - 1) {
                                        return `${roll}💥`;
                                    }
                                    return roll;
                                })
                                .join(', ');
                        } else if (d6Rolls) {
                            rolls = String(d6Rolls);
                        }
                        const exploded = e.details?.exploded ? ' explotando' : '';
                        return html`<div class="log-row">
                            <span class="log-text"
                                >[${who}] ${e.attribute} (${e.details?.base || 0}d6${exploded}) →
                                <strong>${e.total}</strong>${rolls ? html` (${rolls})` : ''}</span
                            ><button
                                class="button icon-only"
                                data-log-del="${e.id}"
                                aria-label="Eliminar"
                                title="Eliminar"
                            >
                                🗑️
                            </button>
                        </div>`;
                    }
                    // fallback
                    return html`<div class="log-row">
                        <span class="log-text"
                            >[${who}] ${e.notation || e.type || ''} → <strong>${e.total || ''}</strong></span
                        ><button class="button icon-only" data-log-del="${e.id}" aria-label="Eliminar" title="Eliminar">
                            🗑️
                        </button>
                    </div>`;
                })
                .join('');

            if (logRoot) {
                logRoot.innerHTML = rows || html`<div class="empty-state">Sin tiradas aún</div>`;
            }
        };
        state._renderLog = renderLog;

        // Subscribe to roll store updates
        const unsubscribe = rollStore.subscribe(() => {
            renderLog();
        });

        if (btnClear)
            btnClear.addEventListener('click', () => {
                rollStore.clearRolls();
            });
        if (logRoot && !logRoot._delBound) {
            logRoot.addEventListener('click', (ev) => {
                const btn = ev.target && ev.target.closest ? ev.target.closest('[data-log-del]') : null;
                if (!btn) return;
                const rollId = btn.getAttribute('data-log-del');
                if (rollId) {
                    rollStore.removeRoll(rollId);
                }
            });
            logRoot._delBound = true;
        }
        renderLog();
    };

    let layoutInstance = null;
    const update = () => {
        if (!layoutInstance) {
            container.innerHTML = '<div id="layout"></div>';
            const layoutRoot = container.querySelector('#layout');
            layoutInstance = LayoutWithSidebar(layoutRoot, { title: 'Gestor de encuentros' });
            layoutInstance.init();
        }
        const mainEl = layoutInstance.getMainEl();
        mainEl.innerHTML = renderMain();
        bind(mainEl);
    };

    const init = async () => {
        loadStyles();
        container.innerHTML = render();
        // no-op
        // restore encounter if present
        try {
            const saved = StorageUtils.load(STORAGE_KEY_ENCOUNTER, null);
            if (saved && typeof saved === 'object') {
                state = { ...state, ...saved };
                // Ensure npc-group entries have a monotonic nextCreatureIndex based on existing creatures
                try {
                    state.tracker = (state.tracker || []).map((t) => {
                        if (!t || t.type !== 'npc-group') return t;
                        // Determine the highest numeric suffix present in creature ids or names
                        const nums = (t.creatures || []).map((c) => {
                            if (!c) return 0;
                            // try to parse id like "Goblin-3"
                            const idMatch = String(c.id || '').match(/-(\d+)$/);
                            if (idMatch) return Number(idMatch[1]) || 0;
                            // try to parse name like "Goblin 3"
                            const nameMatch = String(c.name || '').match(/\s+(\d+)$/);
                            if (nameMatch) return Number(nameMatch[1]) || 0;
                            return 0;
                        });
                        const maxNum = nums.length ? Math.max(...nums) : 0;
                        const origNext = Number(t.nextCreatureIndex || 0) || 0;
                        const qty = Number(t.quantity || 0) || 0;
                        // pick the maximum observed index, the stored nextCreatureIndex, or quantity
                        const safeNext = Math.max(origNext, maxNum, qty);
                        // store back the last used index (so addCreature will increment it to safeNext+1)
                        t.nextCreatureIndex = safeNext;
                        return t;
                    });
                } catch (_) {
                    // if anything goes wrong computing indexes, ignore and keep saved state as-is
                }
            }
        } catch (_) {}
        try {
            state.allCards = await CardService.loadAll();
        } catch (_) {
            state.allCards = [];
        }
        try {
            const res = await fetch('config/bestiary.yml', { cache: 'no-store' });
            const txt = await res.text();
            const y = window.jsyaml.load(txt);
            state.beasts = Array.isArray(y) ? y : Array.isArray(y && y.creatures) ? y.creatures : [];
        } catch (_) {
            state.beasts = [];
        }
        update();
    };

    const persistEncounter = () => {
        StorageUtils.save(STORAGE_KEY_ENCOUNTER, {
            tracker: state.tracker,
            activeIdx: state.activeIdx,
            log: state.log,
        });
        // Also persist updated characters
        StorageUtils.save(STORAGE_KEY_CHARACTERS, state.party);
    };

    return { init };
};

export default EncounterManagerPage;
