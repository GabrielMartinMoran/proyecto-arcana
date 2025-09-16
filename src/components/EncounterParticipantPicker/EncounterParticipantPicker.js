const html = window.html || String.raw;
import ModalComponent from '../../components/ModalComponent/ModalComponent.js';
import { ensureStyle } from '../../utils/style-utils.js';

/**
 * EncounterParticipantPicker - Modal for selecting PCs or creatures
 * @param {HTMLElement} container
 * @param {{ mode: 'pc'|'npc', party: Array, beasts: Array, onPick: Function }} props
 */
const EncounterParticipantPicker = (container, props = {}) => {
    let state = {
        mode: props.mode || 'pc',
        party: Array.isArray(props.party) ? props.party : [],
        beasts: Array.isArray(props.beasts) ? props.beasts : [],
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
        return source.map((x) => ({ ...x }));
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
            // Autofocus
            setTimeout(() => input.focus(), 0);
        }

        if (list) {
            list.addEventListener('click', (e) => {
                const btn = e.target && e.target.closest && e.target.closest('[data-pick-idx]');
                if (btn) {
                    const idx = Number(btn.getAttribute('data-pick-idx')) || 0;
                    const item = state.currentItems[idx];
                    if (item && state.modal) {
                        state.modal.close();
                        state.onPick(item);
                    }
                }
            });
        }
    };

    const updateItems = () => {
        const allItems = getSourceItems();
        state.currentItems = !state.searchQuery ? allItems : 
            allItems.filter((item) => normalize(item.name || item.label || '').includes(state.searchQuery));
        
        const list = container.querySelector('#add-list');
        if (list) {
            list.innerHTML = state.currentItems.map((item, idx) => renderItem(item, idx)).join('');
        }
    };

    const open = async () => {
        const title = state.mode === 'pc' ? 'Añadir personaje' : 'Añadir criatura';
        state.modal = ModalComponent(container, { 
            title, 
            onClose: () => {
                if (state.modal) {
                    state.modal.close();
                }
            }
        });
        state.modal.init();
        state.modal.open(render(), title, 'light');
        updateItems();
        bind();
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


