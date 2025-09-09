const html = window.html || String.raw;

import StorageUtils from '../../utils/storage-utils.js';
import SidebarComponent from '../../components/SidebarComponent/SidebarComponent.js';
import { RULES, computeDerivedStats } from '../../models/rules.js';
import CardComponent from '../../components/CardComponent/CardComponent.js';
import CardService from '../../services/card-service.js';

const STORAGE_KEY = 'arcana:characters';
const EXAMPLES_CONFIG = 'config/example-characters.json';

const CharactersExamplesPage = (container) => {
    let state = {
        list: [],
        selectedIdx: 0,
        allCards: [],
        tab: 'sheet'
    };

    const loadStyles = () => {
        const href = './src/pages/CharactersPage/CharactersPage.css';
        if (![...document.querySelectorAll('link[rel="stylesheet"]')].some(l => l.getAttribute('href') === href)) {
            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = href; // reuse characters page styles
            document.head.appendChild(link);
        }
    };

    const getSelected = () => state.list[state.selectedIdx] || null;

    const render = () => html`
        <div class="container">
            <div class="layout-with-sidebar">
                <div id="sidebar"></div>
                <div class="main-panel">
                    <div class="page-header"><button class="nav-toggle" id="open-drawer" aria-label="Abrir menú">☰</button> <h1 class="page-title">Personajes de ejemplo</h1></div>
                    <div class="characters">
                        <aside class="characters-list">
                            <div class="list-header">
                                <button class="button" data-action="add-selected">Añadir a mis personajes</button>
                            </div>
                            <ul class="items">
                                ${state.list.map((p, i) => html`<li>
                                    <button class="item ${state.selectedIdx===i?'active':''}" data-idx="${i}">${p.name||'Personaje'}</button>
                                </li>`).join('')}
                            </ul>
                        </aside>
                        <section class="characters-editor">
                            ${renderEditor()}
                        </section>
                    </div>
                </div>
            </div>
        </div>
    `;

    const renderEditor = () => {
        const c = getSelected();
        if (!c) return html`<div class="empty-state">No hay personajes de ejemplo</div>`;
        // Normalize minimal fields to avoid errors
        const attrs = { Cuerpo: 1, Agilidad: 1, Mente: 1, Instinto: 1, Presencia: 1, ...(c.attributes||{}) };
        const derivedBase = computeDerivedStats(attrs);
        const ndBase = { ndMente: 5 + (Number(attrs.Mente)||0), ndInstinto: 5 + (Number(attrs.Instinto)||0) };
        const luckBase = { suerteMax: 5 };
        const derived = { ...derivedBase, ...ndBase, ...luckBase };
        const cards = Array.isArray(c.cards) ? c.cards : [];
        const activeCards = Array.isArray(c.activeCards) ? c.activeCards : [];
        const activeSlots = typeof c.activeSlots === 'number' ? c.activeSlots : 3;
        return html`
            <div class="editor-header">
                <input id="name" class="name-input" type="text" value="${c.name||'Personaje'}" disabled />
            </div>
            <div class="tabs">
                <button class="tab ${state.tab==='sheet'?'active':''}" data-tab="sheet">Hoja</button>
                <button class="tab ${state.tab==='cards'?'active':''}" data-tab="cards">Cartas</button>
            </div>
            ${state.tab==='sheet' ? html`
            <div class="editor-grid">
                <div class="panel">
                    <label>Atributos</label>
                    <div class="attrs">
                        ${Object.entries(attrs).map(([k,v]) => html`<div class="attr"><span>${k}</span>
                            <input type="number" min="${RULES.attributeMin}" max="${RULES.attributeMax}" step="1" value="${v}" disabled />
                            <button class="button" disabled>🎲</button>
                        </div>`).join('')}
                    </div>
                </div>
                <div class="panel">
                    <label>Derivados</label>
                    <div class="attrs attrs-deriv">
                        <div class="attr"><span>Salud</span>
                            <div class="hp-wrap"><input type="number" id="hp" min="0" step="1" value="${Number(c.hp)||derived.salud}" disabled /> / <strong>${derived.salud}</strong></div>
                        </div>
                        <div class="attr"><span>Salud temporal</span><input type="number" min="0" step="1" value="${Number(c.tempHp)||0}" disabled /></div>
                        <div class="attr"><span>Velocidad</span><strong>${derived.velocidad}</strong></div>
                        <div class="attr"><span>Esquiva</span><strong>${derived.esquiva}</strong></div>
                        <div class="attr" style="grid-column:1 / -1; padding-top:.25rem;"><strong>ND de Conjuro</strong></div>
                        <div class="attr"><span>ND (Mente)</span><strong>${derived.ndMente}</strong></div>
                        <div class="attr"><span>ND (Instinto)</span><strong>${derived.ndInstinto}</strong></div>
                    </div>
                </div>
                <div class="panel">
                    <label>Progreso</label>
                    <div class="attrs">
                        <div class="attr"><span>PP</span><input type="number" min="0" step="1" value="${Number(c.pp)||0}" disabled /></div>
                        <div class="attr"><span>Suerte</span><div class="hp-wrap"><input type="number" min="0" step="1" value="${Number(c.suerte)||0}" disabled /> / <strong>${derived.suerteMax}</strong></div></div>
                    </div>
                </div>
                <div class="panel">
                    <label>Economía</label>
                    <div class="attrs">
                        <div class="attr"><span>Oro</span><input type="number" min="0" step="1" value="${Number(c.gold)||0}" disabled /></div>
                    </div>
                </div>
                <div class="panel">
                    <label>Equipo</label>
                    <textarea rows="6" disabled>${String(c.equipment||'')}</textarea>
                </div>
                <div class="panel">
                    <label>Notas</label>
                    <textarea rows="6" disabled>${String(c.notes||'')}</textarea>
                </div>
            </div>
            ` : html`
            <div class="editor-grid one-col">
                <div class="panel">
                    <label>Activas (${activeCards.length}/${activeSlots})</label>
                    <div class="cards-grid">
                        ${activeCards
                            .map(id => state.allCards.find(x=>x.id===id))
                            .filter(Boolean)
                            .sort((a,b)=> (Number(a.level)-Number(b.level)) || String(a.name).localeCompare(String(b.name)))
                            .map(card => html`<div class="card-slot" data-id="${card.id}" data-actions="view"></div>`)
                            .join('')}
                    </div>
                </div>
                <div class="panel">
                    <div class="panel-header"><label style="margin:0;">Tu colección (${cards.length})</label></div>
                    <div class="cards-grid">
                        ${cards
                            .map(id => state.allCards.find(x=>x.id===id))
                            .filter(Boolean)
                            .sort((a,b)=> (Number(a.level)-Number(b.level)) || String(a.name).localeCompare(String(b.name)))
                            .map(card => html`<div class="card-slot" data-id="${card.id}" data-actions="view"></div>`)
                            .join('')}
                    </div>
                </div>
            </div>
            `}
        `;
    };

    const bindEvents = () => {
        const sidebar = SidebarComponent(container.querySelector('#sidebar'));
        sidebar.init();
        const openDrawerBtn = container.querySelector('#open-drawer');
        if (openDrawerBtn) openDrawerBtn.addEventListener('click', () => {
            const existing = document.querySelector('.drawer-backdrop');
            if (existing) { existing.remove(); document.body.classList.remove('no-scroll'); return; }
            const backdrop = document.createElement('div');
            backdrop.className = 'drawer-backdrop open';
            backdrop.innerHTML = '<div class="drawer-panel"><div id="drawer-sidebar"></div></div>';
            document.body.appendChild(backdrop);
            document.body.classList.add('no-scroll');
            const drawerContainer = document.getElementById('drawer-sidebar');
            const drawerSidebar = SidebarComponent(drawerContainer);
            drawerSidebar.init();
            const closeAll = () => { backdrop.remove(); document.body.classList.remove('no-scroll'); };
            backdrop.addEventListener('click', (e) => { if (e.target === backdrop) closeAll(); });
            const panel = backdrop.querySelector('.drawer-panel');
            if (panel) panel.addEventListener('click', (e) => {
                const link = e.target && e.target.closest && e.target.closest('a');
                if (link) setTimeout(closeAll, 0);
            });
        });

        // List selection
        container.querySelectorAll('.items .item').forEach(btn => btn.addEventListener('click', () => {
            state.selectedIdx = Number(btn.getAttribute('data-idx')) || 0;
            update();
        }));

        // Tabs
        container.querySelectorAll('.tab').forEach(t => t.addEventListener('click', () => { state.tab = t.getAttribute('data-tab'); update(); }));

        // Add current example into user's characters
        const addBtn = container.querySelector('[data-action="add-selected"]');
        if (addBtn) addBtn.addEventListener('click', () => {
            const src = getSelected(); if (!src) return;
            const makeId = () => (crypto.randomUUID ? crypto.randomUUID() : String(Date.now()));
            const clone = {
                id: makeId(),
                name: src.name || 'Personaje',
                attributes: { Cuerpo: 1, Agilidad: 1, Mente: 1, Instinto: 1, Presencia: 1, ...(src.attributes||{}) },
                cards: Array.isArray(src.cards) ? [...src.cards] : [],
                activeCards: Array.isArray(src.activeCards) ? [...src.activeCards] : [],
                activeSlots: typeof src.activeSlots === 'number' ? src.activeSlots : 3,
                pp: Number(src.pp)||0,
                gold: Number(src.gold)||0,
                equipment: String(src.equipment||''),
                modifiers: Array.isArray(src.modifiers) ? JSON.parse(JSON.stringify(src.modifiers)) : [],
                suerte: Number(src.suerte)||0,
                hp: Number(src.hp)||0,
                tempHp: Number(src.tempHp)||0,
                notes: String(src.notes||'')
            };
            const current = StorageUtils.load(STORAGE_KEY, []);
            current.push(clone);
            StorageUtils.save(STORAGE_KEY, current);
            alert('Añadido a “Mis personajes”. Puedes editarlo desde esa página.');
        });

        // Mount visual cards using CardComponent, read-only (no actions)
        container.querySelectorAll('.card-slot').forEach(slot => {
            const id = slot.getAttribute('data-id');
            const card = state.allCards.find(x=>x.id===id);
            if (!card) return;
            const comp = CardComponent(slot, { card, actionsRenderer: () => '' });
            comp.init();
        });
    };

    const update = () => {
        container.innerHTML = render();
        bindEvents();
    };

    const init = async () => {
        loadStyles();
        try {
            const res = await fetch(EXAMPLES_CONFIG, { cache: 'no-store' });
            const json = await res.json();
            state.list = Array.isArray(json) ? json : (json ? [json] : []);
        } catch (_) { state.list = []; }
        try { state.allCards = await CardService.loadAll(); } catch (_) { state.allCards = []; }
        update();
    };

    return { init };
};

export default CharactersExamplesPage;
