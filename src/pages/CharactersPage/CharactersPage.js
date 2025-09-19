const html = window.html || String.raw;

import StorageUtils from '../../utils/storage-utils.js';
import LayoutWithSidebar from '../../components/LayoutWithSidebar/LayoutWithSidebar.js';
import Footer from '../../components/Footer/Footer.js';
import { ensureStyles } from '../../utils/style-utils.js';
import CardService from '../../services/card-service.js';
import CharacterService from '../../services/character-service.js';
import {
    RULES,
    computeDerivedStats,
    applyModifiersToDerived,
    ALLOWED_MODIFIER_FIELDS,
    evaluateModifierExpression,
} from '../../models/rules.js';
import CardComponent from '../../components/CardComponent/CardComponent.js';
import { openRollModal } from './RollModal.js';
import { rollDice } from '../../utils/dice-utils.js';
import { mountImageWithFallback } from '../../utils/image-utils.js';
import HistoryList from '../../components/HistoryList/HistoryList.js';
import SheetTab from '../../components/SheetTab/SheetTab.js';
import CardsTab from '../../components/CardsTab/CardsTab.js';
import ConfigTab from '../../components/ConfigTab/ConfigTab.js';
import BioTab from '../../components/BioTab/BioTab.js';
import ProgressTab from '../../components/ProgressTab/ProgressTab.js';
import DiceTab from '../../components/DiceTab/DiceTab.js';
import NotesTab from '../../components/NotesTab/NotesTab.js';
import EquipmentList from '../../components/EquipmentList/EquipmentList.js';
import ModifiersList from '../../components/ModifiersList/ModifiersList.js';
import AttributesPanel from '../../components/AttributesPanel/AttributesPanel.js';
import DerivedStatsPanel from '../../components/DerivedStatsPanel/DerivedStatsPanel.js';
import CharacterList from '../../components/CharacterList/CharacterList.js';
import CharacterSheet from '../../components/CharacterSheet/CharacterSheet.js';
import DiceTabController from '../../components/DiceTab/DiceTabController.js';
import DebugUtils from '../../utils/debug-utils.js';

const STORAGE_KEY = 'arcana:characters';

const defaultCharacter = () => ({
    id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
    name: 'Nuevo personaje',
    attributes: { Cuerpo: 1, Reflejos: 1, Mente: 1, Instinto: 1, Presencia: 1 },
    cards: [],
    activeCards: [],
    activeSlots: RULES.startingActiveCards,
    pp: 0,
    gold: 0,
    equipment: '',
    equipmentList: [],
    modifiers: [],
    suerte: 0,
    hp: 0,
    notes: [],
    portraitUrl: '',
    bio: '',
    languages: '',
    mitigacion: 0,
    tempHp: 0,
    ppHistory: [],
});

