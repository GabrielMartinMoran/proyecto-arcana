const html = window.html || String.raw;

import StorageUtils from '../../utils/storage-utils.js';
import LayoutWithSidebar from '../../components/LayoutWithSidebar/LayoutWithSidebar.js';
import Footer from '../../components/Footer/Footer.js';
import { RULES, computeDerivedStats, applyModifiersToDerived } from '../../models/rules.js';
import CardComponent from '../../components/CardComponent/CardComponent.js';
import CardService from '../../services/card-service.js';
import { openRollModal } from '../CharactersPage/RollModal.js';
import { ensureStyles } from '../../utils/style-utils.js';
import { mountImageWithFallback } from '../../utils/image-utils.js';
import EmptyState from '../../components/EmptyState/EmptyState.js';
import CharacterList from '../../components/CharacterList/CharacterList.js';
import CharacterSheet from '../../components/CharacterSheet/CharacterSheet.js';
import AttributesPanel from '../../components/AttributesPanel/AttributesPanel.js';
import DerivedStatsPanel from '../../components/DerivedStatsPanel/DerivedStatsPanel.js';
import EquipmentList from '../../components/EquipmentList/EquipmentList.js';

const STORAGE_KEY = 'arcana:characters';
const EXAMPLES_CONFIG = 'config/example-characters.json';

