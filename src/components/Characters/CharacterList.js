const html = window.html || String.raw;

/**
 * CharacterList - Sidebar list of characters with basic actions
 * @param {HTMLElement} container
 * @param {{ list: any[], selectedId?: string|null, onSelect?: (id:string)=>void, onCreate?: ()=>void, onExport?: ()=>void, onImport?: (obj:any)=>void, onDelete?: ()=>void }} props
 */
const CharacterList = (container, props = {}) => {
    let state = {
        list: Array.isArray(props.list) ? props.list : [],
        selectedId: props.selectedId || null,
        onSelect: typeof props.onSelect === 'function' ? props.onSelect : () => {},
        onCreate: typeof props.onCreate === 'function' ? props.onCreate : () => {},
        onExport: typeof props.onExport === 'function' ? props.onExport : () => {},
        onImport: typeof props.onImport === 'function' ? props.onImport : () => {},
        onDelete: typeof props.onDelete === 'function' ? props.onDelete : () => {},
    };

    const render = () => html`
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
                    .map(
                        (p) =>
                            html`<li>
                                <button class="item ${state.selectedId === p.id ? 'active' : ''}" data-id="${p.id}">
                                    ${p.name}
                                </button>
                            </li>`
                    )
                    .join('')}
            </ul>
        </aside>
    `;

    const bind = () => {
        const createBtn = container.querySelector('[data-action="create"]');
        const exportBtn = container.querySelector('[data-action="export-current"]');
        const importBtn = container.querySelector('[data-action="import-current"]');
        const deleteBtn = container.querySelector('[data-action="delete-current"]');
        const fileInput = container.querySelector('#import-one-file');
        if (createBtn) createBtn.addEventListener('click', () => state.onCreate());
        if (exportBtn) exportBtn.addEventListener('click', () => state.onExport());
        if (deleteBtn) deleteBtn.addEventListener('click', () => state.onDelete());
        if (importBtn) importBtn.addEventListener('click', () => fileInput && fileInput.click());
        if (fileInput)
            fileInput.addEventListener('change', async (e) => {
                const file = e.target.files && e.target.files[0];
                if (!file) return;
                try {
                    const text = await file.text();
                    const obj = JSON.parse(text);
                    state.onImport(obj);
                } catch (_) {}
                e.target.value = '';
            });
        container.querySelectorAll('.items .item').forEach((btn) =>
            btn.addEventListener('click', () => {
                const id = btn.getAttribute('data-id');
                state.selectedId = id;
                state.onSelect(id);
            })
        );
    };

    const setState = (partial) => {
        state = { ...state, ...partial };
        container.innerHTML = render();
        bind();
    };

    return { init: () => setState({}), setState };
};

export default CharacterList;
