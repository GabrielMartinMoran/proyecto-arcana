const html = window.html || String.raw;
import PanelHeader from '../../PanelHeader/PanelHeader.js';

export function renderCardsTab(c, state, CardService, meetsRequirements, opts = {}) {
    const readOnly = !!opts.readOnly;
    const availableCards = state.allCards;
    return html`
        <div class="editor-grid one-col">
            <div class="panel">
                ${PanelHeader({ title: 'Ranuras activas' })}
                <input type="number" id="active-slots" min="0" step="1" value="${c.activeSlots || 0}" ${
                    readOnly ? 'disabled' : ''
                } />
            </div>

            <div class="panel">
                ${PanelHeader({ title: `Activas (${(c.activeCards || []).length}/${c.activeSlots || 0})` })}
                ${(() => {
                    const actives = (c.activeCards || [])
                        .map((id) => state.allCards.find((x) => x.id === id))
                        .filter(Boolean);
                    return html`<div class="cards-grid">
                        ${actives
                            .map((card) => {
                                const cd = card.reload && typeof card.reload === 'object' ? card.reload : null;
                                const qty = Number(cd?.qty);
                                const showUses = !!cd && (cd.type != null || (Number.isFinite(qty) && qty > 0));
                                return html`<div class="card-slot" data-id="${card.id}" data-actions="deactivate" data-uses="${
                                    showUses ? '1' : '0'
                                }"></div>`;
                            })
                            .join('')}
                    </div>`;
                })()}
            </div>
            <div class="panel">
                ${PanelHeader({ title: `Tu colección (${c.cards.length})` })}
                ${(() => {
                    const owned = c.cards.map((id) => state.allCards.find((x) => x.id === id)).filter(Boolean);
                    return html`<div class="cards-grid">
                        ${owned
                            .sort((a, b) => Number(a.level) - Number(b.level) || String(a.name).localeCompare(String(b.name)))
                            .map((card) => html`<div class="card-slot" data-id="${card.id}" data-actions="toggle"></div>`)
                            .join('')}
                    </div>`;
                })()}
            </div>
            ${readOnly
                ? ''
                : html`<div class="panel">
                ${PanelHeader({ title: 'Añadir a tu colección', actionsHtml: `<button class=\"button\" id=\"toggle-add-filters\">${
                    state.filtersOpenAdd ? 'Ocultar filtros' : 'Mostrar filtros'
                }</button>` })}
                <div class="filters-collapsible ${state.filtersOpenAdd ? '' : 'closed'}">
                    <div class="cards-search">
                        <input id="card-search" type="text" placeholder="Buscar carta..." value="${
                            state.cardSearch || ''
                        }" />
                    </div>
                    <label class="inline-filter" style="display:inline-flex; align-items:center; gap:.35rem; font-weight: normal; margin-bottom:.5rem;">
                        <input type="checkbox" id="add-eligible-only" ${state.addOnlyEligible ? 'checked' : ''} />
                        Solo elegibles
                    </label>
                    <div class="cards-filters">
                        <div class="filter-group">
                            <strong>Nivel</strong>
                            <div class="options">
                                ${(state.facets.levels || [])
                                    .map(
                                        (l) =>
                                            html`<label><input type="checkbox" data-filter-level value="${l}" ${
                                                state.cardFilters.levels.includes(l) ? 'checked' : ''
                                            } /> ${l}</label>`
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
                                            html`<label><input type="checkbox" data-filter-type value="${t}" ${
                                                state.cardFilters.types.includes(t) ? 'checked' : ''
                                            } /> ${t}</label>`
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
                                            html`<label><input type="checkbox" data-filter-tag value="${t}" ${
                                                state.cardFilters.tags.includes(t) ? 'checked' : ''
                                            } /> ${t}</label>`
                                    )
                                    .join('')}
                            </div>
                        </div>
                        <div style="grid-column: 1 / -1; display:flex; justify-content:flex-end;">
                            <button class="button" id="cards-clear-filters">Limpiar</button>
                        </div>
                    </div>
                </div>
                ${(() => {
                    const candidates = CardService.filter(availableCards, {
                        text: state.cardSearch,
                        levels: state.cardFilters.levels,
                        types: state.cardFilters.types,
                        attributes: state.cardFilters.attributes,
                        tags: state.cardFilters.tags,
                    })
                        .filter((card) => !state.addOnlyEligible || meetsRequirements(c, card))
                        .filter((x) => !c.cards.includes(x.id))
                        .sort((a, b) => Number(a.level) - Number(b.level) || String(a.name).localeCompare(String(b.name)))
                        .slice(0, 12);
                    return html`<div class="cards-grid">
                        ${candidates.map((card) => html`<div class="card-slot" data-id="${card.id}" data-actions="add"></div>`).join('')}
                    </div>`;
                })()}
            </div>`}
        </div>
    `;
}



