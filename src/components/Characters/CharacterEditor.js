const html = window.html || String.raw;

import { RULES, computeDerivedStats } from '../../models/rules.js';
import CardComponent from '../CardComponent/CardComponent.js';
import CardService from '../../services/card-service.js';
import { openRollModal } from '../../pages/CharactersPage/RollModal.js';

/**
 * CharacterEditor - Right panel editor for a single character
 * @param {HTMLElement} container
 * @param {{
 *  character: any,
 *  allCards: any[],
 *  facets: any,
 *  tab: 'sheet'|'cards'|'mods',
 *  filters: any,
 *  onChange?: (c:any)=>void,
 *  onTab?: (tab:string)=>void
 * }} props
 */
const CharacterEditor = (container, props = {}) => {
    let state = {
        character: props.character,
        allCards: Array.isArray(props.allCards) ? props.allCards : [],
        facets: props.facets || { attributes: [], tags: [], types: [], levels: [] },
        tab: props.tab || 'sheet',
        filters: props.filters || { text: '', levels: [], types: [], attributes: [], tags: [] },
        onChange: typeof props.onChange === 'function' ? props.onChange : () => {},
        onTab: typeof props.onTab === 'function' ? props.onTab : () => {},
    };

    const compute = (c) => {
        const base = computeDerivedStats(c.attributes);
        const ndBase = { ndMente: 5 + (Number(c.attributes.Mente) || 0), ndInstinto: 5 + (Number(c.attributes.Instinto) || 0) };
        return { ...base, ...ndBase, suerteMax: 5 };
    };

    const render = () => {
        const c = state.character;
        const derived = compute(c);
        const header = html`<div class="editor-header"><input id="name" class="name-input" type="text" value="${c.name}" /></div>`;
        const tabs = html`<div class="tabs">
            <button class="tab ${state.tab==='sheet'?'active':''}" data-tab="sheet">Hoja</button>
            <button class="tab ${state.tab==='cards'?'active':''}" data-tab="cards">Cartas</button>
            <button class="tab ${state.tab==='mods'?'active':''}" data-tab="mods">Modificadores</button>
        </div>`;

        const sheet = html`<div class="editor-grid">
            <div class="panel">
                <label>Atributos</label>
                <div class="attrs">
                    ${Object.entries(c.attributes).map(([k,v]) => html`<div class="attr"><span>${k}</span>
                        <input type="number" min="${RULES.attributeMin}" max="${RULES.attributeMax}" step="1" data-attr="${k}" value="${v}" />
                        <button class="button" data-roll-attr="${k}" title="Tirar">🎲</button>
                    </div>`).join('')}
                </div>
            </div>
            <div class="panel">
                <label>Derivados</label>
                <div class="attrs attrs-deriv">
                    <div class="attr"><span>Salud</span><div class="hp-wrap"><input type="number" id="hp" min="0" step="1" value="${c.hp}" /> / <strong>${derived.salud}</strong></div></div>
                    <div class="attr"><span>Salud temporal</span><input type="number" id="temp-hp" min="0" step="1" value="${c.tempHp||0}" /></div>
                    <div class="attr"><span>Velocidad</span><strong>${derived.velocidad}</strong></div>
                    <div class="attr"><span>Esquiva</span><strong>${derived.esquiva}</strong></div>
                    <div class="nd-spells">
                        <div class="attr" style="grid-column:1 / -1; padding-top:.25rem;"><strong>ND de Conjuro</strong></div>
                        <div class="attr child"><span>ND (Mente)</span><strong>${derived.ndMente}</strong></div>
                        <div class="attr child"><span>ND (Instinto)</span><strong>${derived.ndInstinto}</strong></div>
                    </div>
                </div>
            </div>
            <div class="panel">
                <label>Progreso</label>
                <div class="attrs">
                    <div class="attr"><span>PP</span><input type="number" id="pp" min="0" step="1" value="${c.pp||0}" /></div>
                    <div class="attr"><span>Suerte</span><div class="hp-wrap"><input type="number" id="suerte" data-max="${derived.suerteMax}" min="0" step="1" value="${c.suerte||0}" /> / <strong>${derived.suerteMax}</strong></div></div>
                </div>
            </div>
            <div class="panel">
                <label>Economía</label>
                <div class="attrs">
                    <div class="attr"><span>Oro</span><input class="long-input" type="number" id="gold" min="0" step="1" value="${c.gold||0}" /></div>
                </div>
            </div>
            <div class="panel"><label>Equipo</label><textarea id="equipment" rows="6">${c.equipment||''}</textarea></div>
            <div class="panel"><label>Notas</label><textarea id="notes" rows="6">${c.notes||''}</textarea></div>
        </div>`;

        const cards = html`<div class="editor-grid one-col">
            <div class="panel">
                <label>Ranuras activas</label>
                <input type="number" id="active-slots" min="0" step="1" value="${c.activeSlots||0}" />
            </div>
            <div class="panel">
                <label>Activas (${(c.activeCards||[]).length}/${c.activeSlots||0})</label>
                <div class="cards-grid">
                    ${(c.activeCards||[]).map(id => state.allCards.find(x=>x.id===id)).filter(Boolean)
                        .sort((a,b)=> (Number(a.level)-Number(b.level)) || String(a.name).localeCompare(String(b.name)))
                        .map(card => html`<div class="card-slot" data-id="${card.id}" data-actions="deactivate"></div>`).join('')}
                </div>
            </div>
            <div class="panel">
                <div class="panel-header"><label style="margin:0;">Tu colección (${c.cards.length})</label></div>
                <div class="cards-grid">
                    ${c.cards.map(id => state.allCards.find(x=>x.id===id)).filter(Boolean)
                        .sort((a,b)=> (Number(a.level)-Number(b.level)) || String(a.name).localeCompare(String(b.name)))
                        .map(card => html`<div class="card-slot" data-id="${card.id}" data-actions="toggle"></div>`).join('')}
                </div>
            </div>
            <div class="panel">
                <div class="panel-header"><label style="margin:0;">Añadir a tu colección</label></div>
                <div class="cards-search"><input id="card-search" type="text" placeholder="Buscar carta..." value="${state.filters.text||''}" /></div>
                <div class="cards-grid">
                    ${CardService.filter(state.allCards, state.filters).filter(x=>!c.cards.includes(x.id))
                        .sort((a,b)=> (Number(a.level)-Number(b.level)) || String(a.name).localeCompare(String(b.name)))
                        .slice(0,12)
                        .map(card => html`<div class="card-slot" data-id="${card.id}" data-actions="add"></div>`).join('')}
                </div>
            </div>
        </div>`;

        const mods = html`<div class="editor-grid one-col"><slot-mods></slot-mods></div>`;

        return html`${header}${tabs}${state.tab==='sheet'?sheet: state.tab==='cards'?cards:mods}`;
    };

    const mountCards = () => {
        container.querySelectorAll('.card-slot').forEach(slot => {
            const id = slot.getAttribute('data-id');
            const mode = slot.getAttribute('data-actions');
            const card = state.allCards.find(x=>x.id===id);
            if (!card) return;
            const actionsRenderer = (c) => {
                const typeLower = String(c.type||'').toLowerCase();
                const canActivate = !(typeLower === 'efecto' || typeLower === 'de efecto');
                if (mode === 'toggle') {
                    const active = (state.character.activeCards||[]).includes(c.id);
                    const removeBtn = `<button class="button" data-remove="${c.id}">Quitar</button>`;
                    const toggleBtn = canActivate ? `<button class="button" data-toggle-active="${c.id}">${active?'Desactivar':'Activar'}</button>` : `<span class="muted">No activable</span>`;
                    return `<div class="card-buttons">${removeBtn} ${toggleBtn}</div>`;
                }
                if (mode === 'deactivate') return `<button class="button" data-toggle-active="${c.id}">Desactivar</button>`;
                if (mode === 'add') return `<button class="button" data-add-card="${c.id}">Añadir</button>`;
                return '';
            };
            const comp = CardComponent(slot, { card, actionsRenderer });
            comp.init();
        });
    };

    const bind = () => {
        const c = state.character;
        container.querySelectorAll('.tab').forEach(t => t.addEventListener('click', () => { state.tab = t.getAttribute('data-tab'); state.onTab(state.tab); setState({}); }));
        const name = container.querySelector('#name');
        if (name) name.addEventListener('input', (e)=>{ c.name = e.target.value; state.onChange(c); });
        container.querySelectorAll('input[data-attr]').forEach(inp => inp.addEventListener('change', (e)=>{ const key = e.target.getAttribute('data-attr'); c.attributes[key] = Math.max(RULES.attributeMin, Math.min(RULES.attributeMax, Number(e.target.value)||RULES.attributeMin)); state.onChange(c); }));
        const hp = container.querySelector('#hp'); const tempHp = container.querySelector('#temp-hp'); const pp = container.querySelector('#pp'); const suerte = container.querySelector('#suerte'); const gold = container.querySelector('#gold'); const equipment = container.querySelector('#equipment'); const cardSearch = container.querySelector('#card-search'); const activeSlots = container.querySelector('#active-slots');
        if (hp) hp.addEventListener('change', (e)=>{ c.hp = Math.max(0, Number(e.target.value)||0); state.onChange(c); setState({}); });
        if (tempHp) tempHp.addEventListener('change', (e)=>{ c.tempHp = Math.max(0, Number(e.target.value)||0); state.onChange(c); });
        if (pp) pp.addEventListener('change', (e)=>{ c.pp = Math.max(0, Number(e.target.value)||0); state.onChange(c); });
        if (suerte) suerte.addEventListener('change', (e)=>{ const max = Number(e.target.getAttribute('data-max'))||Infinity; c.suerte = Math.max(0, Math.min(Number(e.target.value)||0, max)); state.onChange(c); setState({}); });
        if (gold) gold.addEventListener('change', (e)=>{ c.gold = Math.max(0, Number(e.target.value)||0); state.onChange(c); });
        if (equipment) equipment.addEventListener('input', (e)=>{ c.equipment = e.target.value; state.onChange(c); });
        if (cardSearch) cardSearch.addEventListener('input', (e)=>{ state.filters.text = e.target.value; setState({}); });
        if (activeSlots) activeSlots.addEventListener('change', (e)=>{ c.activeSlots = Math.max(0, Number(e.target.value)||0); if (c.activeCards.length > c.activeSlots) c.activeCards = c.activeCards.slice(0, c.activeSlots); state.onChange(c); setState({}); });
        container.addEventListener('click', (e)=>{
            const addBtn = e.target && e.target.closest && e.target.closest('[data-add-card]');
            if (addBtn) { const id = addBtn.getAttribute('data-add-card'); if (id && !c.cards.includes(id)) { c.cards.push(id); state.onChange(c); setState({}); } }
            const toggleBtn = e.target && e.target.closest && e.target.closest('[data-toggle-active]');
            if (toggleBtn) { const id = toggleBtn.getAttribute('data-toggle-active'); const idx = c.activeCards.indexOf(id); if (idx>=0) c.activeCards.splice(idx,1); else if (c.activeCards.length < (c.activeSlots||0)) c.activeCards.push(id); state.onChange(c); setState({}); }
            const removeBtn = e.target && e.target.closest && e.target.closest('[data-remove]');
            if (removeBtn) { const id = removeBtn.getAttribute('data-remove'); const idx = c.cards.indexOf(id); if (idx>=0) c.cards.splice(idx,1); c.activeCards = Array.isArray(c.activeCards) ? c.activeCards.filter(x=>x!==id) : []; state.onChange(c); setState({}); }
        });
        container.querySelectorAll('[data-roll-attr]').forEach(btn => btn.addEventListener('click', ()=>{ const key = btn.getAttribute('data-roll-attr'); const val = Number(state.character.attributes[key])||0; const derived = compute(state.character); openRollModal(document.body, { attributeName: key, attributeValue: val, maxSuerte: Number(derived.suerteMax)||0 }, (res)=>{ if (res && res.luck) { state.character.suerte = Math.max(0,(state.character.suerte||0)-res.luck); state.onChange(state.character); setState({}); } }); }));
    };

    const setState = (partial) => {
        state = { ...state, ...partial };
        container.innerHTML = render();
        mountCards();
        bind();
    };

    return { init: () => setState({}), setState };
};

export default CharacterEditor;