const CharactersExamplesPage = (container) => {
    let state = {
        list: [],
        selectedIdx: 0,
        allCards: [],
        facets: { levels: [], types: [], attributes: [], tags: [] },
        tab: 'sheet',
        addOnlyEligible: true,
        filtersOpenAdd: false,
        cardSearch: '',
        cardFilters: { levels: [], types: [], attributes: [], tags: [] },
    };

    const loadStyles = () => {
        ensureStyles([
            './src/pages/CharactersPage/CharactersPage.css',
            './src/components/CardComponent/CardComponent.css',
        ]);
    };

    const getSelected = () => state.list[state.selectedIdx] || null;

    const render = () => html`<div id="layout"></div>`;

    const bindEvents = () => {
        const layoutRoot = container.querySelector('#layout');
        const layout = LayoutWithSidebar(layoutRoot, { title: 'Personajes de ejemplo' });
        layout.init();
        layout.setMainHtml(html`
            <div class="characters">
                <div id="examples-list"></div>
                <section class="characters-editor"><div id="sheet-root"></div></section>
            </div>
            ${Footer()}
        `);
        const mainRoot = layout.getMainEl();

        // Mount list
        const listRoot = mainRoot.querySelector('#examples-list');
        const headerHtml = html`<button class="button" data-action="add-selected">Añadir a mis personajes</button>`;
        const list = CharacterList(listRoot, {
            items: state.list,
            selectedIndex: state.selectedIdx,
            headerHtml,
            onSelect: (idx) => {
                state.selectedIdx = idx;
                update();
            },
        });
        list.init();

        // Mount CharacterSheet (read-only)
        const sheetContainer = mainRoot.querySelector('#sheet-root');
        const c = getSelected();
        if (!c) {
            sheetContainer.innerHTML = EmptyState('No hay personajes de ejemplo');
            return;
        }
        const attrs = { Cuerpo: 1, Reflejos: 1, Mente: 1, Instinto: 1, Presencia: 1, ...(c.attributes || {}) };
        const derivedBase = computeDerivedStats(attrs);
        const ndBase = { ndMente: RULES.ndBase + (Number(attrs.Mente) || 0), ndInstinto: RULES.ndBase + (Number(attrs.Instinto) || 0) };
        const luckBase = { suerteMax: RULES.maxLuck };
        const derived = applyModifiersToDerived({ ...derivedBase, ...ndBase, ...luckBase, mitigacion: Number(c.mitigacion) || 0 }, c);
        const sheet = CharacterSheet(sheetContainer, {
            state,
            character: { ...c, attributes: attrs },
            services: { CardService, meetsRequirements: () => true, RULES },
            options: { readOnly: true },
            derived,
            hooks: {
                onBind: (root) => {
                    // Tabs
                    root.querySelectorAll('.tab').forEach((t) =>
                        t.addEventListener('click', () => {
                            state.tab = t.getAttribute('data-tab');
                            update();
                        })
                    );
                    // Mount read-only panels when on Sheet
                    if (state.tab === 'sheet') {
                        try {
                            const attrsHost = root.querySelector('#attributes-host');
                            if (attrsHost) {
                                const comp = AttributesPanel(attrsHost, {
                                    attributes: { ...attrs },
                                    rules: RULES,
                                    suerte: Number(c.suerte) || 0,
                                    suerteMax: Number(derived.suerteMax) || 0,
                                    readOnly: true,
                                    onRoll: (key) => {
                                        const val = Number((attrs || {})[key]) || 0;
                                        const base = computeDerivedStats(attrs || {});
                                        const ndBase = { ndMente: 5 + (Number(attrs.Mente) || 0), ndInstinto: 5 + (Number(attrs.Instinto) || 0) };
                                        const luckBase = { suerteMax: 5 };
                                        const derivedNow = applyModifiersToDerived({ ...base, ...ndBase, ...luckBase, mitigacion: Number(c.mitigacion) || 0 }, c);
                                        openRollModal(document.body, { attributeName: key, attributeValue: val, maxSuerte: Number(derivedNow.suerteMax) || 0 }, () => {});
                                    },
                                });
                                comp.init();
                            }
                            const derivedHost = root.querySelector('#derived-host');
                            if (derivedHost) {
                                const comp2 = DerivedStatsPanel(derivedHost, {
                                    derived,
                                    hp: Number(c.hp) || 0,
                                    tempHp: Number(c.tempHp) || 0,
                                    readOnly: true,
                                });
                                comp2.init();
                            }
                            const eqHost = root.querySelector('#equip-list');
                            if (eqHost) {
                                const comp3 = EquipmentList(eqHost, {
                                    items: Array.isArray(c.equipmentList) ? c.equipmentList : [],
                                    readOnly: true,
                                    onChange: () => {},
                                });
                                comp3.init();
                            }
                        } catch (_) {}
                    }
                    // Portrait in Bio
                    try {
                        const pm = root.querySelector('#portrait-mount');
                        if (pm) {
                            mountImageWithFallback(pm, {
                                src: c && c.portraitUrl ? String(c.portraitUrl) : '',
                                alt: c ? `Retrato de ${c.name}` : 'Retrato',
                                className: 'portrait-img',
                                placeholderText: 'Sin retrato',
                            });
                        }
                    } catch (_) {}
                    // Mount cards read-only
                    if (state.tab === 'cards') {
                        root.querySelectorAll('.card-slot').forEach((slot) => {
                            const id = slot.getAttribute('data-id');
                            const card = state.allCards.find((x) => x.id === id);
                            if (!card) return;
                            const comp = CardComponent(slot, { card, actionsRenderer: () => '' });
                            comp.init();
                        });
                    }
                },
            },
        });
        sheet.init();

        // Add current example into user's characters
        const addBtn = mainRoot.querySelector('[data-action="add-selected"]');
        if (addBtn)
            addBtn.addEventListener('click', () => {
                const src = getSelected();
                if (!src) return;
                const makeId = () => (crypto.randomUUID ? crypto.randomUUID() : String(Date.now()));
                const clone = {
                    id: makeId(),
                    name: src.name || 'Personaje',
                    attributes: {
                        Cuerpo: 1,
                        Reflejos: 1,
                        Mente: 1,
                        Instinto: 1,
                        Presencia: 1,
                        ...(src.attributes || {}),
                    },
                    cards: Array.isArray(src.cards) ? [...src.cards] : [],
                    activeCards: Array.isArray(src.activeCards) ? [...src.activeCards] : [],
                    activeSlots: typeof src.activeSlots === 'number' ? src.activeSlots : 3,
                    pp: Number(src.pp) || 0,
                    gold: Number(src.gold) || 0,
                    equipment: String(src.equipment || ''),
                    modifiers: Array.isArray(src.modifiers) ? JSON.parse(JSON.stringify(src.modifiers)) : [],
                    suerte: Number(src.suerte) || 0,
                    hp: Number(src.hp) || 0,
                    tempHp: Number(src.tempHp) || 0,
                    notes: String(src.notes || ''),
                    portraitUrl: String(src.portraitUrl || ''),
                    bio: String(src.bio || ''),
                };
                const current = StorageUtils.load(STORAGE_KEY, []);
                current.push(clone);
                StorageUtils.save(STORAGE_KEY, current);
                alert('Añadido a “Mis personajes”. Puedes editarlo desde esa página.');
            });
    };

    const update = () => {
        container.innerHTML = render();
        bindEvents();
        // Mount portrait safely
        try {
            const c = getSelected();
            const pm = container.querySelector('#portrait-mount');
            if (pm) {
                mountImageWithFallback(pm, {
                    src: c && c.portraitUrl ? String(c.portraitUrl) : '',
                    alt: c ? `Retrato de ${c.name}` : 'Retrato',
                    className: 'portrait-img',
                    placeholderText: 'Sin retrato',
                });
            }
        } catch (_) {}
    };

    const init = async () => {
        loadStyles();
        try {
            const res = await fetch(EXAMPLES_CONFIG, { cache: 'no-store' });
            const json = await res.json();
            state.list = Array.isArray(json) ? json : json ? [json] : [];
        } catch (_) {
            state.list = [];
        }
        try {
            state.allCards = await CardService.loadAll();
            state.facets = CardService.getFacets(state.allCards);
        } catch (_) {
            state.allCards = [];
            state.facets = { levels: [], types: [], attributes: [], tags: [] };
        }
        update();
    };

    return { init };
};

export default CharactersExamplesPage;
