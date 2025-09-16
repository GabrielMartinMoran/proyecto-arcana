const html = window.html || String.raw;
import { ensureStyle } from '../../utils/style-utils.js';

/**
 * NotesTab - Component for character notes
 * @param {HTMLElement} container
 * @param {{ character: Object, onUpdate: Function }} props
 */
const NotesTab = (container, props = {}) => {
    let state = {
        character: props.character || {},
        onUpdate: typeof props.onUpdate === 'function' ? props.onUpdate : () => {},
    };

    const render = () => {
        const c = state.character;
        
        return html`
            <div class="editor-grid one-col">
                <div class="panel">
                    <label>Notas</label>
                    <textarea id="notes" rows="12">${c.notes || ''}</textarea>
                </div>
            </div>
        `;
    };

    const bindEvents = () => {
        if (!container) return;

        // Event delegation for textarea changes
        container.addEventListener('input', (e) => {
            if (e.target.id === 'notes') {
                handleNotesChange(e.target.value);
            }
        });

        // Event delegation for blur events (auto-save)
        container.addEventListener('blur', (e) => {
            if (e.target.id === 'notes') {
                // Trigger update if needed
                state.onUpdate(state.character);
            }
        }, true);
    };

    const handleNotesChange = (value) => {
        state.character.notes = value;
        state.onUpdate(state.character);
    };

    const update = () => {
        if (!container) return;
        container.innerHTML = render();
        bindEvents();
    };

    return {
        init() {
            ensureStyle('./src/components/NotesTab/NotesTab.css');
            update();
        },
        setState(partial) {
            state = { ...state, ...partial };
            update();
        },
    };
};

export default NotesTab;