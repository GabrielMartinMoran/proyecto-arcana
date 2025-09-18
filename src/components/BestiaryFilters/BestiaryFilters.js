const html = window.html || String.raw;

/**
 * BestiaryFilters - search + NA multi-select with clear button
 * Renders using the same classnames styled by BestiaryPage.css
 *
 * @param {HTMLElement} container
 * @param {{ search: string, naOptions: number[], selectedNA: number[], onChange: (state:{search:string, selectedNA:number[]})=>void, onClear: ()=>void }} props
 */
const BestiaryFilters = (container, props = {}) => {
    let state = {
        search: String(props.search || ''),
        naOptions: Array.isArray(props.naOptions) ? props.naOptions : [],
        selectedNA: Array.isArray(props.selectedNA) ? props.selectedNA.slice() : [],
        onChange: typeof props.onChange === 'function' ? props.onChange : () => {},
        onClear: typeof props.onClear === 'function' ? props.onClear : () => {},
    };

    const render = () => html`
        <div class="bestiary-filters-panel">
            <div class="filter-group">
                <input id="beast-search" type="text" placeholder="Buscar por nombre" value="${state.search}" />
            </div>
            <div class="filter-group">
                <div class="filters-label">Nivel de amenaza (NA)</div>
                <div class="filters-list" id="beast-na-list">
                    ${state.naOptions
                        .map(
                            (na) =>
                                html`<label class="filters-check"
                                    ><input
                                        type="checkbox"
                                        name="na-filter"
                                        value="${na}"
                                        ${state.selectedNA.includes(na) ? 'checked' : ''}
                                    />
                                    ${na}</label
                                >`
                        )
                        .join('')}
                </div>
            </div>
            <div class="filter-actions">
                <button class="button" id="beast-clear-filters">Limpiar filtros</button>
            </div>
        </div>
    `;

    const bind = () => {
        const root = container;
        let debTimer = null;
        const debounced = (fn) => {
            clearTimeout(debTimer);
            debTimer = setTimeout(fn, 150);
        };
        const searchInput = root.querySelector('#beast-search');
        if (searchInput)
            searchInput.addEventListener('input', (e) => {
                state.search = String(e.target.value || '');
                debounced(() => state.onChange({ search: state.search, selectedNA: state.selectedNA.slice() }));
            });
        root.addEventListener('change', (e) => {
            const target = e.target;
            if (!target || target.tagName !== 'INPUT') return;
            const name = target.getAttribute('name') || '';
            if (name !== 'na-filter') return;
            const val = Number(target.value) || 0;
            if (target.checked) {
                if (!state.selectedNA.includes(val)) state.selectedNA.push(val);
            } else {
                state.selectedNA = state.selectedNA.filter((x) => x !== val);
            }
            state.onChange({ search: state.search, selectedNA: state.selectedNA.slice() });
        });
        const clearBtn = root.querySelector('#beast-clear-filters');
        if (clearBtn)
            clearBtn.addEventListener('click', () => {
                state.search = '';
                state.selectedNA = [];
                setState({});
                state.onClear();
            });
    };

    const setState = (partial) => {
        state = { ...state, ...partial };
        container.innerHTML = render();
        bind();
    };

    return { init: () => setState({}), setState };
};

export default BestiaryFilters;
