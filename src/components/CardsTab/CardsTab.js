const html = window.html || String.raw;
import PanelHeader from '../PanelHeader/PanelHeader.js';
import { ensureStyle } from '../../utils/style-utils.js';
import { renderCardGrid } from '../CardGrid/CardGrid.js';
import CardComponent from '../CardComponent/CardComponent.js';

/**
 * CardsTab - Component for character cards management
 * @param {HTMLElement} container
 * @param {{ character: Object, state: Object, cardService: Object, meetsRequirements: Function, readOnly: boolean, onUpdate: Function }} props
 */
const CardsTab = (container, props = {}) => {
    let state = {
        character: props.character || {},
        state: props.state || {},
        cardService: props.cardService || {},
        meetsRequirements: typeof props.meetsRequirements === 'function' ? props.meetsRequirements : () => true,
        readOnly: !!props.readOnly,
        onUpdate: typeof props.onUpdate === 'function' ? props.onUpdate : () => {},
        onStateUpdate: typeof props.onStateUpdate === 'function' ? props.onStateUpdate : () => {},
        // Local state for UI that doesn't need to persist
        localState: {
            filtersOpenAdd: false, // Always start closed
        },
    };

    const render = () => {
        const c = state.character;
        const readOnly = state.readOnly;
        const availableCards = state.state.allCards || [];

        // Ensure character has required arrays (only if they don't exist)
        if (!Array.isArray(c.cards)) c.cards = [];
        if (!Array.isArray(c.activeCards)) c.activeCards = [];
        if (typeof c.activeSlots !== 'number') c.activeSlots = 0;

        return html`
            <div class="editor-grid one-col">
                <div class="panel">
                    ${PanelHeader({ title: 'Ranuras activas' })}
                    <input
                        type="number"
                        id="active-slots"
                        min="0"
                        step="1"
                        value="${c.activeSlots || 0}"
                        ${readOnly ? 'disabled' : ''}
                    />
                </div>

                <div class="panel">
                    ${PanelHeader({ title: `Activas (${(c.activeCards || []).length}/${c.activeSlots || 0})` })}
                    ${(() => {
                        const actives = (c.activeCards || [])
                            .map((id) => availableCards.find((x) => x.id === id))
                            .filter(Boolean);
                        return renderCardGrid(actives, { mode: 'deactivate' });
                    })()}
                </div>
                <div class="panel">
                    ${PanelHeader({ title: `Tu colección (${c.cards.length})` })}
                    ${(() => {
                        const owned = c.cards
                            .map((id) => availableCards.find((x) => x.id === id))
                            .filter(Boolean)
                            .filter((card) => !(c.activeCards || []).includes(card.id)); // Excluir cartas activadas
                        return renderCardGrid(owned, { mode: 'toggle' });
                    })()}
                </div>
                ${readOnly
                    ? ''
                    : html`<div class="panel">
                          ${PanelHeader({
                              title: 'Añadir a tu colección',
                              actionsHtml: html`<button class="button" id="toggle-add-filters">
                                  ${state.localState.filtersOpenAdd ? 'Ocultar filtros' : 'Mostrar filtros'}
                              </button>`,
                          })}
                          <div
                              class="filters-collapsible ${state.localState.filtersOpenAdd ? '' : 'closed'}"
                              style="${state.localState.filtersOpenAdd
                                  ? ''
                                  : 'max-height: 0; opacity: 0; margin-top: 0; overflow: hidden;'}"
                          >
                              <div class="cards-search">
                                  <input
                                      id="card-search"
                                      type="text"
                                      placeholder="Buscar carta..."
                                      value="${state.state.cardSearch || ''}"
                                  />
                              </div>
                              <div class="cards-filters-grid" id="cards-filters-debug">
                                  <div class="cards-filter-group" id="filter-solo-elegibles">
                                      <label class="inline-filter">
                                          <input
                                              type="checkbox"
                                              id="add-eligible-only"
                                              ${state.state.addOnlyEligible ? 'checked' : ''}
                                          />
                                          Solo elegibles
                                      </label>
                                  </div>
                                  <div class="cards-filter-group" id="filter-nivel">
                                      <strong>Nivel</strong>
                                      <div class="options">
                                          ${(state.state.facets.levels || [])
                                              .map(
                                                  (l) =>
                                                      html`<label
                                                          ><input
                                                              type="checkbox"
                                                              data-filter-level
                                                              value="${l}"
                                                              ${state.state.cardFilters.levels.includes(l)
                                                                  ? 'checked'
                                                                  : ''}
                                                          />
                                                          ${l}</label
                                                      >`
                                              )
                                              .join('')}
                                      </div>
                                  </div>
                                  <div class="cards-filter-group" id="filter-tipo">
                                      <strong>Tipo</strong>
                                      <div class="options">
                                          ${(state.state.facets.types || [])
                                              .map(
                                                  (t) =>
                                                      html`<label
                                                          ><input
                                                              type="checkbox"
                                                              data-filter-type
                                                              value="${t}"
                                                              ${state.state.cardFilters.types.includes(t)
                                                                  ? 'checked'
                                                                  : ''}
                                                          />
                                                          ${t}</label
                                                      >`
                                              )
                                              .join('')}
                                      </div>
                                  </div>
                                  <div class="cards-filter-group" id="filter-etiquetas">
                                      <strong>Etiquetas</strong>
                                      <div class="options">
                                          ${(state.state.facets.tags || [])
                                              .map(
                                                  (t) =>
                                                      html`<label
                                                          ><input
                                                              type="checkbox"
                                                              data-filter-tag
                                                              value="${t}"
                                                              ${state.state.cardFilters.tags.includes(t)
                                                                  ? 'checked'
                                                                  : ''}
                                                          />
                                                          ${t}</label
                                                      >`
                                              )
                                              .join('')}
                                      </div>
                                  </div>
                              </div>
                              <div class="clear-filters-container">
                                  <button class="button" id="clear-button-debug">Limpiar</button>
                              </div>
                          </div>
                          ${(() => {
                              if (!state.cardService || !state.cardService.filter) {
                                  return html`<div class="no-cards">Servicio de cartas no disponible</div>`;
                              }

                              const candidates = state.cardService
                                  .filter(availableCards, {
                                      text: state.state.cardSearch,
                                      levels: state.state.cardFilters.levels,
                                      types: state.state.cardFilters.types,
                                      attributes: state.state.cardFilters.attributes,
                                      tags: state.state.cardFilters.tags,
                                  })
                                  .filter((card) => !state.state.addOnlyEligible || state.meetsRequirements(c, card))
                                  .filter((x) => !c.cards.includes(x.id))
                                  .sort(
                                      (a, b) =>
                                          Number(a.level) - Number(b.level) ||
                                          String(a.name).localeCompare(String(b.name))
                                  )
                                  .slice(0, 12);

                              if (candidates.length === 0) {
                                  return html`<div class="no-cards">
                                      No hay cartas disponibles con los filtros actuales
                                  </div>`;
                              }

                              return renderCardGrid(candidates, { mode: 'add', limit: 12 });
                          })()}
                      </div>`}
            </div>
        `;
    };

    const bindEvents = () => {
        if (!container) return;

        // Remove existing event listeners to prevent duplicates
        container.removeEventListener('click', handleClick);
        container.removeEventListener('input', handleInput);

        // Event delegation for all card-related interactions
        container.addEventListener('click', handleClick);
        container.addEventListener('input', handleInput);
    };

    const handleClick = (e) => {
        if (e.target.id === 'toggle-add-filters') {
            handleToggleFilters();
        } else if (e.target.id === 'clear-button-debug') {
            handleClearFilters();
        } else if (e.target.hasAttribute('data-action')) {
            // Handle button clicks directly
            const cardSlot = e.target.closest('.card-slot');
            if (cardSlot) {
                handleCardAction(cardSlot, e.target.getAttribute('data-action'));
            }
        }
        // Removed the general card-slot click handler to prevent accidental deactivation
    };

    const handleInput = (e) => {
        if (e.target.id === 'active-slots') {
            handleActiveSlotsChange(e.target.value);
        } else if (e.target.id === 'card-search') {
            handleSearchChange(e.target.value);
        } else if (e.target.id === 'add-eligible-only') {
            handleEligibleOnlyChange(e.target.checked);
        } else if (e.target.hasAttribute('data-filter-level')) {
            handleFilterChange('levels', e.target.value, e.target.checked);
        } else if (e.target.hasAttribute('data-filter-type')) {
            handleFilterChange('types', e.target.value, e.target.checked);
        } else if (e.target.hasAttribute('data-filter-tag')) {
            handleFilterChange('tags', e.target.value, e.target.checked);
        } else if (e.target.hasAttribute('data-card-use-left')) {
            handleCardUsesChange(e.target);
        }
    };

    const handleActiveSlotsChange = (value) => {
        const slots = Number(value) || 0;
        const updatedCharacter = {
            ...state.character,
            activeSlots: slots,
        };
        state.character = updatedCharacter;
        state.onUpdate(updatedCharacter);
    };

    let searchTimeout = null;

    const handleSearchChange = (value) => {
        // Update state silently without triggering any re-renders
        state.state.cardSearch = value;

        // Update ONLY the cards DOM atomically
        updateCardsAtomically();
    };

    const handleEligibleOnlyChange = (checked) => {
        // Update state silently without triggering any re-renders
        state.state.addOnlyEligible = checked;

        // Update ONLY the cards DOM atomically
        updateCardsAtomically();
    };

    const handleFilterChange = (filterType, value, checked) => {
        // Update state silently without triggering any re-renders
        if (checked) {
            if (!state.state.cardFilters[filterType].includes(value)) {
                state.state.cardFilters[filterType].push(value);
            }
        } else {
            state.state.cardFilters[filterType] = state.state.cardFilters[filterType].filter((v) => v !== value);
        }

        // Update ONLY the cards DOM atomically
        updateCardsAtomically();
    };

    const handleToggleFilters = () => {
        // Simply toggle the local state
        state.localState.filtersOpenAdd = !state.localState.filtersOpenAdd;
        update();
    };

    const handleClearFilters = () => {
        const changes = {
            cardSearch: '',
            addOnlyEligible: false,
            cardFilters: {
                levels: [],
                types: [],
                attributes: [],
                tags: [],
            },
        };
        Object.assign(state.state, changes);
        state.onStateUpdate(changes);
        update();
    };

    const handleCardUsesChange = (input) => {
        const cardId = input.getAttribute('data-card-use-left');
        if (!cardId) return;

        const c = state.character;
        if (!c.cardUses || typeof c.cardUses !== 'object') c.cardUses = {};

        const card = state.state.allCards.find((x) => x.id === cardId);
        const cd = card && card.reload && typeof card.reload === 'object' ? card.reload : null;
        const reloadType = String(cd?.type || '').toUpperCase();
        const total = reloadType === 'ROLL' ? 1 : Number(c.cardUses[cardId]?.total ?? cd?.qty ?? 0) || 0;
        const left =
            reloadType === 'ROLL'
                ? Math.max(0, Math.min(Number(input.value) || 0, 1))
                : Math.max(0, Math.min(Number(input.value) || 0, total));

        c.cardUses[cardId] = { left, total };
        state.onUpdate(c);
    };

    const handleCardAction = (cardSlot, action = null) => {
        const cardId = cardSlot.getAttribute('data-id');
        const slotAction = action || cardSlot.getAttribute('data-actions');

        if (!cardId || !slotAction) return;

        let updatedCharacter = { ...state.character };

        switch (slotAction) {
            case 'add':
                updatedCharacter.cards = [...(updatedCharacter.cards || []), cardId];
                // Clear search filter when adding a card
                state.state.cardSearch = '';
                break;
            case 'remove':
                updatedCharacter.cards = (updatedCharacter.cards || []).filter((id) => id !== cardId);
                // Also remove from active cards if it was active
                updatedCharacter.activeCards = (updatedCharacter.activeCards || []).filter((id) => id !== cardId);
                break;
            case 'activate':
                if (!updatedCharacter.activeCards) updatedCharacter.activeCards = [];
                if (!updatedCharacter.activeCards.includes(cardId)) {
                    updatedCharacter.activeCards.push(cardId);
                }
                break;
            case 'deactivate':
                updatedCharacter.activeCards = (updatedCharacter.activeCards || []).filter((id) => id !== cardId);
                break;
        }

        state.character = updatedCharacter;
        state.onUpdate(updatedCharacter);

        // Use atomic update for cards section to avoid full re-render
        updateCardsAtomically();
    };

    const updateCardsAtomically = () => {
        // Find the cards section in the "Add to collection" panel
        const addPanel = Array.from(container.querySelectorAll('.panel')).find((panel) =>
            panel.querySelector('.cards-filters-grid')
        );
        if (!addPanel) return;

        // Find the cards container (it's the last element in the panel)
        const cardsContainer = addPanel.lastElementChild;
        if (!cardsContainer) return;

        // Store current scroll position
        const currentScroll = container.scrollTop;

        // Re-render just the cards section
        const c = state.character;
        const availableCards = state.state.allCards || [];

        if (!state.cardService || !state.cardService.filter) {
            cardsContainer.innerHTML = '<div class="no-cards">Servicio de cartas no disponible</div>';
            return;
        }

        const candidates = state.cardService
            .filter(availableCards, {
                text: state.state.cardSearch,
                levels: state.state.cardFilters.levels,
                types: state.state.cardFilters.types,
                attributes: state.state.cardFilters.attributes,
                tags: state.state.cardFilters.tags,
            })
            .filter((card) => !state.state.addOnlyEligible || state.meetsRequirements(c, card))
            .filter((x) => !c.cards.includes(x.id))
            .sort((a, b) => Number(a.level) - Number(b.level) || String(a.name).localeCompare(String(b.name)))
            .slice(0, 12);

        if (candidates.length === 0) {
            cardsContainer.innerHTML = '<div class="no-cards">No hay cartas disponibles con los filtros actuales</div>';
        } else {
            cardsContainer.innerHTML = renderCardGrid(candidates, { mode: 'add', limit: 12 });
            mountCardComponents();
        }

        // Restore scroll position immediately
        container.scrollTop = currentScroll;
    };

    const updateCardsOnly = () => {
        // Fallback method for compatibility
        updateCardsAtomically();
    };

    const update = () => {
        if (!container) return;

        // Preserve scroll position and input values
        const scrollTop = container.scrollTop;
        const cardSearchValue = container.querySelector('#card-search')?.value || '';
        const addEligibleValue = container.querySelector('#add-eligible-only')?.checked || false;

        // Also preserve filter states
        const filterStates = {};
        container
            .querySelectorAll('input[data-filter-level], input[data-filter-type], input[data-filter-tag]')
            .forEach((input) => {
                filterStates[input.value] = input.checked;
            });

        // Ensure CSS is loaded on every update
        ensureStyle('./src/components/CardsTab/CardsTab.css');
        container.innerHTML = render();

        // Restore scroll position with a small delay to ensure DOM is ready
        setTimeout(() => {
            container.scrollTop = scrollTop;
        }, 0);

        // Restore input values
        const cardSearchInput = container.querySelector('#card-search');
        const addEligibleInput = container.querySelector('#add-eligible-only');
        if (cardSearchInput) cardSearchInput.value = cardSearchValue;
        if (addEligibleInput) addEligibleInput.checked = addEligibleValue;

        // Restore filter states
        Object.entries(filterStates).forEach(([value, checked]) => {
            const filterInput = container.querySelector(`input[value="${value}"]`);
            if (filterInput) filterInput.checked = checked;
        });

        bindEvents();
        mountCardComponents();
    };

    const mountCardComponents = () => {
        // Mount CardComponent in each card slot
        container.querySelectorAll('.card-slot').forEach((slot) => {
            const cardId = slot.getAttribute('data-id');
            const actions = slot.getAttribute('data-actions');

            if (!cardId) return;

            // Find the card data
            const availableCards = state.state.allCards || [];
            const card = availableCards.find((c) => c.id === cardId);

            if (!card) return;

            // Create actions renderer based on the action type
            const actionsRenderer = () => {
                switch (actions) {
                    case 'add':
                        return html`<button class="button" data-action="add">Añadir</button>`;
                    case 'deactivate':
                        // For active cards: Uses on left, Desactivar button on right
                        const reload = card.reload && typeof card.reload === 'object' ? card.reload : null;
                        const qtyNum = reload && Number.isFinite(Number(reload.qty)) ? Number(reload.qty) : null;
                        const reloadType = String(reload && reload.type ? reload.type : '').toUpperCase();
                        const isRoll = reloadType === 'ROLL';
                        const showUses = !!reload && (reload.type != null || qtyNum > 0);

                        if (!showUses) {
                            return html`<button class="button" data-action="deactivate">Desactivar</button>`;
                        }

                        const uses = (state.character.cardUses && state.character.cardUses[cardId]) || {
                            left: null,
                            total: null,
                        };
                        const total = isRoll ? 1 : Number(uses.total ?? (qtyNum != null ? qtyNum : 0)) || 0;
                        const left = Math.min(Number(uses.left ?? total) || 0, total);

                        return html`
                            <div
                                style="display: flex; justify-content: space-between; align-items: center; width: 100%;"
                            >
                                <div style="display:flex; align-items:center; gap:.5rem;">
                                    <span>Usos</span>
                                    <div class="value-indicator">
                                        <input
                                            type="number"
                                            data-card-use-left="${cardId}"
                                            min="0"
                                            step="1"
                                            value="${left}"
                                        />
                                        / <strong>${total}</strong>
                                    </div>
                                </div>
                                <button class="button" data-action="deactivate">Desactivar</button>
                            </div>
                        `;
                    case 'toggle':
                        // For collection cards: Quitar on left, Activar/Desactivar on right
                        const isActive = (state.character.activeCards || []).includes(cardId);
                        const canActivate = card.type && card.type.toLowerCase() === 'activable';
                        return html`
                            <div
                                style="display: flex; justify-content: space-between; align-items: center; width: 100%;"
                            >
                                <button class="button" data-action="remove">Quitar</button>
                                ${canActivate && !isActive
                                    ? html`<button class="button" data-action="activate">Activar</button>`
                                    : ''}
                            </div>
                        `;
                    default:
                        return '';
                }
            };

            // Create uses renderer for active cards (now handled in actionsRenderer)
            const usesRenderer = () => {
                return '';
            };

            // Mount CardComponent
            const comp = CardComponent(slot, { card, actionsRenderer, usesRenderer });
            comp.init();
        });
    };

    return {
        init() {
            update();
        },
        setState(partial) {
            // Preserve local state when updating from parent
            const preservedLocalState = state.localState;
            const oldState = { ...state };
            state = { ...state, ...partial };
            state.localState = preservedLocalState;

            // Only update if there are meaningful changes
            const hasSignificantChanges =
                oldState.character !== state.character ||
                oldState.state.allCards !== state.state.allCards ||
                oldState.state.cardSearch !== state.state.cardSearch ||
                oldState.state.addOnlyEligible !== state.state.addOnlyEligible ||
                JSON.stringify(oldState.state.cardFilters) !== JSON.stringify(state.state.cardFilters);

            if (hasSignificantChanges) {
                update();
            }
        },
        update() {
            update();
        },
    };
};

export default CardsTab;
