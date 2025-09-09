const html = window.html || String.raw;

import StorageUtils from "../../utils/storage-utils.js";
import SidebarComponent from "../../components/SidebarComponent/SidebarComponent.js";
import CardService from "../../services/card-service.js";
import { RULES, computeDerivedStats } from "../../models/rules.js";
import CardComponent from "../../components/CardComponent/CardComponent.js";
import { openRollModal } from "./RollModal.js";

const STORAGE_KEY = "arcana:characters";

const defaultCharacter = () => ({
    id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
    name: "Nuevo personaje",
    attributes: { Cuerpo: 1, Agilidad: 1, Mente: 1, Instinto: 1, Presencia: 1 },
    cards: [],
    activeCards: [],
    activeSlots: 3,
    pp: 0,
    gold: 0,
    equipment: "",
    modifiers: [],
    suerte: 0,
    hp: 0,
    notes: ""
});

const CharactersPage = (container) => {
    let state = {
        list: StorageUtils.load(STORAGE_KEY, []),
        selectedId: null,
        allCards: [],
        playMode: false,
        tab: 'sheet',
        cardSearch: ''
    };

    // --- Helpers for modifiers ---
    const allowedFields = ["salud", "velocidad", "esquiva"];
    function evaluateExpression(expression, context) {
        if (!expression && expression !== 0) return 0;
        const expr = String(expression).trim();
        try {
            const fn = new Function("cuerpo","agilidad","mente","instinto","presencia","salud","velocidad","esquiva","pp","gold","Math", `return (${expr});`);
            return Number(fn(
                Number(context.cuerpo)||0,
                Number(context.agilidad)||0,
                Number(context.mente)||0,
                Number(context.instinto)||0,
                Number(context.presencia)||0,
                Number(context.salud)||0,
                Number(context.velocidad)||0,
                Number(context.esquiva)||0,
                Number(context.pp)||0,
                Number(context.gold)||0,
                Math
            )) || 0;
        } catch (_) { return 0; }
    }

    function applyModifiers(base, character) {
        const attrs = character.attributes || {};
        const ctx = {
            cuerpo: attrs.Cuerpo||0,
            agilidad: attrs.Agilidad||0,
            mente: attrs.Mente||0,
            instinto: attrs.Instinto||0,
            presencia: attrs.Presencia||0,
            salud: base.salud,
            velocidad: base.velocidad,
            esquiva: base.esquiva,
            pp: character.pp||0,
            gold: character.gold||0
        };
        const out = { ...base };
        const mods = Array.isArray(character.modifiers) ? character.modifiers : [];
        for (const m of mods) {
            if (!m || !allowedFields.includes(m.field)) continue;
            const mode = m.mode === 'set' ? 'set' : 'add';
            const delta = evaluateExpression(m.expr ?? 0, ctx);
            if (mode === 'set') out[m.field] = delta; else out[m.field] = (Number(out[m.field])||0) + delta;
            // Update context for chained expressions
            ctx[m.field] = out[m.field];
        }
        return out;
    }

    const loadStyles = () => {
        const href = './src/pages/CharactersPage/CharactersPage.css';
        if (![...document.querySelectorAll('link[rel="stylesheet"]')].some(l => l.getAttribute('href') === href)) {
            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = href;
            document.head.appendChild(link);
        }
    };

    const save = () => StorageUtils.save(STORAGE_KEY, state.list);

    const getSelected = () => state.list.find(c => c.id === state.selectedId) || null;

    const render = () => html`
        <div class="container">
            <div class="layout-with-sidebar">
                <div id="sidebar"></div>
                <div class="main-panel">
                    <div class="page-header"><button class="nav-toggle" id="open-drawer" aria-label="Abrir menú">☰</button> <h1 class="page-title">Personajes</h1></div>
                    <div class="characters">
                        <aside class="characters-list">
                            <div class="list-header">
                                <button class="button primary" data-action="create">Nuevo</button>
                                <div style="display:flex; gap:.5rem; align-items:center;">
                                    <button class="button" data-action="export-current">Exportar</button>
                                    <button class="button" data-action="import-current">Importar</button>
                                    <button class="button" data-action="delete-current">Eliminar</button>
                                    <input id="import-one-file" type="file" accept="application/json" style="display:none" />
                                </div>
                            </div>
                            <ul class="items">
                                ${state.list.map(p => html`<li>
                                    <button class="item ${state.selectedId===p.id?'active':''}" data-id="${p.id}">${p.name}</button>
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
        if (!c) return html`<div class="empty-state">Selecciona o crea un personaje</div>`;
        const availableCards = state.allCards;
        // Guard against older saved characters without new fields
        if (!Array.isArray(c.cards)) c.cards = [];
        if (!Array.isArray(c.activeCards)) c.activeCards = [];
        if (typeof c.activeSlots !== 'number') c.activeSlots = 0;
        if (typeof c.pp !== 'number') c.pp = 0;
        if (typeof c.gold !== 'number') c.gold = 0;
        if (typeof c.equipment !== 'string') c.equipment = "";
        if (typeof c.suerte !== 'number') c.suerte = 0;
        if (!Array.isArray(c.modifiers)) c.modifiers = [];
        const derivedBase = computeDerivedStats(c.attributes);
        const derived = applyModifiers(derivedBase, c);
        // Ensure current health exists and is within [0, max]
        if (typeof c.hp !== 'number' || Number.isNaN(c.hp)) c.hp = derived.salud;
        c.hp = Math.max(0, Math.min(c.hp, derived.salud));
        return html`
            <div class="editor-header">
                <input id="name" class="name-input" type="text" value="${c.name}" />
            </div>
            <div class="tabs">
                <button class="tab ${state.tab==='sheet'?'active':''}" data-tab="sheet">Hoja</button>
                <button class="tab ${state.tab==='cards'?'active':''}" data-tab="cards">Cartas</button>
                <button class="tab ${state.tab==='mods'?'active':''}" data-tab="mods">Modificadores</button>
            </div>
            ${state.tab==='sheet' ? html`
            <div class="editor-grid">
                <div class="panel">
                    <label>Atributos</label>
                    <div class="attrs">
                        ${Object.entries(c.attributes).map(([k,v]) => html`<div class="attr"><span>${k}</span>
                            <input type="number" min="${RULES.attributeMin}" max="${RULES.attributeMax}" step="1" data-attr="${k}" value="${v}" />
                            <button class="button" data-roll-attr="${k}">Tirar</button>
                        </div>`).join('')}
                    </div>
                </div>
                <div class="panel">
                    <label>Derivados</label>
                    <div class="attrs attrs-deriv">
                        <div class="attr"><span>Salud</span>
                            <div class="hp-wrap"><input type="number" id="hp" min="0" step="1" value="${c.hp}" /> / <strong>${derived.salud}</strong></div>
                        </div>
                        <div class="attr"><span>Velocidad</span><strong>${derived.velocidad}</strong></div>
                        <div class="attr"><span>Esquiva</span><strong>${derived.esquiva}</strong></div>
                    </div>
                </div>
                <div class="panel">
                    <label>Progreso</label>
                    <div class="attrs">
                        <div class="attr"><span>PP</span><input type="number" id="pp" min="0" step="1" value="${c.pp||0}" /></div>
                        <div class="attr"><span>Suerte</span><input type="number" id="suerte" min="0" step="1" value="${c.suerte||0}" /></div>
                    </div>
                </div>
                <div class="panel">
                    <label>Economía</label>
                    <div class="attrs">
                        <div class="attr"><span>Oro</span><input type="number" id="gold" min="0" step="1" value="${c.gold||0}" /></div>
                    </div>
                </div>
                <div class="panel">
                    <label>Equipo</label>
                    <textarea id="equipment" rows="6">${c.equipment||''}</textarea>
                </div>
                <div class="panel">
                    <label>Notas</label>
                    <textarea id="notes" rows="6">${c.notes||''}</textarea>
                </div>
            </div>
            ` : state.tab==='cards' ? html`
            <div class="editor-grid one-col">
                <div class="panel">
                    <label>Ranuras activas</label>
                    <input type="number" id="active-slots" min="0" step="1" value="${c.activeSlots||0}" />
                </div>
                <div class="panel">
                    <div class="cards-search">
                        <input id="card-search" type="text" placeholder="Buscar carta..." value="${state.cardSearch||''}" />
                    </div>
                    <label>Colección</label>
                    <div class="cards-grid">
                        ${c.cards
                            .map(id => state.allCards.find(x=>x.id===id))
                            .filter(Boolean)
                            .sort((a,b)=> (Number(a.level)-Number(b.level)) || String(a.name).localeCompare(String(b.name)))
                            .map(card => html`<div class="card-slot" data-id="${card.id}" data-actions="toggle"></div>`)
                            .join('')}
                    </div>
                </div>
                <div class="panel">
                    <label>Activas (${(c.activeCards||[]).length}/${c.activeSlots||0})</label>
                    <div class="cards-grid">
                        ${(c.activeCards||[])
                            .map(id => state.allCards.find(x=>x.id===id))
                            .filter(Boolean)
                            .sort((a,b)=> (Number(a.level)-Number(b.level)) || String(a.name).localeCompare(String(b.name)))
                            .map(card => html`<div class="card-slot" data-id="${card.id}" data-actions="deactivate"></div>`)
                            .join('')}
                    </div>
                </div>
                <div class="panel">
                    <label>Añadir a colección</label>
                    <div class="cards-grid">
                        ${availableCards
                            .filter(x => !c.cards.includes(x.id) && (!state.cardSearch || String(x.name||'').toLowerCase().includes(state.cardSearch.toLowerCase())))
                            .sort((a,b)=> (Number(a.level)-Number(b.level)) || String(a.name).localeCompare(String(b.name)))
                            .slice(0,12)
                            .map(card => html`<div class="card-slot" data-id="${card.id}" data-actions="add"></div>`)
                            .join('')}
                    </div>
                </div>
            </div>
            ` : html`
            <div class="editor-grid one-col">
                <div class="panel">
                    <label>Listado de modificadores</label>
                    <div class="mods">
                        ${(c.modifiers||[]).map((m, idx) => html`
                            <div class="mod-row" data-idx="${idx}">
                                <select data-mod-field>
                                    ${allowedFields.map(f => html`<option value="${f}" ${m.field===f?'selected':''}>${f}</option>`).join('')}
                                </select>
                                <select data-mod-mode>
                                    <option value="add" ${m.mode!=='set'?'selected':''}>+</option>
                                    <option value="set" ${m.mode==='set'?'selected':''}>=</option>
                                </select>
                                <input type="text" data-mod-expr placeholder="expresion (e.g., 2, cuerpo*2)" value="${m.expr||''}" />
                                <input type="text" data-mod-label placeholder="Etiqueta (opcional)" value="${m.label||''}" />
                                <button class="button" data-mod-remove>Eliminar</button>
                            </div>
                        `).join('')}
                        <div>
                            <button class="button primary" data-mod-add>Agregar modificador</button>
                        </div>
                    </div>
                </div>
                <div class="panel">
                    <label>Resumen</label>
                    <div class="attrs">
                        <div class="attr"><span>Salud</span><strong>${derived.salud}</strong></div>
                        <div class="attr"><span>Velocidad</span><strong>${derived.velocidad}</strong></div>
                        <div class="attr"><span>Esquiva</span><strong>${derived.esquiva}</strong></div>
                    </div>
                    <small>Variables disponibles: cuerpo, agilidad, mente, instinto, presencia, salud, velocidad, esquiva, pp, gold.</small>
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

        container.querySelector('[data-action="create"]').addEventListener('click', () => {
            const c = defaultCharacter();
            state.list.push(c);
            state.selectedId = c.id;
            save();
            update();
        });
        // Export/import current from list toolbar
        const exportCurrent = container.querySelector('[data-action="export-current"]');
        const importCurrent = container.querySelector('[data-action="import-current"]');
        const deleteCurrent = container.querySelector('[data-action="delete-current"]');
        const importOneFile = container.querySelector('#import-one-file');
        if (exportCurrent) exportCurrent.addEventListener('click', () => {
            const current = getSelected();
            if (!current) return;
            const blob = new Blob([JSON.stringify(current, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url; a.download = `${(current.name||'character').replace(/\s+/g,'_')}.json`; a.click(); URL.revokeObjectURL(url);
        });
        if (importCurrent) importCurrent.addEventListener('click', () => importOneFile && importOneFile.click());
        if (deleteCurrent) deleteCurrent.addEventListener('click', () => {
            const current = getSelected();
            if (!current) return;
            const ok = window.confirm(`¿Seguro que quieres eliminar "${current.name}"?`);
            if (!ok) return;
            state.list = state.list.filter(x => x.id !== current.id);
            state.selectedId = state.list[0]?.id || null;
            save(); update();
        });
        if (importOneFile) importOneFile.addEventListener('change', async (e) => {
            const file = e.target.files && e.target.files[0]; if (!file) return;
            try {
                const text = await file.text();
                const obj = JSON.parse(text);
                if (obj && typeof obj === 'object') {
                    let newId = obj.id || (crypto.randomUUID ? crypto.randomUUID() : String(Date.now()));
                    if (state.list.some(x => x.id === newId)) newId = `${newId}-${Date.now()}`;
                    const merged = { ...defaultCharacter(), ...obj, id: newId };
                    state.list.push(merged);
                    state.selectedId = merged.id;
                    save(); update();
                }
            } catch (_) {}
            e.target.value = '';
        });
        container.querySelectorAll('.items .item').forEach(btn => btn.addEventListener('click', () => {
            state.selectedId = btn.getAttribute('data-id');
            update();
        }));

        const editor = container.querySelector('.characters-editor');
        if (!editor) return;
        const c = getSelected();
        if (!c) return;

        const name = editor.querySelector('#name');
        const notes = editor.querySelector('#notes');
        const del = null;
        const cardAdd = editor.querySelector('#card-add');
        const pp = editor.querySelector('#pp');
        const activeSlots = editor.querySelector('#active-slots');
        const gold = editor.querySelector('#gold');
        const equipment = editor.querySelector('#equipment');
        const cardSearch = editor.querySelector('#card-search');
        const suerte = editor.querySelector('#suerte');
        const hp = editor.querySelector('#hp');

        editor.querySelectorAll('.tab').forEach(t => t.addEventListener('click', () => { state.tab = t.getAttribute('data-tab'); update(); }));

        if (name) name.addEventListener('input', (e) => { c.name = e.target.value; save(); });
        if (notes) notes.addEventListener('input', (e) => { c.notes = e.target.value; save(); });
        if (pp) pp.addEventListener('change', (e) => { c.pp = Math.max(0, Number(e.target.value)||0); save(); });
        if (suerte) suerte.addEventListener('change', (e) => { c.suerte = Math.max(0, Number(e.target.value)||0); save(); });
        if (hp) hp.addEventListener('change', (e) => { c.hp = Math.max(0, Number(e.target.value)||0); save(); update(); });
        if (gold) gold.addEventListener('change', (e) => { c.gold = Math.max(0, Number(e.target.value)||0); save(); });
        if (equipment) equipment.addEventListener('input', (e) => { c.equipment = e.target.value; save(); });
        if (cardSearch) cardSearch.addEventListener('input', (e) => { state.cardSearch = e.target.value; update(); });
        if (activeSlots) activeSlots.addEventListener('change', (e) => { c.activeSlots = Math.max(0, Number(e.target.value)||0); if (c.activeCards.length > c.activeSlots) c.activeCards = c.activeCards.slice(0, c.activeSlots); save(); update(); });
        // delete handled from list toolbar
        // Removed per-editor export/import (moved to list toolbar)
        editor.querySelectorAll('input[data-attr]').forEach(inp => inp.addEventListener('change', (e) => {
            const key = e.target.getAttribute('data-attr');
            c.attributes[key] = Math.max(RULES.attributeMin, Math.min(RULES.attributeMax, Number(e.target.value)||RULES.attributeMin));
            save(); update();
        }));
        editor.querySelectorAll('[data-roll-attr]').forEach(btn => btn.addEventListener('click', () => {
            const key = btn.getAttribute('data-roll-attr');
            const val = Number(c.attributes[key])||0;
            openRollModal(document.body, { attributeName: key, attributeValue: val, maxSuerte: c.suerte||0 }, (res) => {
                if (res && res.luck) { c.suerte = Math.max(0, (c.suerte||0) - res.luck); save(); update(); }
            });
        }));
        editor.querySelectorAll('[data-add-card]').forEach(btn => btn.addEventListener('click', () => {
            const id = btn.getAttribute('data-add-card');
            if (id && !c.cards.includes(id)) { c.cards.push(id); save(); update(); }
        }));
        editor.querySelectorAll('[data-toggle-active]').forEach(btn => btn.addEventListener('click', () => {
            const id = btn.getAttribute('data-toggle-active');
            const idx = c.activeCards.indexOf(id);
            if (idx>=0) c.activeCards.splice(idx,1); else if (c.activeCards.length < (c.activeSlots||0)) c.activeCards.push(id);
            save(); update();
        }));

        // Mount visual cards using CardComponent in cards tab, with integrated actions
        editor.querySelectorAll('.card-slot').forEach(slot => {
            const id = slot.getAttribute('data-id');
            const mode = slot.getAttribute('data-actions');
            const card = state.allCards.find(x=>x.id===id);
            if (!card) return;
            const actionsRenderer = (c) => {
                const typeLower = String(c.type||'').toLowerCase();
                const canActivate = !(typeLower === 'efecto' || typeLower === 'de efecto');
                if (mode === 'toggle') {
                    const active = (getSelected().activeCards||[]).includes(c.id);
                    return canActivate ? `<button class="button" data-toggle-active="${c.id}">${active?'Desactivar':'Activar'}</button>` : `<span class="muted">No activable</span>`;
                }
                if (mode === 'deactivate') {
                    return `<button class="button" data-toggle-active="${c.id}">Desactivar</button>`;
                }
                if (mode === 'add') {
                    return `<button class="button" data-add-card="${c.id}">Añadir</button>`;
                }
                return '';
            };
            const comp = CardComponent(slot, { card, actionsRenderer });
            comp.init();
        });
        editor.querySelectorAll('[data-remove]').forEach(btn => btn.addEventListener('click', () => {
            const id = btn.getAttribute('data-remove');
            const idx = c.cards.indexOf(id); if (idx>=0) c.cards.splice(idx,1);
            save(); update();
        }));

        // Modifiers events
        const addMod = editor.querySelector('[data-mod-add]');
        if (addMod) addMod.addEventListener('click', () => {
            c.modifiers.push({ field: 'salud', mode: 'add', expr: '0', label: '' });
            save(); update();
        });
        editor.querySelectorAll('.mod-row').forEach(row => {
            const idx = Number(row.getAttribute('data-idx'));
            const m = c.modifiers[idx];
            if (!m) return;
            const fieldSel = row.querySelector('[data-mod-field]');
            const modeSel = row.querySelector('[data-mod-mode]');
            const exprInp = row.querySelector('[data-mod-expr]');
            const labelInp = row.querySelector('[data-mod-label]');
            const rmBtn = row.querySelector('[data-mod-remove]');
            if (fieldSel) fieldSel.addEventListener('change', (e) => { m.field = e.target.value; save(); });
            if (modeSel) modeSel.addEventListener('change', (e) => { m.mode = e.target.value; save(); });
            if (exprInp) exprInp.addEventListener('input', (e) => { m.expr = e.target.value; save(); });
            if (labelInp) labelInp.addEventListener('input', (e) => { m.label = e.target.value; save(); });
            if (rmBtn) rmBtn.addEventListener('click', () => { c.modifiers.splice(idx,1); save(); update(); });
        });
    };

    const update = () => {
        container.innerHTML = render();
        bindEvents();
    };

    const init = async () => {
        loadStyles();
        try { state.allCards = await CardService.loadAll(); } catch (_) {}
        if (!state.selectedId && state.list[0]) state.selectedId = state.list[0].id;
        update();
    };

    return { init };
};

export default CharactersPage;


