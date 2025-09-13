const html = window.html || String.raw;

import StorageUtils from '../../utils/storage-utils.js';
import LayoutWithSidebar from '../../components/LayoutWithSidebar/LayoutWithSidebar.js';
import { RULES, computeDerivedStats, applyModifiersToDerived } from '../../models/rules.js';
import CardComponent from '../../components/CardComponent/CardComponent.js';
import CardService from '../../services/card-service.js';
import { openRollModal } from '../CharactersPage/RollModal.js';
import { ensureStyles } from '../../utils/style-utils.js';

const STORAGE_KEY = 'arcana:characters';
const EXAMPLES_CONFIG = 'config/example-characters.json';

const CharactersExamplesPage = (container) => {
    let state = {
        list: [],
        selectedIdx: 0,
        allCards: [],
        tab: 'sheet',
    };

    const loadStyles = () => {
        ensureStyles([
            './src/pages/CharactersPage/CharactersPage.css',
            './src/components/CardComponent/CardComponent.css',
        ]);
    };

    const getSelected = () => state.list[state.selectedIdx] || null;

    const render = () => html`<div id="layout"></div>`;

    const renderEditor = () => {
        const c = getSelected();
        if (!c) return html`<div class="empty-state">No hay personajes de ejemplo</div>`;
        // Normalize minimal fields to avoid errors
        const attrs = { Cuerpo: 1, Reflejos: 1, Mente: 1, Instinto: 1, Presencia: 1, ...(c.attributes || {}) };
        const derivedBase = computeDerivedStats(attrs);
        const ndBase = {
            ndMente: RULES.ndBase + (Number(attrs.Mente) || 0),
            ndInstinto: RULES.ndBase + (Number(attrs.Instinto) || 0),
        };
        const luckBase = { suerteMax: RULES.maxLuck };
        const derived = applyModifiersToDerived(
            { ...derivedBase, ...ndBase, ...luckBase, mitigacion: Number(c.mitigacion) || 0 },
            c
        );
        const cards = Array.isArray(c.cards) ? c.cards : [];
        const activeCards = Array.isArray(c.activeCards) ? c.activeCards : [];
        const activeSlots = typeof c.activeSlots === 'number' ? c.activeSlots : RULES.startingActiveCards;
        return html`
            <div class="editor-header">
                <input id="name" class="name-input" type="text" value="${c.name || 'Personaje'}" disabled />
            </div>
            <div class="tabs">
                <button class="tab ${state.tab === 'sheet' ? 'active' : ''}" data-tab="sheet">Hoja</button>
                <button class="tab ${state.tab === 'cards' ? 'active' : ''}" data-tab="cards">Cartas</button>
                <button class="tab ${state.tab === 'bio' ? 'active' : ''}" data-tab="bio">Bio</button>
            </div>
            ${state.tab === 'sheet'
                ? html`
                      <div class="editor-grid">
                          <div class="panel">
                              <label>Atributos</label>
                              <div class="attrs">
                                  ${Object.entries(attrs)
                                      .map(
                                          ([k, v]) =>
                                              html`<div class="attr">
                                                  <span>${k}</span>
                                                  <input
                                                      type="number"
                                                      min="${RULES.attributeMin}"
                                                      max="${RULES.attributeMax}"
                                                      step="1"
                                                      value="${v}"
                                                      disabled
                                                  />
                                                  <button class="button" data-roll-attr="${k}">🎲</button>
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
                                          <input
                                              type="number"
                                              id="hp"
                                              min="0"
                                              step="1"
                                              value="${Number(c.hp) || derived.salud}"
                                              disabled
                                          />
                                          / <strong>${derived.salud}</strong>
                                      </div>
                                  </div>
                                  <div class="attr">
                                      <span>Salud temporal</span
                                      ><input
                                          type="number"
                                          min="0"
                                          step="1"
                                          value="${Number(c.tempHp) || 0}"
                                          disabled
                                      />
                                  </div>
                                  <div class="attr"><span>Velocidad</span><strong>${derived.velocidad}</strong></div>
                                  <div class="attr"><span>Esquiva</span><strong>${derived.esquiva}</strong></div>
                                  <div class="attr"><span>Mitigación</span><strong>${derived.mitigacion}</strong></div>
                                  <div class="attr" style="grid-column:1 / -1; padding-top:.25rem;">
                                      <strong>ND de Conjuro</strong>
                                  </div>
                                  <div class="attr"><span>ND (Mente)</span><strong>${derived.ndMente}</strong></div>
                                  <div class="attr">
                                      <span>ND (Instinto)</span><strong>${derived.ndInstinto}</strong>
                                  </div>
                              </div>
                          </div>
                          <div class="panel">
                              <label>Progreso</label>
                              <div class="attrs">
                                  <div class="attr"><span>PP</span><strong>${Number(c.pp) || 0}</strong></div>
                                  <div class="attr">
                                      <span>Suerte</span>
                                      <div class="hp-wrap">
                                          <input
                                              type="number"
                                              min="0"
                                              step="1"
                                              value="${Number(c.suerte) || 0}"
                                              disabled
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
                                      ><input type="number" min="0" step="1" value="${Number(c.gold) || 0}" disabled />
                                  </div>
                              </div>
                          </div>
                          <div class="panel">
                              <label>Lenguas</label>
                              <div class="bio-content">${String(c.languages || '')}</div>
                          </div>
                          <div class="panel">
                              <label>Equipo</label>
                              <div class="equip-list readonly">
                                  ${Array.isArray(c.equipmentList) && c.equipmentList.length
                                      ? c.equipmentList
                                            .map(
                                                (it) => html`<div class="equip-row readonly">
                                                    <span class="qty">${Number(it.qty) || 0}×</span>
                                                    <span class="name">${String(it.name || '')}</span>
                                                    <span class="notes">${String(it.notes || '')}</span>
                                                </div>`
                                            )
                                            .join('')
                                      : html`<div class="muted">Sin equipo</div>`}
                              </div>
                          </div>
                      </div>
                  `
                : state.tab === 'cards'
                ? html`
                      <div class="editor-grid one-col">
                          <div class="panel">
                              <label>Activas (${activeCards.length}/${activeSlots})</label>
                              <div class="cards-grid">
                                  ${activeCards
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
                                                  data-actions="view"
                                              ></div>`
                                      )
                                      .join('')}
                              </div>
                          </div>
                          <div class="panel">
                              <div class="panel-header">
                                  <label style="margin:0;">Tu colección (${cards.length})</label>
                              </div>
                              <div class="cards-grid">
                                  ${cards
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
                                                  data-actions="view"
                                              ></div>`
                                      )
                                      .join('')}
                              </div>
                          </div>
                      </div>
                  `
                : html`
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
                              <div class="bio-content">${String(c.bio || '')}</div>
                          </div>
                      </div>
                  `}
        `;
    };

    const bindEvents = () => {
        const layoutRoot = container.querySelector('#layout');
        const layout = LayoutWithSidebar(layoutRoot, { title: 'Personajes de ejemplo' });
        layout.init();
        layout.setMainHtml(html`
            <div class="characters">
                <aside class="characters-list">
                    <div class="list-header">
                        <button class="button" data-action="add-selected">Añadir a mis personajes</button>
                    </div>
                    <ul class="items">
                        ${state.list
                            .map((p, i) => {
                                const initial = (p.name || '?').trim().charAt(0).toUpperCase();
                                return html`<li>
                                    <button class="item ${state.selectedIdx === i ? 'active' : ''}" data-idx="${i}">
                                        <span class="avatar ${p.portraitUrl ? '' : 'placeholder'}" aria-hidden="true">
                                            ${p.portraitUrl
                                                ? `<img src="${p.portraitUrl}" alt="" referrerpolicy="no-referrer" onerror="this.style.display='none'; this.parentElement.classList.add('placeholder');" />`
                                                : ''}
                                            <span class="initial">${initial}</span>
                                        </span>
                                        <span class="item-name">${p.name || 'Personaje'}</span>
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
        `);
        const mainRoot = layout.getMainEl();

        // List selection
        mainRoot.querySelectorAll('.items .item').forEach((btn) =>
            btn.addEventListener('click', () => {
                state.selectedIdx = Number(btn.getAttribute('data-idx')) || 0;
                update();
            })
        );

        // Tabs
        mainRoot.querySelectorAll('.tab').forEach((t) =>
            t.addEventListener('click', () => {
                state.tab = t.getAttribute('data-tab');
                update();
            })
        );

        // Attribute roll buttons (read-only data, but allow rolling and consuming luck)
        mainRoot.querySelectorAll('[data-roll-attr]').forEach((btn) =>
            btn.addEventListener('click', () => {
                const c = getSelected();
                if (!c) return;
                const key = btn.getAttribute('data-roll-attr');
                const val = Number((c.attributes || {})[key]) || 0;
                const base = computeDerivedStats(c.attributes || {});
                const ndBase = {
                    ndMente: 5 + (Number((c.attributes || {}).Mente) || 0),
                    ndInstinto: 5 + (Number((c.attributes || {}).Instinto) || 0),
                };
                const luckBase = { suerteMax: 5 };
                const derivedNow = applyModifiersToDerived(
                    { ...base, ...ndBase, ...luckBase, mitigacion: Number(c.mitigacion) || 0 },
                    c
                );
                openRollModal(
                    document.body,
                    { attributeName: key, attributeValue: val, maxSuerte: Number(derivedNow.suerteMax) || 0 },
                    (res) => {
                        if (res && res.luck) {
                            c.suerte = Math.max(0, (Number(c.suerte) || 0) - res.luck);
                            update();
                        }
                    }
                );
            })
        );

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

        // Mount visual cards using CardComponent, read-only (no actions)
        mainRoot.querySelectorAll('.card-slot').forEach((slot) => {
            const id = slot.getAttribute('data-id');
            const card = state.allCards.find((x) => x.id === id);
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
            state.list = Array.isArray(json) ? json : json ? [json] : [];
        } catch (_) {
            state.list = [];
        }
        try {
            state.allCards = await CardService.loadAll();
        } catch (_) {
            state.allCards = [];
        }
        update();
    };

    return { init };
};

export default CharactersExamplesPage;