const CharactersPage = (container) => {
    let state = {
        list: StorageUtils.load(STORAGE_KEY, []),
        selectedId: null,
        allCards: [],
        facets: { attributes: [], tags: [], types: [], levels: [] },
        playMode: false,
        tab: 'sheet',
        cardSearch: '',
        cardFilters: { levels: [], types: [], attributes: [], tags: [] },
        addOnlyEligible: true,
        filtersOpenAdd: false,
        focusCardSearch: false,
    };

    let cardSearchDebounceTimer = null;

    const setCharQuery = (id) => {
        try {
            const url = new URL(window.location.href);
            if (id) url.searchParams.set('char', id);
            else url.searchParams.delete('char');
            window.history.replaceState(null, '', url.toString());
        } catch (_) {}
    };

    // --- Helpers for modifiers (shared) ---
    const allowedFields = ALLOWED_MODIFIER_FIELDS;
    const evaluateExpression = evaluateModifierExpression;

    // Map requirement attribute aliases to character attributes
    const REQUIREMENT_ATTR_MAP = {
        Reflejos: 'Reflejos',
    };
    function meetsRequirements(character, card) {
        const reqs = Array.isArray(card.requirements) ? card.requirements : [];
        if (!reqs.length) return true;
        const attrs = character.attributes || {};
        const ownedCards = new Set(
            (character.cards || []).map((id) => {
                const found = state.allCards.find((c) => c.id === id);
                return found ? found.name : id;
            })
        );
        return reqs.every((raw) => {
            const r = String(raw || '').trim();
            if (!r || r.toLowerCase() === 'ninguno') return true;
            if (/^solo\s+creación/i.test(r)) return true; // always eligible
            // Attribute requirement: "Nombre 2"
            const m = r.match(/^([A-Za-zÁÉÍÓÚáéíóúñÑ]+)\s*(\d+)$/);
            if (m) {
                const attrName = REQUIREMENT_ATTR_MAP[m[1]] || m[1];
                const needed = Number(m[2]);
                const current = Number(attrs[attrName]) || 0;
                return current >= needed;
            }
            // Card prerequisite by name
            if (ownedCards.has(r)) return true;
            return false;
        });
    }

    const loadStyles = () => {
        ensureStyles([
            './src/pages/CharactersPage/CharactersPage.css',
            './src/components/CardComponent/CardComponent.css',
        ]);
    };

    const save = () => StorageUtils.save(STORAGE_KEY, state.list);

    const getSelected = () => state.list.find((c) => c.id === state.selectedId) || null;

    const renderDice = () => html`
        <div class="dice-panel">
            <div class="dice-section">
                <label>Rápido</label>
                <div class="dice-quick">
                    <button class="button" data-dice="1d4">d4</button>
                    <button class="button" data-dice="1d6">d6</button>
                    <button class="button" data-dice="1d8">d8</button>
                </div>
            </div>
            <div class="dice-section">
                <label>Custom</label>
                <div class="dice-custom">
                    <input type="number" id="dice-n" min="1" step="1" placeholder="N" />
                    <span>d</span>
                    <input type="number" id="dice-f" min="2" step="1" placeholder="M" />
                    <button class="button" id="dice-roll">Tirar</button>
                </div>
            </div>
            <div class="dice-log" id="dice-log"></div>
        </div>
    `;

    const renderInner = () => html`
        <div class="characters">
            <div id="char-list"></div>
            <section class="characters-editor">${renderEditor()}</section>
        </div>
        ${Footer()}
    `;

    const renderEditor = () => {
        const c = getSelected();
        if (!c) {
            return html`<div class="empty-state">Selecciona o crea un personaje</div>`;
        }
        return html`<div id="sheet-root"></div>`;
    };

    const bindEvents = (root) => {
        // Mount reusable CharacterList in the sidebar
        const listRoot = root.querySelector('#char-list');
        const headerHtml = html`<div class="buttons-container">
            <button class="button" data-action="create" title="Crear">➕</button>
            <button class="button" data-action="import-current" title="Importar">📥</button>
            <button class="button" data-action="export-current" title="Exportar">📤</button>
            <button class="button" data-action="delete-current" title="Eliminar">🗑️</button>
            <input id="import-one-file" type="file" accept="application/json" style="display:none" />
        </div>`;
        const list = CharacterList(listRoot, {
            items: state.list,
            selectedId: state.selectedId,
            getId: (it) => it.id,
            getName: (it) => it.name || 'Personaje',
            getPortraitUrl: (it) => it.portraitUrl || '',
            headerHtml,
            onSelect: (_idx, item) => {
                if (!item) return;
                state.selectedId = item.id;
                setCharQuery(state.selectedId);
                update();
            },
        });
        list.init();

        root.querySelector('[data-action="create"]').addEventListener('click', () => {
            const c = defaultCharacter();
            state.list.push(c);
            state.selectedId = c.id;
            setCharQuery(c.id);
            save();
            update();
        });
        // Export/import current from list toolbar
        const exportCurrent = root.querySelector('[data-action="export-current"]');
        const importCurrent = root.querySelector('[data-action="import-current"]');
        const deleteCurrent = root.querySelector('[data-action="delete-current"]');
        const importOneFile = root.querySelector('#import-one-file');
        if (exportCurrent)
            exportCurrent.addEventListener('click', () => {
                const current = getSelected();
                if (!current) return;
                const blob = new Blob([JSON.stringify(current, null, 2)], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `${(current.name || 'character').replace(/\s+/g, '_')}.json`;
                a.click();
                URL.revokeObjectURL(url);
            });
        if (importCurrent) importCurrent.addEventListener('click', () => importOneFile && importOneFile.click());
        if (deleteCurrent)
            deleteCurrent.addEventListener('click', () => {
                const current = getSelected();
                if (!current) return;
                const ok = window.confirm(`¿Seguro que quieres eliminar "${current.name}"?`);
                if (!ok) return;
                state.list = state.list.filter((x) => x.id !== current.id);
                state.selectedId = state.list[0]?.id || null;
                setCharQuery(state.selectedId);
                save();
                update();
            });
        if (importOneFile)
            importOneFile.addEventListener('change', async (e) => {
                const file = e.target.files && e.target.files[0];
                if (!file) return;
                try {
                    const text = await file.text();
                    const obj = JSON.parse(text);
                    if (obj && typeof obj === 'object') {
                        let newId = obj.id || (crypto.randomUUID ? crypto.randomUUID() : String(Date.now()));
                        if (state.list.some((x) => x.id === newId)) newId = `${newId}-${Date.now()}`;
                        const merged = { ...defaultCharacter(), ...obj, id: newId };
                        state.list.push(merged);
                        state.selectedId = merged.id;
                        setCharQuery(state.selectedId);
                        save();
                        update();
                    }
                } catch (_) {}
                e.target.value = '';
            });
        // Selection handled by CharacterList

        const editor = root.querySelector('.characters-editor');
        if (!editor) return;
        const c = getSelected();
        if (!c) return;

        // Compute derived and mount CharacterSheet
        Object.assign(c, CharacterService.normalize(c));
        const derivedBase_bind = computeDerivedStats(c.attributes);
        const ndBase_bind = {
            ndMente: RULES.ndBase + (Number(c.attributes.Mente) || 0),
            ndInstinto: RULES.ndBase + (Number(c.attributes.Instinto) || 0),
        };
        const luckBase_bind = { suerteMax: RULES.maxLuck };
        const derived_bind = applyModifiersToDerived(
            { ...derivedBase_bind, ...ndBase_bind, ...luckBase_bind, mitigacion: Number(c.mitigacion) || 0 },
            c
        );
        if (typeof c.hp !== 'number' || Number.isNaN(c.hp)) c.hp = derived_bind.salud;
        c.hp = Math.max(0, Math.min(c.hp, derived_bind.salud));
        const sheetRoot = editor.querySelector('#sheet-root');
        if (sheetRoot) {
            const sheet = CharacterSheet(sheetRoot, {
                character: c,
                state: state,
                services: { CardService, meetsRequirements, RULES },
                options: { readOnly: false },
                derived: derived_bind,
                allowedFields,
                rules: RULES,
                onStateUpdate: (updatedState) => {
                    // Update the global state when CardsTab changes it
                    Object.assign(state, updatedState);
                    // Don't call update() here to avoid re-rendering the entire page
                    // CardsTab will handle its own updates
                },
                onUpdate: (updatedCharacter) => {
                    Object.assign(c, updatedCharacter);
                    save();
                    // Do not call `sheet.updateCharacter` from here to avoid notification loops
                    // (sheet -> onUpdate -> sheet). The mounted sheet should manage its own updates.
                    // If a full page refresh is required by external logic, call `update()` explicitly elsewhere.
                },
                onRoll: (rollData) => {
                    const entry = {
                        type: 'dice',
                        ts: Date.now(),
                        expression: rollData.expression,
                        total: rollData.total,
                        details: rollData.details,
                    };
                    c.rollLog = Array.isArray(c.rollLog) ? c.rollLog : [];
                    c.rollLog.unshift(entry);
                    if (c.rollLog.length > 200) c.rollLog.length = 200;
                    save();
                    // Update only the sheet's data (roll log) to avoid losing focus on inputs
                    if (typeof sheet !== 'undefined' && sheet && typeof sheet.updateCharacter === 'function') {
                        try {
                            sheet.updateCharacter({ rollLog: c.rollLog });
                        } catch (_) {
                            update();
                        }
                    } else {
                        update();
                    }
                },
                hooks: {
                    onBind: async (ed) => {
                        ed.querySelectorAll('.tab').forEach((t) =>
                            t.addEventListener('click', () => {
                                state.tab = t.getAttribute('data-tab');
                                update();
                            })
                        );
                        const name = ed.querySelector('#name');
                        const notes = ed.querySelector('#notes');
                        const portraitUrl = ed.querySelector('#portrait-url');
                        const bioText = ed.querySelector('#bio-text');
                        const languages = ed.querySelector('#languages');
                        if (name)
                            name.addEventListener('input', (e) => {
                                c.name = e.target.value;
                                save();
                            });
                        if (notes)
                            notes.addEventListener('input', (e) => {
                                c.notes = e.target.value;
                                save();
                            });
                        if (portraitUrl)
                            portraitUrl.addEventListener('input', (e) => {
                                c.portraitUrl = e.target.value;
                                save();
                            });
                        if (bioText)
                            bioText.addEventListener('input', (e) => {
                                c.bio = e.target.value;
                                save();
                            });
                        if (languages)
                            languages.addEventListener('input', (e) => {
                                c.languages = e.target.value;
                                save();
                            });
                        // Mount EquipmentList
                        try {
                            const equipHost = ed.querySelector('#equip-list');
                            if (equipHost) {
                                const comp = EquipmentList(equipHost, {
                                    items: Array.isArray(c.equipmentList) ? c.equipmentList : [],
                                    onChange: (items) => {
                                        c.equipmentList = items;
                                        save();
                                    },
                                });
                                comp.init();
                            }
                        } catch (_) {}
                        // PP events
                        const pp = ed.querySelector('#pp');
                        const ppAddBtn = ed.querySelector('#pp-add');
                        const ppSpendBtn = ed.querySelector('#pp-spend');
                        const ppDeltaInp = ed.querySelector('#pp-delta');
                        const ppReasonInp = ed.querySelector('#pp-reason');
                        if (pp) pp.setAttribute('disabled', 'disabled');
                        if (ppAddBtn)
                            ppAddBtn.addEventListener('click', () => {
                                const amount = Math.max(
                                    1,
                                    Number(ppDeltaInp && ppDeltaInp.value ? ppDeltaInp.value : 0) || 0
                                );
                                const reason = (ppReasonInp && ppReasonInp.value ? ppReasonInp.value : '').trim();
                                if (!reason) {
                                    window.alert('Por favor, indica la razón del cambio de PP.');
                                    return;
                                }
                                CharacterService.addPP(c, amount, reason);
                                save();
                                update();
                            });
                        if (ppSpendBtn)
                            ppSpendBtn.addEventListener('click', () => {
                                const amount = Math.max(
                                    1,
                                    Number(ppDeltaInp && ppDeltaInp.value ? ppDeltaInp.value : 0) || 0
                                );
                                const reason = (ppReasonInp && ppReasonInp.value ? ppReasonInp.value : '').trim();
                                if (!reason) {
                                    window.alert('Por favor, indica la razón del gasto de PP.');
                                    return;
                                }
                                CharacterService.spendPP(c, amount, reason);
                                save();
                                update();
                            });
                        // Attributes panel
                        try {
                            const host = ed.querySelector('#attributes-host');
                            if (host) {
                                const comp = AttributesPanel(host, {
                                    attributes: { ...c.attributes },
                                    rules: RULES,
                                    suerte: Number(c.suerte) || 0,
                                    suerteMax: Number(derived_bind.suerteMax) || 0,
                                    onChange: (key, val) => {
                                        // Immutable update to attributes to keep reference changes predictable
                                        c.attributes = { ...c.attributes, [key]: val };
                                        save();
                                        // Recompute derived stats and update only the derived panel on the mounted sheet
                                        try {
                                            const base = computeDerivedStats(c.attributes);
                                            const ndBase2 = {
                                                ndMente: RULES.ndBase + (Number(c.attributes.Mente) || 0),
                                                ndInstinto: RULES.ndBase + (Number(c.attributes.Instinto) || 0),
                                            };
                                            const luckBase2 = { suerteMax: RULES.maxLuck };
                                            const derivedNow = applyModifiersToDerived(
                                                {
                                                    ...base,
                                                    ...ndBase2,
                                                    ...luckBase2,
                                                    mitigacion: Number(c.mitigacion) || 0,
                                                },
                                                c
                                            );
                                            if (
                                                typeof sheet !== 'undefined' &&
                                                sheet &&
                                                typeof sheet.updateDerived === 'function'
                                            ) {
                                                sheet.updateDerived(derivedNow);
                                            } else {
                                                update();
                                            }
                                        } catch (_) {
                                            // Fallback to full update if recompute fails
                                            update();
                                        }
                                    },
                                    onRoll: (key) => {
                                        const val = Number(c.attributes[key]) || 0;
                                        const base = computeDerivedStats(c.attributes);
                                        const ndBase2 = {
                                            ndMente: 5 + (Number(c.attributes.Mente) || 0),
                                            ndInstinto: 5 + (Number(c.attributes.Instinto) || 0),
                                        };
                                        const luckBase2 = { suerteMax: 5 };
                                        const derivedNow = applyModifiersToDerived(
                                            {
                                                ...base,
                                                ...ndBase2,
                                                ...luckBase2,
                                                mitigacion: Number(c.mitigacion) || 0,
                                            },
                                            c
                                        );
                                        openRollModal(
                                            document.body,
                                            {
                                                attributeName: key,
                                                attributeValue: val,
                                                maxSuerte: Number(derivedNow.suerteMax) || 0,
                                            },
                                            (res) => {
                                                if (res && res.luck) c.suerte = Math.max(0, (c.suerte || 0) - res.luck);
                                                if (res) {
                                                    const entry = {
                                                        type: 'attr',
                                                        ts: Date.now(),
                                                        attr: key,
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
                                                    c.rollLog = Array.isArray(c.rollLog) ? c.rollLog : [];
                                                    c.rollLog.unshift(entry);
                                                    if (c.rollLog.length > 200) c.rollLog.length = 200;
                                                }
                                                save();
                                                // Only patch the sheet to avoid losing focus; include suerte and rollLog updates
                                                if (
                                                    typeof sheet !== 'undefined' &&
                                                    sheet &&
                                                    typeof sheet.updateCharacter === 'function'
                                                ) {
                                                    try {
                                                        sheet.updateCharacter({ suerte: c.suerte, rollLog: c.rollLog });
                                                    } catch (_) {
                                                        update();
                                                    }
                                                } else {
                                                    update();
                                                }
                                            }
                                        );
                                    },
                                    onLuckChange: (val) => {
                                        c.suerte = val;
                                        save();
                                        // Patch only the character's luck value on the mounted sheet
                                        if (
                                            typeof sheet !== 'undefined' &&
                                            sheet &&
                                            typeof sheet.updateCharacter === 'function'
                                        ) {
                                            try {
                                                sheet.updateCharacter({ suerte: c.suerte });
                                            } catch (_) {
                                                update();
                                            }
                                        } else {
                                            update();
                                        }
                                    },
                                });
                                comp.init();
                            }
                        } catch (_) {}
                        // Derived panel
                        try {
                            const host = ed.querySelector('#derived-host');
                            if (host) {
                                const comp = DerivedStatsPanel(host, {
                                    derived: derived_bind,
                                    hp: Number(c.hp) || 0,
                                    tempHp: Number(c.tempHp) || 0,
                                    onHpChange: (hpVal) => {
                                        c.hp = hpVal;
                                        save();
                                        // Update only hp on the mounted sheet to avoid full re-render
                                        if (
                                            typeof sheet !== 'undefined' &&
                                            sheet &&
                                            typeof sheet.updateCharacter === 'function'
                                        ) {
                                            try {
                                                sheet.updateCharacter({ hp: c.hp });
                                            } catch (_) {
                                                update();
                                            }
                                        } else {
                                            update();
                                        }
                                    },
                                    onTempHpChange: (tempVal) => {
                                        c.tempHp = tempVal;
                                        save();
                                    },
                                });
                                comp.init();
                            }
                        } catch (_) {}
                        // Modifiers list (Configuración)
                        try {
                            if (state.tab === 'config') {
                                const modsHost = ed.querySelector('#mods-host');
                                if (modsHost) {
                                    const comp = ModifiersList(modsHost, {
                                        items: Array.isArray(c.modifiers) ? c.modifiers : [],
                                        allowedFields,
                                        onChange: (items) => {
                                            c.modifiers = items;
                                            save();
                                        },
                                    });
                                    comp.init();
                                }
                            }
                        } catch (_) {}

                        // CharacterSheet now handles all tab mounting internally

                        // Cards filters & search
                        const gold = ed.querySelector('#gold');
                        const cardSearch = ed.querySelector('#card-search');
                        if (gold)
                            gold.addEventListener('change', (e) => {
                                c.gold = Math.max(0, Number(e.target.value) || 0);
                                save();
                            });
                        if (cardSearch)
                            cardSearch.addEventListener('input', (e) => {
                                state.cardSearch = e.target.value;
                                state.focusCardSearch = true;
                                clearTimeout(cardSearchDebounceTimer);
                                cardSearchDebounceTimer = setTimeout(() => {
                                    update();
                                }, 220);
                            });
                        const levelChecks = ed.querySelectorAll('input[data-filter-level]');
                        const typeChecks = ed.querySelectorAll('input[data-filter-type]');
                        const tagChecks = ed.querySelectorAll('input[data-filter-tag]');
                        const clearFilters = ed.querySelector('#cards-clear-filters');
                        const toggleAddFilters = ed.querySelector('#toggle-add-filters');
                        // toggleAddFilters is now handled by CardsTab component
                        if (clearFilters)
                            clearFilters.addEventListener('click', () => {
                                state.cardFilters = { levels: [], types: [], attributes: [], tags: [] };
                                update();
                            });
                        levelChecks.forEach((ch) =>
                            ch.addEventListener('change', (e) => {
                                const v = Number(e.target.value);
                                if (e.target.checked && !state.cardFilters.levels.includes(v))
                                    state.cardFilters.levels.push(v);
                                if (!e.target.checked)
                                    state.cardFilters.levels = state.cardFilters.levels.filter((x) => x !== v);
                                update();
                            })
                        );
                        typeChecks.forEach((ch) =>
                            ch.addEventListener('change', (e) => {
                                const v = e.target.value;
                                if (e.target.checked && !state.cardFilters.types.includes(v))
                                    state.cardFilters.types.push(v);
                                if (!e.target.checked)
                                    state.cardFilters.types = state.cardFilters.types.filter((x) => x !== v);
                                update();
                            })
                        );
                        tagChecks.forEach((ch) =>
                            ch.addEventListener('change', (e) => {
                                const v = e.target.value;
                                if (e.target.checked && !state.cardFilters.tags.includes(v))
                                    state.cardFilters.tags.push(v);
                                if (!e.target.checked)
                                    state.cardFilters.tags = state.cardFilters.tags.filter((x) => x !== v);
                                update();
                            })
                        );
                        const activeSlots = ed.querySelector('#active-slots');
                        if (activeSlots)
                            activeSlots.addEventListener('change', (e) => {
                                c.activeSlots = Math.max(0, Number(e.target.value) || 0);
                                if (c.activeCards.length > c.activeSlots)
                                    c.activeCards = c.activeCards.slice(0, c.activeSlots);
                                save();
                                update();
                            });
                        const addEligibleToggle = ed.querySelector('#add-eligible-only');
                        if (addEligibleToggle)
                            addEligibleToggle.addEventListener('change', (e) => {
                                state.addOnlyEligible = !!e.target.checked;
                                update();
                            });
                        // Cards visuals and actions
                        ed.querySelectorAll('.card-slot').forEach((slot) => {
                            const id = slot.getAttribute('data-id');
                            const mode = slot.getAttribute('data-actions');
                            const card = state.allCards.find((x) => x.id === id);
                            if (!card) return;
                            const actionsRenderer = (cc) => {
                                const typeLower = String(cc.type || '').toLowerCase();
                                const canActivate = typeLower === 'activable';
                                if (mode === 'toggle') {
                                    const active = (getSelected().activeCards || []).includes(cc.id);
                                    const removeBtn = html`<button class="button" data-remove="${cc.id}">
                                        Quitar
                                    </button>`;
                                    const toggleBtn = canActivate
                                        ? html`<button class="button" data-toggle-active="${cc.id}">
                                              ${active ? 'Desactivar' : 'Activar'}
                                          </button>`
                                        : html`<span class="muted">No activable</span>`;
                                    return html`<div class="card-buttons">${removeBtn} ${toggleBtn}</div>`;
                                }
                                if (mode === 'deactivate') {
                                    const reload = cc.reload && typeof cc.reload === 'object' ? cc.reload : null;
                                    const qtyNum =
                                        reload && Number.isFinite(Number(reload.qty)) ? Number(reload.qty) : null;
                                    const reloadType = String(reload && reload.type ? reload.type : '').toUpperCase();
                                    const isRoll = reloadType === 'ROLL';
                                    const showUses = !!reload && (reload.type != null || qtyNum > 0);
                                    const uses = (getSelected().cardUses && getSelected().cardUses[cc.id]) || {
                                        left: null,
                                        total: null,
                                    };
                                    const total = isRoll ? 1 : Number(uses.total ?? (qtyNum != null ? qtyNum : 0)) || 0;
                                    const left = Math.min(Number(uses.left ?? total) || 0, total);
                                    const leftControl = showUses
                                        ? html`<div style="display:flex; align-items:center; gap:.5rem;">
                                              <span>Usos</span>
                                              <div class="hp-wrap">
                                                  <input
                                                      type="number"
                                                      data-card-use-left="${cc.id}"
                                                      min="0"
                                                      step="1"
                                                      value="${left}"
                                                  />
                                                  / <strong>${total}</strong>
                                              </div>
                                          </div>`
                                        : html`<span></span>`;
                                    const rightBtn = html`<button class="button" data-toggle-active="${cc.id}">
                                        Desactivar
                                    </button>`;
                                    return html`<div class="card-buttons">${leftControl} ${rightBtn}</div>`;
                                }
                                if (mode === 'add') {
                                    return html`<button class="button" data-add-card="${cc.id}">Añadir</button>`;
                                }
                                return '';
                            };
                            const comp = CardComponent(slot, { card, actionsRenderer });
                            comp.init();
                        });
                        ed.querySelectorAll('[data-remove]').forEach((btn) =>
                            btn.addEventListener('click', () => {
                                const id = btn.getAttribute('data-remove');
                                const idx = c.cards.indexOf(id);
                                if (idx >= 0) c.cards.splice(idx, 1);
                                c.activeCards = Array.isArray(c.activeCards)
                                    ? c.activeCards.filter((x) => x !== id)
                                    : [];
                                save();
                                update();
                            })
                        );
                        ed.addEventListener('click', (e) => {
                            const addBtn = e.target && e.target.closest && e.target.closest('[data-add-card]');
                            if (addBtn) {
                                const id = addBtn.getAttribute('data-add-card');
                                if (id && !c.cards.includes(id)) {
                                    c.cards.push(id);
                                    save();
                                    update();
                                }
                                return;
                            }
                            const toggleBtn = e.target && e.target.closest && e.target.closest('[data-toggle-active]');
                            if (toggleBtn) {
                                const id = toggleBtn.getAttribute('data-toggle-active');
                                const idx = c.activeCards.indexOf(id);
                                if (idx >= 0) c.activeCards.splice(idx, 1);
                                else if (c.activeCards.length < (c.activeSlots || 0)) c.activeCards.push(id);
                                save();
                                update();
                                return;
                            }
                        });
                        ed.addEventListener('input', (e) => {
                            const inp = e.target && e.target.closest && e.target.closest('input[data-card-use-left]');
                            if (inp) {
                                const cardId = inp.getAttribute('data-card-use-left');
                                if (!c.cardUses || typeof c.cardUses !== 'object') c.cardUses = {};
                                const card = state.allCards.find((x) => x.id === cardId);
                                const cd = card && card.reload && typeof card.reload === 'object' ? card.reload : null;
                                const reloadType = String(cd?.type || '').toUpperCase();
                                const total =
                                    reloadType === 'ROLL' ? 1 : Number(c.cardUses[cardId]?.total ?? cd?.qty ?? 0) || 0;
                                const left =
                                    reloadType === 'ROLL'
                                        ? Math.max(0, Math.min(Number(inp.value) || 0, 1))
                                        : Math.max(0, Math.min(Number(inp.value) || 0, total));
                                c.cardUses[cardId] = { left, total };
                                save();
                            }
                        });
                        // Dice tab
                        if (state.tab === 'dice') {
                            try {
                                const ctrl = DiceTabController(ed, {
                                    character: c,
                                    onRoll: () => {
                                        save();
                                    },
                                });
                                ctrl.init();
                            } catch (_) {}
                        }
                        if (state.tab === 'progress') {
                            const ppTab = ed.querySelector('.pp-tab');
                            if (ppTab) {
                                ppTab.addEventListener('click', (e) => {
                                    const delBtn = e.target && e.target.closest && e.target.closest('[data-pp-del]');
                                    if (delBtn) {
                                        const ts = Number(delBtn.getAttribute('data-pp-del'));
                                        const hist = Array.isArray(c.ppHistory) ? c.ppHistory : [];
                                        const entry = hist.find((x) => x.ts === ts);
                                        if (entry) {
                                            const amount = Math.max(0, Number(entry.amount) || 0);
                                            const reason = String(entry.reason || '').trim();
                                            const delta = entry.type === 'spend' ? `+${amount}` : `-${amount}`;
                                            const ok = window.confirm(
                                                `¿Deshacer movimiento de PP?\n\nCambio: ${delta}\nMotivo: ${reason || '(sin motivo)'}\n\nEsta acción revertirá el total actual.`
                                            );
                                            if (!ok) return;
                                            CharacterService.undoPP(c, ts);
                                        }
                                        save();
                                        update();
                                        return;
                                    }
                                });
                            }
                            try {
                                const host = ed.querySelector('#pp-history');
                                if (host) {
                                    const items = (c.ppHistory || [])
                                        .slice(0, 200)
                                        .sort((a, b) => Number(b.ts || 0) - Number(a.ts || 0));
                                    const renderItem = (h) => {
                                        const sign = h.type === 'spend' ? '-' : '+';
                                        const amt = Number(h.amount) || 0;
                                        const reason = (h.reason || '').toString();
                                        return html`<div class="dice-line" data-ts="${h.ts}">
                                            <span class="dice-entry">[PP] ${sign}${amt} — ${reason}</span
                                            ><button class="button" data-pp-del="${h.ts}" title="Deshacer">↩️</button>
                                        </div>`;
                                    };
                                    const list = HistoryList(host, { items, renderItem, wrap: false });
                                    list.init();
                                }
                            } catch (_) {}
                        }
                        // Portrait image mount
                        try {
                            const pm = ed.querySelector('#portrait-mount');
                            if (pm) {
                                mountImageWithFallback(pm, {
                                    src: c && c.portraitUrl ? String(c.portraitUrl) : '',
                                    alt: c ? `Retrato de ${c.name}` : 'Retrato',
                                    className: 'portrait-img',
                                    placeholderText: 'Sin retrato',
                                });
                            }
                        } catch (_) {}
                        // Restore focus on card search
                        if (state.focusCardSearch) {
                            const search = ed.querySelector('#card-search');
                            if (search) {
                                const val = search.value;
                                search.focus();
                                search.setSelectionRange(val.length, val.length);
                            }
                            state.focusCardSearch = false;
                        }
                    },
                },
            });

            sheet.init();
            return;
        }

        const name = editor.querySelector('#name');
        const notes = editor.querySelector('#notes');
        const del = null;
        const cardAdd = editor.querySelector('#card-add');
        const pp = editor.querySelector('#pp');
        const ppAddBtn = editor.querySelector('#pp-add');
        const ppSpendBtn = editor.querySelector('#pp-spend');
        const ppClearBtn = null;
        const ppDeltaInp = editor.querySelector('#pp-delta');
        const ppReasonInp = editor.querySelector('#pp-reason');
        const activeSlots = editor.querySelector('#active-slots');
        const gold = editor.querySelector('#gold');
        const equipment = editor.querySelector('#equipment');
        const cardSearch = editor.querySelector('#card-search');
        const suerte = editor.querySelector('#suerte');
        const hp = editor.querySelector('#hp');
        const tempHp = editor.querySelector('#temp-hp');
        const portraitUrl = editor.querySelector('#portrait-url');
        const bioText = editor.querySelector('#bio-text');
        const languages = editor.querySelector('#languages');

        editor.querySelectorAll('.tab').forEach((t) =>
            t.addEventListener('click', () => {
                state.tab = t.getAttribute('data-tab');
                update();
            })
        );

        if (name)
            name.addEventListener('input', (e) => {
                c.name = e.target.value;
                save();
            });
        if (notes)
            notes.addEventListener('input', (e) => {
                c.notes = e.target.value;
                save();
            });
        if (portraitUrl)
            portraitUrl.addEventListener('input', (e) => {
                c.portraitUrl = e.target.value;
                save();
            });
        if (bioText)
            bioText.addEventListener('input', (e) => {
                c.bio = e.target.value;
                save();
            });
        if (languages)
            languages.addEventListener('input', (e) => {
                c.languages = e.target.value;
                save();
            });
        // Mount EquipmentList component
        try {
            const equipHost = editor.querySelector('#equip-list');
            if (equipHost) {
                const comp = EquipmentList(equipHost, {
                    items: Array.isArray(c.equipmentList) ? c.equipmentList : [],
                    onChange: (items) => {
                        c.equipmentList = items;
                        save();
                    },
                });
                comp.init();
            }
        } catch (_) {}
        // PP now managed via Progress tab
        if (pp) pp.setAttribute('disabled', 'disabled');
        if (ppAddBtn)
            ppAddBtn.addEventListener('click', () => {
                const amount = Math.max(1, Number(ppDeltaInp && ppDeltaInp.value ? ppDeltaInp.value : 0) || 0);
                const reason = (ppReasonInp && ppReasonInp.value ? ppReasonInp.value : '').trim();
                if (!reason) {
                    window.alert('Por favor, indica la razón del cambio de PP.');
                    return;
                }
                CharacterService.addPP(c, amount, reason);
                save();
                update();
            });
        if (ppSpendBtn)
            ppSpendBtn.addEventListener('click', () => {
                const amount = Math.max(1, Number(ppDeltaInp && ppDeltaInp.value ? ppDeltaInp.value : 0) || 0);
                const reason = (ppReasonInp && ppReasonInp.value ? ppReasonInp.value : '').trim();
                if (!reason) {
                    window.alert('Por favor, indica la razón del gasto de PP.');
                    return;
                }
                CharacterService.spendPP(c, amount, reason);
                save();
                update();
            });
        // limpiar historial eliminado por diseño
        // Mount AttributesPanel
        try {
            const host = editor.querySelector('#attributes-host');
            if (host) {
                const comp = AttributesPanel(host, {
                    attributes: { ...c.attributes },
                    rules: RULES,
                    suerte: Number(c.suerte) || 0,
                    suerteMax: Number(derived_bind.suerteMax) || 0,
                    onChange: (key, val) => {
                        c.attributes[key] = val;
                        save();
                        update();
                    },
                    onRoll: (key) => {
                        const val = Number(c.attributes[key]) || 0;
                        const base = computeDerivedStats(c.attributes);
                        const ndBase2 = {
                            ndMente: 5 + (Number(c.attributes.Mente) || 0),
                            ndInstinto: 5 + (Number(c.attributes.Instinto) || 0),
                        };
                        const luckBase2 = { suerteMax: 5 };
                        const derivedNow = applyModifiersToDerived(
                            { ...base, ...ndBase2, ...luckBase2, mitigacion: Number(c.mitigacion) || 0 },
                            c
                        );
                        openRollModal(
                            document.body,
                            { attributeName: key, attributeValue: val, maxSuerte: Number(derivedNow.suerteMax) || 0 },
                            (res) => {
                                if (res && res.luck) c.suerte = Math.max(0, (c.suerte || 0) - res.luck);
                                if (res) {
                                    const entry = {
                                        type: 'attr',
                                        ts: Date.now(),
                                        attr: key,
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
                                    c.rollLog = Array.isArray(c.rollLog) ? c.rollLog : [];
                                    c.rollLog.unshift(entry);
                                    if (c.rollLog.length > 200) c.rollLog.length = 200;
                                }
                                save();
                                update();
                            }
                        );
                    },
                    onLuckChange: (val) => {
                        c.suerte = val;
                        save();
                        update();
                    },
                });
                comp.init();
            }
        } catch (_) {}
        // Mount DerivedStatsPanel
        try {
            const host = editor.querySelector('#derived-host');
            if (host) {
                const comp = DerivedStatsPanel(host, {
                    derived: derived_bind,
                    hp: Number(c.hp) || 0,
                    tempHp: Number(c.tempHp) || 0,
                    onHpChange: (hpVal) => {
                        c.hp = hpVal;
                        save();
                        update();
                    },
                    onTempHpChange: (tempVal) => {
                        c.tempHp = tempVal;
                        save();
                    },
                });
                comp.init();
            }
        } catch (_) {}
        if (gold)
            gold.addEventListener('change', (e) => {
                c.gold = Math.max(0, Number(e.target.value) || 0);
                save();
            });
        // EquipmentList uses its own handlers via onChange
        if (cardSearch)
            cardSearch.addEventListener('input', (e) => {
                state.cardSearch = e.target.value;
                state.focusCardSearch = true;
                clearTimeout(cardSearchDebounceTimer);
                cardSearchDebounceTimer = setTimeout(() => {
                    update();
                }, 220);
            });
        // Cards tab filters
        const levelChecks = editor.querySelectorAll('input[data-filter-level]');
        const typeChecks = editor.querySelectorAll('input[data-filter-type]');
        const tagChecks = editor.querySelectorAll('input[data-filter-tag]');
        const clearFilters = editor.querySelector('#cards-clear-filters');
        const toggleAddFilters = editor.querySelector('#toggle-add-filters');
        // toggleAddFilters is now handled by CardsTab component
        if (clearFilters)
            clearFilters.addEventListener('click', () => {
                state.cardFilters = { levels: [], types: [], attributes: [], tags: [] };
                update();
            });
        levelChecks.forEach((ch) =>
            ch.addEventListener('change', (e) => {
                const v = Number(e.target.value);
                if (e.target.checked && !state.cardFilters.levels.includes(v)) state.cardFilters.levels.push(v);
                if (!e.target.checked) state.cardFilters.levels = state.cardFilters.levels.filter((x) => x !== v);
                update();
            })
        );
        typeChecks.forEach((ch) =>
            ch.addEventListener('change', (e) => {
                const v = e.target.value;
                if (e.target.checked && !state.cardFilters.types.includes(v)) state.cardFilters.types.push(v);
                if (!e.target.checked) state.cardFilters.types = state.cardFilters.types.filter((x) => x !== v);
                update();
            })
        );
        tagChecks.forEach((ch) =>
            ch.addEventListener('change', (e) => {
                const v = e.target.value;
                if (e.target.checked && !state.cardFilters.tags.includes(v)) state.cardFilters.tags.push(v);
                if (!e.target.checked) state.cardFilters.tags = state.cardFilters.tags.filter((x) => x !== v);
                update();
            })
        );
        if (activeSlots)
            activeSlots.addEventListener('change', (e) => {
                c.activeSlots = Math.max(0, Number(e.target.value) || 0);
                if (c.activeCards.length > c.activeSlots) c.activeCards = c.activeCards.slice(0, c.activeSlots);
                save();
                update();
            });
        // No filtro de elegibles en Colección
        const addEligibleToggle = editor.querySelector('#add-eligible-only');
        if (addEligibleToggle)
            addEligibleToggle.addEventListener('change', (e) => {
                state.addOnlyEligible = !!e.target.checked;
                update();
            });
        // delete handled from list toolbar
        // Removed per-editor export/import (moved to list toolbar)
        editor.querySelectorAll('input[data-attr]').forEach((inp) =>
            inp.addEventListener('change', (e) => {
                const key = e.target.getAttribute('data-attr');
                c.attributes[key] = Math.max(
                    RULES.attributeMin,
                    Math.min(RULES.attributeMax, Number(e.target.value) || RULES.attributeMin)
                );
                save();
                update();
            })
        );
        editor.querySelectorAll('[data-roll-attr]').forEach((btn) =>
            btn.addEventListener('click', () => {
                const key = btn.getAttribute('data-roll-attr');
                const val = Number(c.attributes[key]) || 0;
                const base = computeDerivedStats(c.attributes);
                const ndBase2 = {
                    ndMente: 5 + (Number(c.attributes.Mente) || 0),
                    ndInstinto: 5 + (Number(c.attributes.Instinto) || 0),
                };
                const luckBase2 = { suerteMax: 5 };
                const derivedNow = applyModifiersToDerived(
                    { ...base, ...ndBase2, ...luckBase2, mitigacion: Number(c.mitigacion) || 0 },
                    c
                );
                openRollModal(
                    document.body,
                    { attributeName: key, attributeValue: val, maxSuerte: Number(derivedNow.suerteMax) || 0 },
                    (res) => {
                        if (res && res.luck) {
                            c.suerte = Math.max(0, (c.suerte || 0) - res.luck);
                        }
                        if (res) {
                            const entry = {
                                type: 'attr',
                                ts: Date.now(),
                                attr: key,
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
                            c.rollLog = Array.isArray(c.rollLog) ? c.rollLog : [];
                            c.rollLog.unshift(entry);
                            if (c.rollLog.length > 200) c.rollLog.length = 200;
                        }
                        save();
                        update();
                    }
                );
            })
        );
        // Delegated clicks for dynamically mounted card buttons
        editor.addEventListener('click', (e) => {
            const addBtn = e.target && e.target.closest && e.target.closest('[data-add-card]');
            if (addBtn) {
                const id = addBtn.getAttribute('data-add-card');
                if (id && !c.cards.includes(id)) {
                    c.cards.push(id);
                    save();
                    update();
                }
                return;
            }
            const toggleBtn = e.target && e.target.closest && e.target.closest('[data-toggle-active]');
            if (toggleBtn) {
                const id = toggleBtn.getAttribute('data-toggle-active');
                const idx = c.activeCards.indexOf(id);
                if (idx >= 0) c.activeCards.splice(idx, 1);
                else if (c.activeCards.length < (c.activeSlots || 0)) c.activeCards.push(id);
                save();
                update();
                return;
            }
        });

        // Mount visual cards using CardComponent in cards tab, with integrated actions
        editor.querySelectorAll('.card-slot').forEach((slot) => {
            const id = slot.getAttribute('data-id');
            const mode = slot.getAttribute('data-actions');
            const card = state.allCards.find((x) => x.id === id);
            if (!card) return;
            const actionsRenderer = (c) => {
                const typeLower = String(c.type || '').toLowerCase();
                const canActivate = typeLower === 'activable';
                if (mode === 'toggle') {
                    const active = (getSelected().activeCards || []).includes(c.id);
                    const removeBtn = html`<button class="button" data-remove="${c.id}">Quitar</button>`;
                    const toggleBtn = canActivate
                        ? html`<button class="button" data-toggle-active="${c.id}">
                              ${active ? 'Desactivar' : 'Activar'}
                          </button>`
                        : html`<span class="muted">No activable</span>`;

                    return html`<div class="card-buttons">${removeBtn} ${toggleBtn}</div>`;
                }
                if (mode === 'deactivate') {
                    const reload = c.reload && typeof c.reload === 'object' ? c.reload : null;
                    const qtyNum = reload && Number.isFinite(Number(reload.qty)) ? Number(reload.qty) : null;
                    const reloadType = String(reload && reload.type ? reload.type : '').toUpperCase();
                    const isRoll = reloadType === 'ROLL';
                    const showUses = !!reload && (reload.type != null || qtyNum > 0);
                    const uses = (getSelected().cardUses && getSelected().cardUses[c.id]) || {
                        left: null,
                        total: null,
                    };
                    const total = isRoll ? 1 : Number(uses.total ?? (qtyNum != null ? qtyNum : 0)) || 0;
                    const left = Math.min(Number(uses.left ?? total) || 0, total);
                    const leftControl = showUses
                        ? html`<div style="display:flex; align-items:center; gap:.5rem;">
                              <span>Usos</span>
                              <div class="hp-wrap">
                                  <input type="number" data-card-use-left="${c.id}" min="0" step="1" value="${left}" />
                                  / <strong>${total}</strong>
                              </div>
                          </div>`
                        : html`<span></span>`;
                    const rightBtn = html`<button class="button" data-toggle-active="${c.id}">Desactivar</button>`;
                    return html`<div class="card-buttons">${leftControl} ${rightBtn}</div>`;
                }
                if (mode === 'add') {
                    return html`<button class="button" data-add-card="${c.id}">Añadir</button>`;
                }
                return '';
            };
            const comp = CardComponent(slot, { card, actionsRenderer });
            comp.init();
        });
        editor.querySelectorAll('[data-remove]').forEach((btn) =>
            btn.addEventListener('click', () => {
                const id = btn.getAttribute('data-remove');
                const idx = c.cards.indexOf(id);
                if (idx >= 0) c.cards.splice(idx, 1);
                c.activeCards = Array.isArray(c.activeCards) ? c.activeCards.filter((x) => x !== id) : [];
                save();
                update();
            })
        );

        // Mount ModifiersList
        try {
            const host = editor.querySelector('#mods-host');
            if (host) {
                const comp = ModifiersList(host, {
                    items: Array.isArray(c.modifiers) ? c.modifiers : [],
                    allowedFields,
                    onChange: (items) => {
                        c.modifiers = items;
                        save();
                        // No update() inmediato para evitar perder foco al escribir
                    },
                });
                comp.init();
            }
        } catch (_) {}
        editor.addEventListener('input', (e) => {
            const inp = e.target && e.target.closest && e.target.closest('input[data-card-use-left]');
            if (inp) {
                const cardId = inp.getAttribute('data-card-use-left');
                const current = getSelected();
                if (!current) return;
                if (!current.cardUses || typeof current.cardUses !== 'object') current.cardUses = {};
                const card = state.allCards.find((x) => x.id === cardId);
                const cd = card && card.reload && typeof card.reload === 'object' ? card.reload : null;
                const reloadType = String(cd?.type || '').toUpperCase();
                const total = reloadType === 'ROLL' ? 1 : Number(current.cardUses[cardId]?.total ?? cd?.qty ?? 0) || 0;
                const left =
                    reloadType === 'ROLL'
                        ? Math.max(0, Math.min(Number(inp.value) || 0, 1))
                        : Math.max(0, Math.min(Number(inp.value) || 0, total));
                current.cardUses[cardId] = { left, total };
                save();
            }
        });

        // Dice tab events and Progress tab events
        if (state.tab === 'dice') {
            const diceTab = editor.querySelector('.dice-tab');
            if (diceTab) {
                diceTab.addEventListener('click', (e) => {
                    const btn = e.target && e.target.closest && e.target.closest('[data-dice]');
                    const delBtn = e.target && e.target.closest && e.target.closest('[data-dice-del]');
                    const clearBtn = e.target && e.target.closest && e.target.closest('[data-dice-clear]');
                    if (clearBtn) {
                        c.rollLog = [];
                        save();
                        update();
                        return;
                    }
                    if (delBtn) {
                        const ts = Number(delBtn.getAttribute('data-dice-del'));
                        c.rollLog = (c.rollLog || []).filter((x) => x.ts !== ts);
                        save();
                        update();
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
                        c.rollLog = Array.isArray(c.rollLog) ? c.rollLog : [];
                        c.rollLog.unshift({
                            type: 'dice',
                            ts: Date.now(),
                            notation: notation.toLowerCase(),
                            rolls,
                            total: sum,
                        });
                        if (c.rollLog.length > 200) c.rollLog.length = 200;
                        save();
                        update();
                    }
                });
                const rollBtn = diceTab.querySelector('#dice-roll');
                if (rollBtn)
                    rollBtn.addEventListener('click', () => {
                        const nInp = diceTab.querySelector('#dice-n');
                        const fInp = diceTab.querySelector('#dice-f');
                        const n = Math.max(1, Number(nInp.value) || 1);
                        const f = Math.max(2, Number(fInp.value) || 0);
                        if (!f) return;
                        const notation = `${n}d${f}`;
                        const rolls = [];
                        let sum = 0;
                        for (let i = 0; i < n; i++) {
                            const r = 1 + Math.floor(Math.random() * f);
                            rolls.push(r);
                            sum += r;
                        }
                        c.rollLog = Array.isArray(c.rollLog) ? c.rollLog : [];
                        c.rollLog.unshift({ type: 'dice', ts: Date.now(), notation, rolls, total: sum });
                        if (c.rollLog.length > 200) c.rollLog.length = 200;
                        save();
                        update();
                    });
            }
            // Mount dice history using HistoryList
            try {
                const c2 = getSelected();
                const host = editor.querySelector('#dice-history');
                if (host) {
                    const items = (c2.rollLog || []).slice(0, 100);
                    const renderItem = (r) => {
                        if (r.type === 'attr') {
                            const d = r.details || {};
                            const advLabel =
                                d.advantage && d.advantage !== 'normal' ? `, ${d.advantage}=${d.advMod}` : '';
                            return html`<div class="dice-line" data-ts="${r.ts}">
                                <span class="dice-entry"
                                    >[Atributo] ${r.attr}: ${r.total} (1d6=${d.d6}${advLabel}, base=${d.base},
                                    mods=${d.extras}, suerte=${d.luck})</span
                                ><button class="button" data-dice-del="${r.ts}" title="Eliminar">🗑️</button>
                            </div>`;
                        }
                        const rolls = Array.isArray(r.rolls) ? ` [${r.rolls.join(', ')}]` : '';
                        return html`<div class="dice-line" data-ts="${r.ts}">
                            <span class="dice-entry">[Dados] ${r.notation} = ${r.total}${rolls}</span
                            ><button class="button" data-dice-del="${r.ts}" title="Eliminar">🗑️</button>
                        </div>`;
                    };
                    const list = HistoryList(host, { items, renderItem, wrap: false });
                    list.init();
                }
            } catch (_) {}
        }
        if (state.tab === 'progress') {
            const ppTab = editor.querySelector('.pp-tab');
            if (ppTab) {
                ppTab.addEventListener('click', (e) => {
                    const delBtn = e.target && e.target.closest && e.target.closest('[data-pp-del]');
                    if (delBtn) {
                        const ts = Number(delBtn.getAttribute('data-pp-del'));
                        const hist = Array.isArray(c.ppHistory) ? c.ppHistory : [];
                        const entry = hist.find((x) => x.ts === ts);
                        if (entry) {
                            const amount = Math.max(0, Number(entry.amount) || 0);
                            const reason = String(entry.reason || '').trim();
                            const delta = entry.type === 'spend' ? `+${amount}` : `-${amount}`;
                            const ok = window.confirm(
                                `¿Deshacer movimiento de PP?\n\nCambio: ${delta}\nMotivo: ${reason || '(sin motivo)'}\n\nEsta acción revertirá el total actual.`
                            );
                            if (!ok) return;
                            CharacterService.undoPP(c, ts);
                        }
                        save();
                        update();
                        return;
                    }
                });
            }
            // Mount PP history using HistoryList
            try {
                const c2 = getSelected();
                const host = editor.querySelector('#pp-history');
                if (host) {
                    const items = (c2.ppHistory || [])
                        .slice(0, 200)
                        .sort((a, b) => Number(b.ts || 0) - Number(a.ts || 0));
                    const renderItem = (h) => {
                        const sign = h.type === 'spend' ? '-' : '+';
                        const amt = Number(h.amount) || 0;
                        const reason = (h.reason || '').toString();
                        return html`<div class="dice-line" data-ts="${h.ts}">
                            <span class="dice-entry">[PP] ${sign}${amt} — ${reason}</span
                            ><button class="button" data-pp-del="${h.ts}" title="Deshacer">↩️</button>
                        </div>`;
                    };
                    const list = HistoryList(host, { items, renderItem, wrap: false });
                    list.init();
                }
            } catch (_) {}
        }
    };

    let layoutInstance = null;
    const update = () => {
        // Debug: log and measure CharactersPage update calls
        try {
            DebugUtils.logRender('CharactersPage.update', { reason: 'start' });
        } catch (_) {}
        const __updateToken = DebugUtils.isEnabled() ? DebugUtils.timeStart('CharactersPage.update') : null;

        if (!layoutInstance) {
            container.innerHTML = '<div id="layout"></div>';
            const layoutRoot = container.querySelector('#layout');
            layoutInstance = LayoutWithSidebar(layoutRoot, { title: 'Mis personajes' });
            layoutInstance.init();
        }
        const mainEl = layoutInstance.getMainEl();

        // Instrument rendering of the main content to measure cost
        if (DebugUtils.isEnabled()) {
            try {
                DebugUtils.instrumentRender(
                    'CharactersPage.renderInner',
                    () => {
                        mainEl.innerHTML = renderInner();
                    },
                    { phase: 'renderInner' }
                );
            } catch (e) {
                // fallback to normal render
                mainEl.innerHTML = renderInner();
            }
        } else {
            mainEl.innerHTML = renderInner();
        }

        bindEvents(mainEl);

        // Mount portrait image with safe fallback in Bio tab
        try {
            const c = getSelected();
            const pm = mainEl.querySelector('#portrait-mount');
            if (pm) {
                if (DebugUtils.isEnabled()) {
                    try {
                        DebugUtils.instrumentRender(
                            'CharactersPage.mountImageWithFallback',
                            () => {
                                mountImageWithFallback(pm, {
                                    src: c && c.portraitUrl ? String(c.portraitUrl) : '',
                                    alt: c ? `Retrato de ${c.name}` : 'Retrato',
                                    className: 'portrait-img',
                                    placeholderText: 'Sin retrato',
                                });
                            },
                            { phase: 'mountImage' }
                        );
                    } catch (e) {
                        // fallback
                        mountImageWithFallback(pm, {
                            src: c && c.portraitUrl ? String(c.portraitUrl) : '',
                            alt: c ? `Retrato de ${c.name}` : 'Retrato',
                            className: 'portrait-img',
                            placeholderText: 'Sin retrato',
                        });
                    }
                } else {
                    mountImageWithFallback(pm, {
                        src: c && c.portraitUrl ? String(c.portraitUrl) : '',
                        alt: c ? `Retrato de ${c.name}` : 'Retrato',
                        className: 'portrait-img',
                        placeholderText: 'Sin retrato',
                    });
                }
            }
        } catch (_) {}

        // Debug: finish timing
        try {
            if (__updateToken) DebugUtils.timeEnd(__updateToken, { phase: 'end' });
            DebugUtils.logRender('CharactersPage.update', { reason: 'end' });
        } catch (_) {}
        // Restore focus on card search if user was typing
        if (state.focusCardSearch) {
            const search = mainEl.querySelector('#card-search');
            if (search) {
                const val = search.value;
                search.focus();
                search.setSelectionRange(val.length, val.length);
            }
            state.focusCardSearch = false;
        }
    };

    const init = async () => {
        loadStyles();
        try {
            state.allCards = await CardService.loadAll();
            state.facets = CardService.getFacets(state.allCards);
        } catch (_) {}
        // Restore selection from query param if present
        try {
            const url = new URL(window.location.href);
            const qid = url.searchParams.get('char');
            if (qid && state.list.some((x) => x.id === qid)) state.selectedId = qid;
        } catch (_) {}
        if (!state.selectedId && state.list[0]) state.selectedId = state.list[0].id;
        setCharQuery(state.selectedId);

        // Listen for global save events and persist updates to the characters list.
        // Handles payloads from components that dispatch `arcana:save` with either:
        //  - { id, equipmentList }
        //  - { id, updatedCharacter }
        //  - { id, <any other fields> } (will be merged into the character)
        try {
            window.addEventListener('arcana:save', (ev) => {
                try {
                    const d = ev && ev.detail ? ev.detail : null;
                    if (!d) return;
                    const id = d.id;
                    if (!id) return;
                    const idx = state.list.findIndex((x) => x.id === id);
                    if (idx === -1) return;

                    // If payload contains equipmentList explicitly, update that field
                    if (Array.isArray(d.equipmentList)) {
                        state.list[idx].equipmentList = d.equipmentList;
                    }

                    // If payload contains an updatedCharacter object, merge its properties
                    if (d.updatedCharacter && typeof d.updatedCharacter === 'object') {
                        state.list[idx] = { ...state.list[idx], ...d.updatedCharacter };
                    }

                    // Merge any other direct fields (except id) into the character
                    const extras = { ...d };
                    delete extras.id;
                    delete extras.equipmentList;
                    delete extras.updatedCharacter;
                    if (Object.keys(extras).length) {
                        state.list[idx] = { ...state.list[idx], ...extras };
                    }

                    // Persist changes
                    save();
                } catch (_) {
                    // Ignore individual handler errors
                }
            });
        } catch (_) {}

        update();
    };

    return { init };
};

export default CharactersPage;
