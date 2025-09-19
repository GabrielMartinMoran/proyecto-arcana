const html = window.html || String.raw;
import { ensureStyle } from '../../utils/style-utils.js';

/**
 * Generate a simple UUID-like string for note IDs
 */
const generateId = () => {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
};

/**
 * NotesTab - Component for character notes management
 * @param {HTMLElement} container
 * @param {{ character: Object, readOnly: boolean, onUpdate: Function }} props
 */
const NotesTab = (container, props = {}) => {
    let state = {
        character: props.character || {},
        readOnly: !!props.readOnly,
        selectedNoteId: null,
        onUpdate: typeof props.onUpdate === 'function' ? props.onUpdate : () => {},
    };

    // Ensure character has notes array (only array, no migration)
    if (!Array.isArray(state.character.notes)) {
        state.character.notes = [];
    }

    // Auto-select first note if none selected
    if (!state.selectedNoteId && state.character.notes.length > 0) {
        state.selectedNoteId = state.character.notes[0].id;
    }

    let updateDebounceTimer = null;

    const getSelectedNote = () => {
        return state.character.notes.find((note) => note.id === state.selectedNoteId) || null;
    };

    const saveChanges = () => {
        if (updateDebounceTimer) {
            clearTimeout(updateDebounceTimer);
        }
        state.onUpdate(state.character);
    };

    const debouncedSave = () => {
        if (updateDebounceTimer) {
            clearTimeout(updateDebounceTimer);
        }
        updateDebounceTimer = setTimeout(saveChanges, 300);
    };

    const createNote = () => {
        const noteNumber = state.character.notes.length + 1;
        const newNote = {
            id: generateId(),
            title: `Nota ${noteNumber}`,
            content: '',
        };

        state.character.notes.push(newNote);
        state.selectedNoteId = newNote.id;

        update();
        saveChanges();

        // Focus the title input after creation
        requestAnimationFrame(() => {
            const titleInput = container.querySelector('.note-title-input');
            if (titleInput) {
                titleInput.focus();
                titleInput.select();
            }
        });
    };

    const deleteNote = (noteId) => {
        const noteIndex = state.character.notes.findIndex((note) => note.id === noteId);
        if (noteIndex === -1) return;

        const shouldDelete = confirm('¿Estás seguro de que quieres eliminar esta nota?');
        if (!shouldDelete) return;

        state.character.notes.splice(noteIndex, 1);

        // Adjust selection
        if (state.character.notes.length > 0) {
            const newIndex = Math.min(noteIndex, state.character.notes.length - 1);
            state.selectedNoteId = state.character.notes[newIndex].id;
        } else {
            state.selectedNoteId = null;
        }

        update();
        saveChanges();
    };

    const updateNoteTitle = (noteId, newTitle) => {
        const note = state.character.notes.find((note) => note.id === noteId);
        if (note) {
            note.title = newTitle;
            // Update list in real-time
            const listItem = container.querySelector(`[data-note-id="${noteId}"] .note-list-title`);
            if (listItem) {
                listItem.textContent = newTitle;
            }
            debouncedSave();
        }
    };

    const updateNoteContent = (noteId, newContent) => {
        const note = state.character.notes.find((note) => note.id === noteId);
        if (note) {
            note.content = newContent;
            debouncedSave();
        }
    };

    const renderNotesList = () => {
        if (state.character.notes.length === 0) {
            return html`
                <div class="notes-empty-state">
                    <p>No hay notas creadas</p>
                    ${!state.readOnly
                        ? html`
                              <button type="button" class="button" data-action="create">➕ Crear primera nota</button>
                          `
                        : ''}
                </div>
            `;
        }

        return html`
            <div class="notes-list-header">
                <h3>Notas</h3>
                ${!state.readOnly
                    ? html`
                          <button type="button" class="button" data-action="create" title="Crear nueva nota">➕</button>
                      `
                    : ''}
            </div>
            <div class="notes-list">
                ${state.character.notes
                    .map(
                        (note) => html`
                            <div
                                class="note-list-item ${note.id === state.selectedNoteId ? 'selected' : ''}"
                                data-note-id="${note.id}"
                                data-action="select"
                            >
                                <div class="note-list-title">${note.title}</div>
                            </div>
                        `
                    )
                    .join('')}
            </div>
        `;
    };

    const renderNoteEditor = () => {
        const selectedNote = getSelectedNote();

        if (!selectedNote) {
            return html`
                <div class="note-editor-empty">
                    <p>Selecciona una nota para verla o editarla</p>
                </div>
            `;
        }

        if (state.readOnly) {
            return html`
                <div class="note-editor">
                    <div class="note-header-readonly">
                        <h3>${selectedNote.title}</h3>
                    </div>
                    <div class="note-content-readonly">
                        ${selectedNote.content
                            .split('\n')
                            .map((line) => html`<p>${line || '<br>'}</p>`)
                            .join('')}
                    </div>
                </div>
            `;
        }

        return html`
            <div class="note-editor">
                <div class="note-header">
                    <input
                        type="text"
                        class="note-title-input"
                        value="${selectedNote.title}"
                        data-note-id="${selectedNote.id}"
                        data-action="update-title"
                    />
                    <button
                        type="button"
                        class="button"
                        data-note-id="${selectedNote.id}"
                        data-action="delete"
                        title="Eliminar nota"
                    >
                        🗑️
                    </button>
                </div>
                <textarea
                    class="note-content-input"
                    rows="12"
                    data-note-id="${selectedNote.id}"
                    data-action="update-content"
                    placeholder="Escribe el contenido de la nota aquí..."
                >
${selectedNote.content}</textarea
                >
            </div>
        `;
    };

    const render = () => {
        return html`
            <div class="notes-tab">
                <div class="notes-layout">
                    <div class="notes-list-panel">${renderNotesList()}</div>
                    <div class="notes-editor-panel">${renderNoteEditor()}</div>
                </div>
            </div>
        `;
    };

    const bindEvents = () => {
        if (!container) return;

        // Remove existing listeners to avoid duplicates
        if (container.__notesHandlers) {
            container.__notesHandlers.forEach(({ element, event, handler, useCapture }) => {
                element.removeEventListener(event, handler, useCapture);
            });
            container.__notesHandlers = [];
        }

        // Event delegation for all interactions
        const clickHandler = (e) => {
            let target = e.target;
            let action = target.dataset.action;
            let noteId = target.dataset.noteId;

            // Si no hay action en el target directo, buscar en el padre
            if (!action && target.parentElement) {
                target = target.parentElement;
                action = target.dataset.action;
                noteId = target.dataset.noteId;
            }

            switch (action) {
                case 'create':
                    e.preventDefault();
                    if (!state.readOnly) createNote();
                    break;

                case 'select':
                    e.preventDefault();
                    if (noteId && noteId !== state.selectedNoteId) {
                        state.selectedNoteId = noteId;
                        update();
                    }
                    break;

                case 'delete':
                    e.preventDefault();
                    if (!state.readOnly && noteId) deleteNote(noteId);
                    break;
            }
        };

        const inputHandler = (e) => {
            if (state.readOnly) return;

            const action = e.target.dataset.action;
            const noteId = e.target.dataset.noteId;

            switch (action) {
                case 'update-title':
                    if (noteId) updateNoteTitle(noteId, e.target.value);
                    break;

                case 'update-content':
                    if (noteId) updateNoteContent(noteId, e.target.value);
                    break;
            }
        };

        const blurHandler = (e) => {
            if (state.readOnly) return;

            const action = e.target.dataset.action;
            if (action === 'update-title' || action === 'update-content') {
                // Force save on blur
                saveChanges();
            }
        };

        container.addEventListener('click', clickHandler);
        container.addEventListener('input', inputHandler);
        container.addEventListener('blur', blurHandler, true);

        // Store handlers for cleanup
        container.__notesHandlers = [
            { element: container, event: 'click', handler: clickHandler, useCapture: false },
            { element: container, event: 'input', handler: inputHandler, useCapture: false },
            { element: container, event: 'blur', handler: blurHandler, useCapture: true },
        ];
    };

    const update = () => {
        if (!container) return;
        container.innerHTML = render();
        bindEvents();
    };

    const destroy = () => {
        // Force immediate save when destroying (e.g., tab switch)
        if (updateDebounceTimer) {
            clearTimeout(updateDebounceTimer);
            updateDebounceTimer = null;
            // Force synchronous save
            saveChanges();
        }

        // Clean up all event listeners
        if (container && container.__notesHandlers) {
            container.__notesHandlers.forEach(({ element, event, handler, useCapture }) => {
                if (element && typeof element.removeEventListener === 'function') {
                    element.removeEventListener(event, handler, useCapture || false);
                }
            });
            container.__notesHandlers = [];
        }
    };

    return {
        init() {
            ensureStyle('./src/components/NotesTab/NotesTab.css');
            update();
        },
        setState(partial) {
            state = { ...state, ...partial };

            // Auto-select first note if none selected
            if (!state.selectedNoteId && state.character.notes.length > 0) {
                state.selectedNoteId = state.character.notes[0].id;
            }

            update();
        },
        destroy,
    };
};

export default NotesTab;
