const html = window.html || String.raw;

import LayoutWithSidebar from '../../components/LayoutWithSidebar/LayoutWithSidebar.js';
import { ensureStyles } from '../../utils/style-utils.js';
import CharacterList from '../../components/CharacterList/CharacterList.js';
import StorageUtils from '../../utils/storage-utils.js';
import CardService from '../../services/card-service.js';
import { renderBestiaryStatblock } from '../../components/BestiaryStatblock/BestiaryStatblock.js';
import CharacterSheet from '../../components/CharacterSheet/CharacterSheet.js';
import AttributesPanel from '../../components/AttributesPanel/AttributesPanel.js';
import DerivedStatsPanel from '../../components/DerivedStatsPanel/DerivedStatsPanel.js';
import CardComponent from '../../components/CardComponent/CardComponent.js';
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

    const render = () => html`
        <div id="layout"></div>
    `;

    const renderTrackerItem = (it, idx) => {
        const initial = (it.name || '?').trim().charAt(0).toUpperCase();
        const active = state.activeIdx === idx ? 'active' : '';
        const avatar = it.img
            ? html`<img src="${it.img}" alt="" referrerpolicy="no-referrer" />`
            : '';
        return html`<li>
            <button class="item ${active}" data-idx="${idx}">
                <span class="avatar ${it.img ? '' : 'placeholder'}">${avatar}<span class="initial">${initial}</span></span>
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
                    ${active ? html`<div id="sheet-root"></div>` : html`<div class="empty-state encounter-empty">Añade participantes al encuentro</div>`}
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
            <button class="button" data-add-npc>➕ Criatura</button>
            <button class="button" data-roll-init title="Tirar iniciativa">🎲 Iniciativa</button>
            <button class="button" data-clear-encounter title="Nuevo encuentro">🗑️ Nuevo</button>
        </div>`;
        const list = CharacterList(listRoot, {
            items: state.tracker,
            selectedIndex: state.activeIdx,
            getName: (it) => `${it && it.name ? it.name : ''}`,
            getPortraitUrl: (it) => it.img || '',
            renderRight: (it, i) => html`<input class="init-input" type="number" step="1" placeholder="-" value="${it.init != null ? it.init : ''}" data-init-idx="${i}" title="Iniciativa" />`,
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
                        state.activeIdx = Math.max(0, state.tracker.findIndex((t) => t === item));
                        persistEncounter();
                        update();
                    };
                    inp.addEventListener('blur', apply);
                    inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); inp.blur(); } });
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
                    state.beasts = Array.isArray(y) ? y : (Array.isArray(y && y.creatures) ? y.creatures : []);
                } catch (_) {}
            }
            const host = document.body;
            const picker = EncounterParticipantPicker(host, {
                mode,
                party: state.party,
                beasts: state.beasts,
                onPick: (it) => {
                    if (mode === 'pc') {
                        state.tracker.push({ type: 'pc', id: it.id, name: it.name, img: it.portraitUrl || '', init: null });
                    } else {
                        const hp = Number(it?.stats?.salud) || 0;
                        state.tracker.push({ type: 'npc', id: it.name, name: it.name, img: it.img || '', hp, maxHp: hp, data: it, init: null, rollLog: [] });
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
            const ndBase = { ndMente: RULES.ndBase + (Number(c.attributes.Mente) || 0), ndInstinto: RULES.ndBase + (Number(c.attributes.Instinto) || 0) };
            const luckBase = { suerteMax: RULES.maxLuck };
            const derived = applyModifiersToDerived({ ...derivedBase, ...ndBase, ...luckBase, mitigacion: Number(c.mitigacion) || 0 }, c);
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
            const sheet = CharacterSheet(sheetRoot, { state: sheetState, character: c, services: { CardService, meetsRequirements: () => true, RULES }, derived, options: { readOnly: false, lockName: true }, hooks: { onBind: (ed) => {
                // Tabs
                ed.querySelectorAll('.tab').forEach((t) => t.addEventListener('click', () => { const tab = t.getAttribute('data-tab'); sheet.setState({ tab }); }));
                // Mount panels if their hosts exist (works across tabs)
                try {
                    const attrsHost = ed.querySelector('#attributes-host');
                    if (attrsHost) {
                        const comp = AttributesPanel(attrsHost, {
                            attributes: { ...c.attributes },
                            rules: RULES,
                            suerte: Number(c.suerte) || 0,
                            suerteMax: Number(derived.suerteMax) || 0,
                            onChange: (key, val) => { c.attributes[key] = val; persistEncounter(); },
                            onRoll: (key) => {
                                const val = Number(c.attributes[key]) || 0;
                                const base = computeDerivedStats(c.attributes);
                                const ndBase2 = { ndMente: RULES.ndBase + (Number(c.attributes.Mente) || 0), ndInstinto: RULES.ndBase + (Number(c.attributes.Instinto) || 0) };
                                const luckBase2 = { suerteMax: RULES.maxLuck };
                                const derivedNow = applyModifiersToDerived({ ...base, ...ndBase2, ...luckBase2, mitigacion: Number(c.mitigacion) || 0 }, c);
                                openRollModal(document.body, { attributeName: key, attributeValue: val, maxSuerte: Number(derivedNow.suerteMax) || 0 }, (res) => {
                                    if (res && res.luck) c.suerte = Math.max(0, (c.suerte || 0) - res.luck);
                                    if (res) {
                                        const entry = { type: 'attr', ts: Date.now(), attr: key, total: res.total, details: { d6: res.d6, advMod: res.advMod, advantage: res.advantage, base: val, extras: res.extras, luck: res.luck } };
                                        c.rollLog = Array.isArray(c.rollLog) ? c.rollLog : [];
                                        c.rollLog.unshift(entry);
                                        if (c.rollLog.length > 200) c.rollLog.length = 200;
                                        // Global log
                                        state.log.unshift({ ...entry, who: c.name });
                                        if (state.log.length > 200) state.log.length = 200;
                                    }
                                    persistEncounter();
                                    update();
                                });
                            },
                            onLuckChange: (val) => { c.suerte = val; },
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
                            onChange: (items) => { c.equipmentList = items; persistEncounter(); },
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
                            onHpChange: (val) => { c.hp = val; },
                            onTempHpChange: (val) => { c.tempHp = val; },
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
                try { const diceCtrl = DiceTabController(ed, { character: c, onRoll: (e) => { state.log.unshift({ ...e, who: c.name }); if (state.log.length > 200) state.log.length = 200; persistEncounter(); if (state._renderLog) state._renderLog(); } }); diceCtrl.init(); } catch (_) {}
                try { const progCtrl = ProgressTabController(ed, { character: c }); progCtrl.init(); } catch (_) {}
                persistEncounter();
            } } });
            sheet.init();
        } else {
            // NPC: tabs Hoja / Dados
            const b = active.data;
            const npcState = { tab: 'sheet' };
            const renderNpc = () => html`
                <div class="editor-header">
                    <div class="name-input" style="border:1px solid var(--border-color); border-radius: var(--radius-md); padding: .5rem .75rem; background:#fff;">${b.name}</div>
                </div>
                <div class="tabs">
                    <button class="tab ${npcState.tab === 'sheet' ? 'active' : ''}" data-tab="sheet">Hoja</button>
                    <span class="tab-spacer"></span>
                    <button class="tab ${npcState.tab === 'dice' ? 'active' : ''} tab-right" data-tab="dice">Dados</button>
                </div>
                ${npcState.tab === 'sheet'
                    ? html`<div class="panel">
                            <div style="margin-bottom:.75rem; display:flex; gap:1rem; align-items:center;">
                                <label>HP</label>
                                <input type="number" id="npc-hp" min="0" step="1" value="${active.hp || 0}" /> / <strong>${active.maxHp || 0}</strong>
                            </div>
                            ${renderBestiaryStatblock(b)}
                        </div>`
                    : html`<div id="dice-tab-container"></div>`}
            `;
            const mountNpc = () => {
                sheetRoot.innerHTML = renderNpc();
                sheetRoot.querySelectorAll('.tab').forEach((t) => t.addEventListener('click', () => { npcState.tab = t.getAttribute('data-tab'); mountNpc(); }));
                const hpInp = sheetRoot.querySelector('#npc-hp');
                if (hpInp) hpInp.addEventListener('input', (e) => { active.hp = Math.max(0, Number(e.target.value) || 0); persistEncounter(); });
                if (npcState.tab === 'dice') {
                    try { 
                        const diceContainer = sheetRoot.querySelector('#dice-tab-container');
                        if (diceContainer) {
                            const diceTab = DiceTab(diceContainer, { 
                                character: active, 
                                onRoll: (e) => { 
                                    state.log.unshift({ ...e, who: active.name }); 
                                    if (state.log.length > 200) state.log.length = 200; 
                                    persistEncounter(); 
                                    if (state._renderLog) state._renderLog(); 
                                } 
                            }); 
                            diceTab.init(); 
                        }
                    } catch (_) {}
                }
            };
            mountNpc();
        }

        // Mount global log
        const logRoot = container.querySelector('#global-log');
        const btnClear = container.querySelector('[data-log-clear]');
        const renderLog = () => {
            const rows = (state.log || []).map((e, i) => {
                const who = e.who || '—';
                if (e.type === 'dice') {
                    const rolls = Array.isArray(e.rolls) ? e.rolls.join(', ') : '';
                    return html`<div class="log-row"><span class="log-text">[${who}] ${e.notation} → <strong>${e.total}</strong>${rolls ? html` (${rolls})` : ''}</span><button class="button icon-only" data-log-del="${i}" aria-label="Eliminar" title="Eliminar">🗑️</button></div>`;
                }
                // fallback
                return html`<div class="log-row"><span class="log-text">[${who}] ${e.notation || e.type || ''} → <strong>${e.total || ''}</strong></span><button class="button icon-only" data-log-del="${i}" aria-label="Eliminar" title="Eliminar">🗑️</button></div>`;
            }).join('');
            logRoot.innerHTML = rows || html`<div class="empty-state">Sin tiradas aún</div>`;
        };
        state._renderLog = renderLog;
        if (btnClear) btnClear.addEventListener('click', () => { state.log = []; persistEncounter(); renderLog(); });
        if (logRoot && !logRoot._delBound) {
            logRoot.addEventListener('click', (ev) => {
                const btn = ev.target && ev.target.closest ? ev.target.closest('[data-log-del]') : null;
                if (!btn) return;
                const idx = Number(btn.getAttribute('data-log-del'));
                if (Number.isNaN(idx)) return;
                state.log.splice(idx, 1);
                persistEncounter();
                renderLog();
            });
            logRoot._delBound = true;
        }
        renderLog();
    };

    const update = () => {
        const layoutRoot = container.querySelector('#layout');
        const layout = LayoutWithSidebar(layoutRoot, { title: 'Gestor de encuentros' });
        layout.init();
        layout.setMainHtml(renderMain());
        bind(layout.getMainEl());
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
            }
        } catch (_) {}
        try {
            state.allCards = await CardService.loadAll();
        } catch (_) { state.allCards = []; }
        try {
            const res = await fetch('config/bestiary.yml', { cache: 'no-store' });
            const txt = await res.text();
            const y = window.jsyaml.load(txt);
            state.beasts = Array.isArray(y) ? y : (Array.isArray(y && y.creatures) ? y.creatures : []);
        } catch (_) { state.beasts = []; }
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


