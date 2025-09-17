const html = window.html || String.raw;
import ModalComponent from '../../components/ModalComponent/ModalComponent.js';
import { ensureStyle } from '../../utils/style-utils.js';

/**
 * EncounterParticipantPicker - Modal for selecting PCs or creatures
 * @param {HTMLElement} container
 * @param {{ mode: 'pc'|'npc', party: Array, beasts: Array, tracker: Array, onPick: Function }} props
 */
const EncounterParticipantPicker = (container, props = {}) => {
    let state = {
        mode: props.mode || 'pc',
        party: Array.isArray(props.party) ? props.party : [],
        beasts: Array.isArray(props.beasts) ? props.beasts : [],
        tracker: Array.isArray(props.tracker) ? props.tracker : [],
        onPick: typeof props.onPick === 'function' ? props.onPick : () => {},
        modal: null,
        currentItems: [],
        searchQuery: '',
    };

    const normalize = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

    const getSourceItems = () => {
        const source = state.mode === 'pc' ? state.party : 
            (Array.isArray(state.beasts) ? state.beasts : 
            (Array.isArray(state.beasts && state.beasts.creatures) ? state.beasts.creatures : []));
        
        // Filter out participants that are already in the tracker
        const existingIds = new Set();
        state.tracker.forEach(participant => {
            if (state.mode === 'pc') {
                existingIds.add(participant.id);
            } else {
                existingIds.add(participant.id); // For NPCs, id is the name
            }
        });
        
        return source
            .map((x) => ({ ...x }))
            .filter(item => {
                const itemId = state.mode === 'pc' ? item.id : item.name;
                return !existingIds.has(itemId);
            });
    };

    const renderItem = (item, idx) => {
        const name = item.name || item.label || `#${idx + 1}`;
        const img = state.mode === 'pc' ? item.portraitUrl || '' : item.img || '';
        const initial = (name || '?').trim().charAt(0).toUpperCase();
        return html`<button class="item" data-pick-idx="${idx}" aria-label="Seleccionar ${name}">
            <span class="avatar ${img ? '' : 'placeholder'}">
                ${img ? html`<img src="${img}" alt="" referrerpolicy="no-referrer" />` : ''}
                <span class="initial">${initial}</span>
            </span>
            <span class="item-name">${name}</span>
        </button>`;
    };

    const render = () => {
        const items = state.currentItems;
        return html`<div class="encounter-picker">
            <input id="add-search" type="text" placeholder="Buscar por nombre" aria-label="Buscar participantes" />
            <div id="add-list" class="picker-list" role="listbox" aria-label="Lista de participantes">
                ${items.map((item, idx) => renderItem(item, idx)).join('')}
            </div>
        </div>`;
    };

    const bind = () => {
        const input = container.querySelector('#add-search');
        const list = container.querySelector('#add-list');
        
        if (input) {
            input.addEventListener('input', (e) => {
                state.searchQuery = normalize(e.target.value);
                updateItems();
            });
            input.addEventListener('click', (e) => {
                // Stop propagation to prevent backdrop click
                e.stopPropagation();
            });
            // Autofocus the input
            setTimeout(() => input.focus(), 100);
        }

        if (list) {
            list.addEventListener('click', (e) => {
                // Stop propagation to prevent backdrop click
                e.stopPropagation();
                
                const btn = e.target && e.target.closest && e.target.closest('[data-pick-idx]');
                if (btn) {
                    const idx = Number(btn.getAttribute('data-pick-idx')) || 0;
                    const item = state.currentItems[idx];
                    if (item && state.modal) {
                        state.modal.close();
                        
                        // For NPCs, ask for quantity
                        if (state.mode === 'npc') {
                            openQuantityModal(item);
                        } else {
                            state.onPick(item);
                        }
                    }
                }
            });
        }
    };

    const openQuantityModal = (creature) => {
        const quantityModal = ModalComponent(container, {
            title: `Cantidad de ${creature.name}`,
            onClose: () => {
                // Clean up
            }
        });
        
        quantityModal.init();
        const content = html`
            <div class="quantity-modal">
                <div class="field">
                    <label>Cantidad de ${creature.name}:</label>
                    <input type="number" id="creature-quantity" min="1" max="20" value="1" />
                </div>
                <div class="field">
                    <button class="button primary full-width" id="confirm-quantity">Agregar grupo de NPCs</button>
                </div>
            </div>
        `;
        
        quantityModal.open(content, `Cantidad de ${creature.name}`, 'light');
        
        // Bind quantity modal events
        setTimeout(() => {
            const quantityInput = container.querySelector('#creature-quantity');
            const confirmBtn = container.querySelector('#confirm-quantity');
            
            if (quantityInput) {
                quantityInput.focus();
                quantityInput.select();
            }
            
            if (confirmBtn) {
                confirmBtn.addEventListener('click', () => {
                    const quantity = Math.max(1, Math.min(20, Number(quantityInput.value) || 1));
                    quantityModal.close();
                    
                    // Create group data
                    const groupData = {
                        ...creature,
                        quantity: quantity,
                        isGroup: true
                    };
                    
                    state.onPick(groupData);
                });
            }
        }, 10);
    };

    const updateItems = () => {
        const allItems = getSourceItems();
        state.currentItems = !state.searchQuery ? allItems : 
            allItems.filter((item) => normalize(item.name || item.label || '').includes(state.searchQuery));
        
        const list = container.querySelector('#add-list');
        if (list) {
            const html = state.currentItems.map((item, idx) => renderItem(item, idx)).join('');
            list.innerHTML = html;
        }
    };

    const open = async () => {
        const title = state.mode === 'pc' ? 'Añadir personaje' : 'Añadir NPC';
        
        // Clean up any existing modal first
        if (state.modal) {
            state.modal = null;
        }
        
        state.modal = ModalComponent(container, {
            title, 
            onClose: () => {
                // Clean up without calling close again
                state.modal = null;
            }
        });
        
        state.modal.init();
        const content = render();
        state.modal.open(content, title, 'light');
        updateItems();
        
        // Add a small delay before binding events to avoid immediate click events
        setTimeout(() => {
            bind();
        }, 10);
    };

    return {
        init: () => {
            ensureStyle('./src/components/EncounterParticipantPicker/EncounterParticipantPicker.css');
        },
        open,
        setState: (partial) => {
            state = { ...state, ...partial };
            updateItems();
        },
    };
};

export default EncounterParticipantPicker;


