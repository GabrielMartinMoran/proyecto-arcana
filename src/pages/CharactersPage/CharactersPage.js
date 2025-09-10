const html = window.html || String.raw;

import StorageUtils from '../../utils/storage-utils.js';
import LayoutWithSidebar from '../../components/LayoutWithSidebar/LayoutWithSidebar.js';
import { ensureStyles } from '../../utils/style-utils.js';
import CardService from '../../services/card-service.js';
import {
    RULES,
    computeDerivedStats,
    applyModifiersToDerived,
    ALLOWED_MODIFIER_FIELDS,
    evaluateModifierExpression,
} from '../../models/rules.js';
import CardComponent from '../../components/CardComponent/CardComponent.js';
import { openRollModal } from './RollModal.js';

const STORAGE_KEY = 'arcana:characters';

const defaultCharacter = () => ({
    id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
    name: 'Nuevo personaje',
    attributes: { Cuerpo: 1, Agilidad: 1, Mente: 1, Instinto: 1, Presencia: 1 },
    cards: [],
    activeCards: [],
    activeSlots: 3,
    pp: 0,
    gold: 0,
    equipment: '',
    equipmentList: [],
    modifiers: [],
    suerte: 0,
    hp: 0,
    notes: '',
    portraitUrl: '',
    bio: '',
    mitigacion: 0,
    tempHp: 0,
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
    };

    // --- Helpers for modifiers (shared) ---
    const allowedFields = ALLOWED_MODIFIER_FIELDS;
    const evaluateExpression = evaluateModifierExpression;

    // Map requirement attribute aliases to character attributes
    const REQUIREMENT_ATTR_MAP = {
        Reflejos: 'Agilidad',
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
            if (/^solo\s+creación/i.test(r)) return true; // already owned; acquisition-only rule
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

    const renderInner = () => html`
        <div class="characters">
            <aside class="characters-list">
                <div class="list-header">
                    <div class="buttons-container">
                        <button class="button" data-action="create" title="Crear">➕</button>
                        <button class="button" data-action="export-current" title="Exportar">📤</button>
                        <button class="button" data-action="import-current" title="Importar">📥</button>
                        <button class="button" data-action="delete-current" title="Eliminar">🗑️</button>
                        <input id="import-one-file" type="file" accept="application/json" style="display:none" />
                    </div>
                </div>
                <ul class="items">
                    ${state.list
                        .map((p) => {
                            const initial = (p.name || '?').trim().charAt(0).toUpperCase();
                            return html`<li>
                                <button class="item ${state.selectedId === p.id ? 'active' : ''}" data-id="${p.id}">
                                    <span class="avatar ${p.portraitUrl ? '' : 'placeholder'}" aria-hidden="true">
                                        ${p.portraitUrl
                                            ? `<img src="${p.portraitUrl}" alt="" referrerpolicy="no-referrer" onerror="this.style.display='none'; this.parentElement.classList.add('placeholder');" />`
                                            : ''}
                                        <span class="initial">${initial}</span>
                                    </span>
                                    <span class="item-name">${p.name}</span>
                                </button>
                            </li>`;
                        })
                        .join('')}
                </ul>
            </aside>
            <section class="characters-editor">${renderEditor()}</section>
        </div>
        <footer class="site-footer">
            © Gabriel Martín Moran. Todos los derechos reservados —
            <a href="LICENSE" target="_blank" rel="noopener">Licencia MIT</a>.
        </footer>
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
        if (typeof c.equipment !== 'string') c.equipment = '';
        if (!Array.isArray(c.equipmentList)) {
            const trimmed = String(c.equipment || '').trim();
            c.equipmentList = trimmed ? [{ qty: 1, name: trimmed, notes: '' }] : [];
        }
        if (typeof c.suerte !== 'number') c.suerte = 0;
        if (typeof c.mitigacion !== 'number') c.mitigacion = 0;
        if (!Array.isArray(c.modifiers)) c.modifiers = [];
        if (typeof c.tempHp !== 'number') c.tempHp = 0;
        const derivedBase = computeDerivedStats(c.attributes);
        const ndBase = {
            ndMente: 5 + (Number(c.attributes.Mente) || 0),
            ndInstinto: 5 + (Number(c.attributes.Instinto) || 0),
        };
        const luckBase = { suerteMax: 5 };
        const derived = applyModifiersToDerived(
            { ...derivedBase, ...ndBase, ...luckBase, mitigacion: Number(c.mitigacion) || 0 },
            c
        );
        // Ensure current health exists and is within [0, max]
        if (typeof c.hp !== 'number' || Number.isNaN(c.hp)) c.hp = derived.salud;
        c.hp = Math.max(0, Math.min(c.hp, derived.salud));
        return html`
            <div class="editor-header">
                <input id="name" class="name-input" type="text" value="${c.name}" />
            </div>
            <div class="tabs">
                <button class="tab ${state.tab === 'sheet' ? 'active' : ''}" data-tab="sheet">Hoja</button>
                <button class="tab ${state.tab === 'cards' ? 'active' : ''}" data-tab="cards">Cartas</button>

                <button class="tab ${state.tab === 'bio' ? 'active' : ''}" data-tab="bio">Bio</button>
                <button class="tab ${state.tab === 'notes' ? 'active' : ''}" data-tab="notes">Notas</button>
                <button class="tab ${state.tab === 'config' ? 'active' : ''}" data-tab="config">Configuración</button>
            </div>
            ${state.tab === 'sheet'
                ? html`
                      <div class="editor-grid">
                          <div class="panel">
                              <label>Atributos</label>
                              <div class="attrs">
                                  ${Object.entries(c.attributes)
                                      .map(
                                          ([k, v]) =>
                                              html`<div class="attr">
                                                  <span>${k}</span>
                                                  <input
                                                      type="number"
                                                      min="${RULES.attributeMin}"
                                                      max="${RULES.attributeMax}"
                                                      step="1"
                                                      data-attr="${k}"
                                                      value="${v}"
                                                  />
                                                  <button class="button" data-roll-attr="${k}" title="Tirar">🎲</button>
                                              </div>`
                                      )
                                      .join('')}
                              </div>
                          </div>
                          <div class="panel">
                              <label>Derivados</label>
                              <div class="attrs attrs-deriv">
                                  <div class="attr">
                                      <span>Salud</span>
                                      <div class="hp-wrap">
                                          <input type="number" id="hp" min="0" step="1" value="${c.hp}" /> /
                                          <strong>${derived.salud}</strong>
                                      </div>
                                  </div>
                                  <div class="attr">
                                      <span>Salud temporal</span
                                      ><input type="number" id="temp-hp" min="0" step="1" value="${c.tempHp || 0}" />
                                  </div>
                                  <div class="attr"><span>Velocidad</span><strong>${derived.velocidad}</strong></div>
                                  <div class="attr"><span>Esquiva</span><strong>${derived.esquiva}</strong></div>
                                  <div class="attr"><span>Mitigación</span><strong>${derived.mitigacion}</strong></div>
                                  <div class="nd-spells">
                                      <div class="attr" style="grid-column:1 / -1; padding-top:.25rem;">
                                          <strong>ND de Conjuro</strong>
                                      </div>
                                      <div class="attr child">
                                          <span>ND (Mente)</span><strong>${derived.ndMente}</strong>
                                      </div>
                                      <div class="attr child">
                                          <span>ND (Instinto)</span><strong>${derived.ndInstinto}</strong>
                                      </div>
                                  </div>
                              </div>
                          </div>
                          <div class="panel">
                              <label>Progreso</label>
                              <div class="attrs">
                                  <div class="attr">
                                      <span>PP</span
                                      ><input type="number" id="pp" min="0" step="1" value="${c.pp || 0}" />
                                  </div>
                                  <div class="attr">
                                      <span>Suerte</span>
                                      <div class="hp-wrap">
                                          <input
                                              type="number"
                                              id="suerte"
                                              data-max="${derived.suerteMax}"
                                              min="0"
                                              step="1"
                                              value="${c.suerte || 0}"
                                          />
                                          / <strong>${derived.suerteMax}</strong>
                                      </div>
                                  </div>
                              </div>
                          </div>
                          <div class="panel">
                              <label>Economía</label>
                              <div class="attrs">
                                  <div class="attr">
                                      <span>Oro</span
                                      ><input
                                          class="long-input"
                                          type="number"
                                          id="gold"
                                          min="0"
                                          step="1"
                                          value="${c.gold || 0}"
                                      />
                                  </div>
                              </div>
                          </div>
                          <div class="panel">
                              <label>Equipo</label>
                              <div class="equip-list">
                                  ${(c.equipmentList || [])
                                      .map(
                                          (it, idx) => html` <div class="equip-row" data-eq-idx="${idx}">
                                              <input
                                                  type="number"
                                                  min="0"
                                                  step="1"
                                                  data-eq-qty
                                                  value="${Number(it.qty) || 0}"
                                              />
                                              <input
                                                  type="text"
                                                  data-eq-name
                                                  placeholder="Nombre"
                                                  value="${it.name || ''}"
                                              />
                                              <input
                                                  type="text"
                                                  data-eq-notes
                                                  placeholder="Notas"
                                                  value="${it.notes || ''}"
                                              />
                                              <button class="button" data-eq-remove title="Eliminar">🗑️</button>
                                          </div>`
                                      )
                                      .join('')}
                                  <div style="display:flex; justify-content:flex-end;">
                                      <button class="button" data-eq-add>Añadir ítem</button>
                                  </div>
                              </div>
                          </div>
                      </div>
                  `
                : state.tab === 'cards'
                ? html`
                      <div class="editor-grid one-col">
                          <div class="panel">
                              <label>Ranuras activas</label>
                              <input type="number" id="active-slots" min="0" step="1" value="${c.activeSlots || 0}" />
                          </div>

                          <div class="panel">
                              <label>Activas (${(c.activeCards || []).length}/${c.activeSlots || 0})</label>
                              <div class="cards-grid">
                                  ${(c.activeCards || [])
                                      .map((id) => state.allCards.find((x) => x.id === id))
                                      .filter(Boolean)
                                      .sort(
                                          (a, b) =>
                                              Number(a.level) - Number(b.level) ||
                                              String(a.name).localeCompare(String(b.name))
                                      )
                                      .map(
                                          (card) =>
                                              html`<div
                                                  class="card-slot"
                                                  data-id="${card.id}"
                                                  data-actions="deactivate"
                                              ></div>`
                                      )
                                      .join('')}
                              </div>
                          </div>
                          <div class="panel">
                              <div class="panel-header">
                                  <label style="margin:0;">Tu colección (${c.cards.length})</label>
                              </div>
                              <div class="cards-grid">
                                  ${c.cards
                                      .map((id) => state.allCards.find((x) => x.id === id))
                                      .filter(Boolean)
                                      .sort(
                                          (a, b) =>
                                              Number(a.level) - Number(b.level) ||
                                              String(a.name).localeCompare(String(b.name))
                                      )
                                      .map(
                                          (card) =>
                                              html`<div
                                                  class="card-slot"
                                                  data-id="${card.id}"
                                                  data-actions="toggle"
                                              ></div>`
                                      )
                                      .join('')}
                              </div>
                          </div>
                          <div class="panel">
                              <div class="panel-header">
                                  <label style="margin:0;">Añadir a tu colección</label>
                                  <button class="button" id="toggle-add-filters">
                                      ${state.filtersOpenAdd ? 'Ocultar filtros' : 'Mostrar filtros'}
                                  </button>
                              </div>
                              <div class="filters-collapsible ${state.filtersOpenAdd ? '' : 'closed'}">
                                  <div class="cards-search">
                                      <input
                                          id="card-search"
                                          type="text"
                                          placeholder="Buscar carta..."
                                          value="${state.cardSearch || ''}"
                                      />
                                  </div>
                                  <label
                                      class="inline-filter"
                                      style="display:inline-flex; align-items:center; gap:.35rem; font-weight: normal; margin-bottom:.5rem;"
                                  >
                                      <input
                                          type="checkbox"
                                          id="add-eligible-only"
                                          ${state.addOnlyEligible ? 'checked' : ''}
                                      />
                                      Solo elegibles
                                  </label>
                                  <div class="cards-filters">
                                      <div class="filter-group">
                                          <strong>Nivel</strong>
                                          <div class="options">
                                              ${(state.facets.levels || [])
                                                  .map(
                                                      (l) =>
                                                          html`<label
                                                              ><input
                                                                  type="checkbox"
                                                                  data-filter-level
                                                                  value="${l}"
                                                                  ${state.cardFilters.levels.includes(l)
                                                                      ? 'checked'
                                                                      : ''}
                                                              />
                                                              ${l}</label
                                                          >`
                                                  )
                                                  .join('')}
                                          </div>
                                      </div>
                                      <div class="filter-group">
                                          <strong>Tipo</strong>
                                          <div class="options">
                                              ${(state.facets.types || [])
                                                  .map(
                                                      (t) =>
                                                          html`<label
                                                              ><input
                                                                  type="checkbox"
                                                                  data-filter-type
                                                                  value="${t}"
                                                                  ${state.cardFilters.types.includes(t)
                                                                      ? 'checked'
                                                                      : ''}
                                                              />
                                                              ${t}</label
                                                          >`
                                                  )
                                                  .join('')}
                                          </div>
                                      </div>
                                      <div class="filter-group">
                                          <strong>Atributo</strong>
                                          <div class="options">
                                              ${(state.facets.attributes || [])
                                                  .map(
                                                      (a) =>
                                                          html`<label
                                                              ><input
                                                                  type="checkbox"
                                                                  data-filter-attr
                                                                  value="${a}"
                                                                  ${state.cardFilters.attributes.includes(a)
                                                                      ? 'checked'
                                                                      : ''}
                                                              />
                                                              ${a}</label
                                                          >`
                                                  )
                                                  .join('')}
                                          </div>
                                      </div>
                                      <div class="filter-group">
                                          <strong>Etiquetas</strong>
                                          <div class="options">
                                              ${(state.facets.tags || [])
                                                  .map(
                                                      (t) =>
                                                          html`<label
                                                              ><input
                                                                  type="checkbox"
                                                                  data-filter-tag
                                                                  value="${t}"
                                                                  ${state.cardFilters.tags.includes(t) ? 'checked' : ''}
                                                              />
                                                              ${t}</label
                                                          >`
                                                  )
                                                  .join('')}
                                          </div>
                                      </div>
                                      <div style="grid-column: 1 / -1; display:flex; justify-content:flex-end;">
                                          <button class="button" id="cards-clear-filters">Limpiar</button>
                                      </div>
                                  </div>
                              </div>
                              <div class="cards-grid">
                                  ${CardService.filter(availableCards, {
                                      text: state.cardSearch,
                                      levels: state.cardFilters.levels,
                                      types: state.cardFilters.types,
                                      attributes: state.cardFilters.attributes,
                                      tags: state.cardFilters.tags,
                                  })
                                      .filter((card) => !state.addOnlyEligible || meetsRequirements(c, card))
                                      .filter((x) => !c.cards.includes(x.id))
                                      .sort(
                                          (a, b) =>
                                              Number(a.level) - Number(b.level) ||
                                              String(a.name).localeCompare(String(b.name))
                                      )
                                      .slice(0, 12)
                                      .map(
                                          (card) =>
                                              html`<div
                                                  class="card-slot"
                                                  data-id="${card.id}"
                                                  data-actions="add"
                                              ></div>`
                                      )
                                      .join('')}
                              </div>
                          </div>
                      </div>
                  `
                : state.tab === 'config'
                ? html`
                      <div class="editor-grid one-col">
                          <div class="panel">
                              <label>Retrato</label>
                              <div class="attrs">
                                  <div class="attr">
                                      <span>URL</span>
                                      <input
                                          type="text"
                                          id="portrait-url"
                                          class="portrait-url-input"
                                          value="${c.portraitUrl || ''}"
                                      />
                                  </div>
                              </div>
                          </div>
                          <div class="panel">
                              <label>Listado de modificadores</label>
                              <div class="mods">
                                  ${(c.modifiers || [])
                                      .map(
                                          (m, idx) => html`
                                              <div class="mod-row" data-idx="${idx}">
                                                  <select data-mod-field>
                                                      ${allowedFields
                                                          .map(
                                                              (f) =>
                                                                  html`<option
                                                                      value="${f}"
                                                                      ${m.field === f ? 'selected' : ''}
                                                                  >
                                                                      ${f}
                                                                  </option>`
                                                          )
                                                          .join('')}
                                                  </select>
                                                  <select data-mod-mode>
                                                      <option value="add" ${m.mode !== 'set' ? 'selected' : ''}>
                                                          +
                                                      </option>
                                                      <option value="set" ${m.mode === 'set' ? 'selected' : ''}>
                                                          =
                                                      </option>
                                                  </select>
                                                  <input
                                                      type="text"
                                                      data-mod-expr
                                                      placeholder="expresion (e.g., 2, cuerpo*2)"
                                                      value="${m.expr || ''}"
                                                  />
                                                  <input
                                                      type="text"
                                                      data-mod-label
                                                      placeholder="Etiqueta (opcional)"
                                                      value="${m.label || ''}"
                                                  />
                                                  <button class="button" data-mod-remove>Eliminar</button>
                                              </div>
                                          `
                                      )
                                      .join('')}
                                  <div>
                                      <button class="button" data-mod-add>Agregar modificador</button>
                                  </div>
                              </div>
                          </div>
                          <div class="panel">
                              <label>Resumen</label>
                              <div class="attrs">
                                  <div class="attr"><span>Salud</span><strong>${derived.salud}</strong></div>
                                  <div class="attr"><span>Velocidad</span><strong>${derived.velocidad}</strong></div>
                                  <div class="attr"><span>Esquiva</span><strong>${derived.esquiva}</strong></div>
                                  <div class="attr"><span>Mitigación</span><strong>${derived.mitigacion}</strong></div>
                                  <div class="attr"><span>ND (Mente)</span><strong>${derived.ndMente}</strong></div>
                                  <div class="attr">
                                      <span>ND (Instinto)</span><strong>${derived.ndInstinto}</strong>
                                  </div>
                                  <div class="attr"><span>Suerte máx.</span><strong>${derived.suerteMax}</strong></div>
                              </div>
                              <small
                                  >Variables disponibles: cuerpo, agilidad, mente, instinto, presencia, salud,
                                  velocidad, esquiva, mitigacion, ndMente, ndInstinto, suerteMax, pp, gold.</small
                              >
                          </div>
                      </div>
                  `
                : state.tab === 'bio'
                ? html`
                      <div class="editor-grid one-col">
                          <div class="panel">
                              <label>Retrato</label>
                              <div class="portrait-wrap">
                                  ${c.portraitUrl
                                      ? html`<img
                                            class="portrait-img"
                                            src="${c.portraitUrl}"
                                            alt="Retrato de ${c.name}"
                                            referrerpolicy="no-referrer"
                                            onerror="(function(img){img.style.display='none';var p=img.parentElement;var d=document.createElement('div');d.className='portrait-placeholder';d.textContent='Sin retrato';p.appendChild(d);})(this)"
                                        />`
                                      : html`<div class="portrait-placeholder">Sin retrato</div>`}
                              </div>
                          </div>
                          <div class="panel">
                              <label>Historia</label>
                              <textarea id="bio-text" rows="10">${c.bio || ''}</textarea>
                          </div>
                      </div>
                  `
                : html`
                      <div class="editor-grid one-col">
                          <div class="panel">
                              <label>Notas</label>
                              <textarea id="notes" rows="10">${c.notes || ''}</textarea>
                          </div>
                      </div>
                  `}
        `;
    };

    const bindEvents = (root) => {
        root.querySelector('[data-action="create"]').addEventListener('click', () => {
            const c = defaultCharacter();
            state.list.push(c);
            state.selectedId = c.id;
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
                        save();
                        update();
                    }
                } catch (_) {}
                e.target.value = '';
            });
        root.querySelectorAll('.items .item').forEach((btn) =>
            btn.addEventListener('click', () => {
                state.selectedId = btn.getAttribute('data-id');
                update();
            })
        );

        const editor = root.querySelector('.characters-editor');
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
        const tempHp = editor.querySelector('#temp-hp');
        const portraitUrl = editor.querySelector('#portrait-url');
        const bioText = editor.querySelector('#bio-text');

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
        if (pp)
            pp.addEventListener('change', (e) => {
                c.pp = Math.max(0, Number(e.target.value) || 0);
                save();
            });
        if (suerte)
            suerte.addEventListener('change', (e) => {
                const max = Number(e.target.getAttribute('data-max')) || Infinity;
                c.suerte = Math.max(0, Math.min(Number(e.target.value) || 0, max));
                save();
                update();
            });
        if (hp)
            hp.addEventListener('change', (e) => {
                c.hp = Math.max(0, Number(e.target.value) || 0);
                save();
                update();
            });
        if (tempHp)
            tempHp.addEventListener('change', (e) => {
                c.tempHp = Math.max(0, Number(e.target.value) || 0);
                save();
            });
        if (gold)
            gold.addEventListener('change', (e) => {
                c.gold = Math.max(0, Number(e.target.value) || 0);
                save();
            });
        // Equipment list events
        const eqAdd = editor.querySelector('[data-eq-add]');
        if (eqAdd)
            eqAdd.addEventListener('click', () => {
                c.equipmentList = Array.isArray(c.equipmentList) ? c.equipmentList : [];
                c.equipmentList.push({ qty: 1, name: '', notes: '' });
                save();
                update();
            });
        editor.querySelectorAll('.equip-row').forEach((row) => {
            const idx = Number(row.getAttribute('data-eq-idx'));
            const qty = row.querySelector('[data-eq-qty]');
            const name = row.querySelector('[data-eq-name]');
            const notes = row.querySelector('[data-eq-notes]');
            const remove = row.querySelector('[data-eq-remove]');
            if (qty)
                qty.addEventListener('change', (e) => {
                    const v = Math.max(0, Number(e.target.value) || 0);
                    if (c.equipmentList[idx]) c.equipmentList[idx].qty = v;
                    save();
                });
            if (name)
                name.addEventListener('input', (e) => {
                    if (c.equipmentList[idx]) c.equipmentList[idx].name = e.target.value;
                    save();
                });
            if (notes)
                notes.addEventListener('input', (e) => {
                    if (c.equipmentList[idx]) c.equipmentList[idx].notes = e.target.value;
                    save();
                });
            if (remove)
                remove.addEventListener('click', () => {
                    const item = c.equipmentList[idx];
                    const label = item && item.name ? `"${item.name}"` : 'este ítem';
                    const ok = window.confirm(`¿Eliminar ${label}?`);
                    if (!ok) return;
                    c.equipmentList.splice(idx, 1);
                    save();
                    update();
                });
        });
        if (cardSearch)
            cardSearch.addEventListener('input', (e) => {
                state.cardSearch = e.target.value;
                update();
            });
        // Cards tab filters
        const levelChecks = editor.querySelectorAll('input[data-filter-level]');
        const typeChecks = editor.querySelectorAll('input[data-filter-type]');
        const attrChecks = editor.querySelectorAll('input[data-filter-attr]');
        const tagChecks = editor.querySelectorAll('input[data-filter-tag]');
        const clearFilters = editor.querySelector('#cards-clear-filters');
        const toggleAddFilters = editor.querySelector('#toggle-add-filters');
        if (toggleAddFilters)
            toggleAddFilters.addEventListener('click', () => {
                state.filtersOpenAdd = !state.filtersOpenAdd;
                update();
            });
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
        attrChecks.forEach((ch) =>
            ch.addEventListener('change', (e) => {
                const v = e.target.value;
                if (e.target.checked && !state.cardFilters.attributes.includes(v)) state.cardFilters.attributes.push(v);
                if (!e.target.checked)
                    state.cardFilters.attributes = state.cardFilters.attributes.filter((x) => x !== v);
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
                            save();
                            update();
                        }
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
                const canActivate = !(typeLower === 'efecto' || typeLower === 'de efecto');
                if (mode === 'toggle') {
                    const active = (getSelected().activeCards || []).includes(c.id);
                    const removeBtn = `<button class="button" data-remove="${c.id}">Quitar</button>`;
                    const toggleBtn = canActivate
                        ? `<button class="button" data-toggle-active="${c.id}">${
                              active ? 'Desactivar' : 'Activar'
                          }</button>`
                        : `<span class="muted">No activable</span>`;

                    return `<div class="card-buttons">${removeBtn} ${toggleBtn}</div>`;
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

        // Modifiers events
        const addMod = editor.querySelector('[data-mod-add]');
        if (addMod)
            addMod.addEventListener('click', () => {
                c.modifiers.push({ field: 'salud', mode: 'add', expr: '0', label: '' });
                save();
                update();
            });
        editor.querySelectorAll('.mod-row').forEach((row) => {
            const idx = Number(row.getAttribute('data-idx'));
            const m = c.modifiers[idx];
            if (!m) return;
            const fieldSel = row.querySelector('[data-mod-field]');
            const modeSel = row.querySelector('[data-mod-mode]');
            const exprInp = row.querySelector('[data-mod-expr]');
            const labelInp = row.querySelector('[data-mod-label]');
            const rmBtn = row.querySelector('[data-mod-remove]');
            if (fieldSel)
                fieldSel.addEventListener('change', (e) => {
                    m.field = e.target.value;
                    save();
                });
            if (modeSel)
                modeSel.addEventListener('change', (e) => {
                    m.mode = e.target.value;
                    save();
                });
            if (exprInp)
                exprInp.addEventListener('input', (e) => {
                    m.expr = e.target.value;
                    save();
                });
            if (labelInp)
                labelInp.addEventListener('input', (e) => {
                    m.label = e.target.value;
                    save();
                });
            if (rmBtn)
                rmBtn.addEventListener('click', () => {
                    c.modifiers.splice(idx, 1);
                    save();
                    update();
                });
        });
    };

    let layoutInstance = null;
    const update = () => {
        if (!layoutInstance) {
            container.innerHTML = '<div id="layout"></div>';
            const layoutRoot = container.querySelector('#layout');
            layoutInstance = LayoutWithSidebar(layoutRoot, { title: 'Mis personajes' });
            layoutInstance.init();
        }
        const mainEl = layoutInstance.getMainEl();
        mainEl.innerHTML = renderInner();
        bindEvents(mainEl);
    };

    const init = async () => {
        loadStyles();
        try {
            state.allCards = await CardService.loadAll();
            state.facets = CardService.getFacets(state.allCards);
        } catch (_) {}
        if (!state.selectedId && state.list[0]) state.selectedId = state.list[0].id;
        update();
    };

    return { init };
};

export default CharactersPage;
