const html = window.html || String.raw;
import { ensureStyle } from '../../utils/style-utils.js';
/**
 * FiltersComponent - Text search and facets filters
 * @param {HTMLElement} container
 * @param {{ facets: {attributes:string[], tags:string[], types:string[], levels:number[]}, value?: any, onChange?: (value:any)=>void, onClear?: ()=>void }} props
 */
const FiltersComponent = (container, props = {}) => {
    let state = {
        facets: props.facets || {
            attributes: [],
            tags: [],
            types: ['Accionable', 'De Efecto'],
            levels: [1, 2, 3, 4, 5],
        },
        value: props.value || { text: '', levels: [], types: [], attributes: [], tags: [] },
        onChange: typeof props.onChange === 'function' ? props.onChange : () => {},
        onClear: typeof props.onClear === 'function' ? props.onClear : () => {},
        tagsOpen: false,
    };

    const renderOptions = (items, placeholder) =>
        [html`<option value="">${placeholder}</option>`]
            .concat(items.map((v) => html`<option value="${v}">${v}</option>`))
            .join('');

    const render = () => html`
        <div class="filters-panel">
            <div class="filters-block filters-block--search">
                <input
                    id="search"
                    class="filters-input"
                    type="text"
                    placeholder="Buscar por nombre"
                    value="${state.value.text || ''}"
                />
            </div>
            <div class="filters-block filters-block--levels">
                <div class="filters-label">Niveles</div>
                <div class="filters-list">
                    ${state.facets.levels
                        .map(
                            (l) =>
                                html`<label class="filters-check"
                                    ><input
                                        type="checkbox"
                                        name="level"
                                        value="${l}"
                                        ${state.value.levels?.includes(l) ? 'checked' : ''}
                                    />
                                    ${l}</label
                                >`
                        )
                        .join('')}
                </div>
            </div>
            <div class="filters-block filters-block--type">
                <div class="filters-label">Tipo</div>
                <div class="filters-list">
                    ${state.facets.types
                        .map(
                            (t) =>
                                html`<label class="filters-check"
                                    ><input
                                        type="checkbox"
                                        name="type"
                                        value="${t}"
                                        ${state.value.types?.includes(t) ? 'checked' : ''}
                                    />
                                    ${t}</label
                                >`
                        )
                        .join('')}
                </div>
            </div>
            <div class="filters-block filters-block--attr">
                <label class="filters-label" for="attr">Attributo</label>
                <select id="attr" class="filters-input">
                    ${renderOptions(state.facets.attributes, 'Cualquiera')}
                </select>
            </div>
            <div class="filters-block filters-block--sint">
                <label class="filters-label">Etiquetas</label>
                <div class="dropdown">
                    <button class="button" data-tags-toggle>
                        ${state.tagsOpen ? 'Cerrar' : 'Seleccionar etiquetas'}
                    </button>
                    <div class="dropdown-panel ${state.tagsOpen ? 'open' : ''}">
                        <div class="filters-list">
                            ${state.facets.tags
                                .map(
                                    (t) =>
                                        html`<label class="filters-check"
                                            ><input
                                                type="checkbox"
                                                name="tag"
                                                value="${t}"
                                                ${state.value.tags?.includes(t) ? 'checked' : ''}
                                            />
                                            ${t}</label
                                        >`
                                )
                                .join('')}
                        </div>
                        <div class="dropdown-actions">
                            <button class="button" data-tags-clear>Limpiar</button>
                            <button class="button" data-tags-close>Cerrar</button>
                        </div>
                    </div>
                </div>
                ${state.value.tags && state.value.tags.length
                    ? html`<div class="selected-tags">
                          ${state.value.tags.map((t) => html`<span class="chip">#${t}</span>`).join('')}
                      </div>`
                    : ''}
            </div>
            <div class="filters-block filters-block--clear">
                <button class="button" data-action="clear">Limpiar filtros</button>
            </div>
        </div>
    `;

    const bindEvents = () => {
        const search = container.querySelector('#search');
        const attr = container.querySelector('#attr');
        const clear = container.querySelector('[data-action="clear"]');
        const levelChecks = container.querySelectorAll('input[name="level"]');
        const typeChecks = container.querySelectorAll('input[name="type"]');
        const tagChecks = container.querySelectorAll('input[name="tag"]');
        const tagsToggle = container.querySelector('[data-tags-toggle]');
        const tagsClear = container.querySelector('[data-tags-clear]');
        const tagsClose = container.querySelector('[data-tags-close]');

        const emit = () => state.onChange({ ...state.value });

        let debTimer = null;
        const debounced = (fn) => {
            clearTimeout(debTimer);
            debTimer = setTimeout(fn, 180);
        };

        if (search)
            search.addEventListener('input', (e) => {
                state.value.text = e.target.value;
                debounced(emit);
            });
        if (attr)
            attr.addEventListener('change', (e) => {
                const v = e.target.value;
                state.value.attributes = v ? [v] : [];
                emit();
            });
        if (clear)
            clear.addEventListener('click', () => {
                state.value = { text: '', levels: [], types: [], attributes: [], tags: [] };
                state.onClear();
            });
        if (tagsToggle)
            tagsToggle.addEventListener('click', () => {
                state.tagsOpen = !state.tagsOpen;
                setState({});
            });
        if (tagsClose)
            tagsClose.addEventListener('click', () => {
                state.tagsOpen = false;
                setState({});
            });
        if (tagsClear)
            tagsClear.addEventListener('click', () => {
                state.value.tags = [];
                setState({});
                state.onChange(state.value);
            });
        levelChecks.forEach((ch) =>
            ch.addEventListener('change', (e) => {
                const v = Number(e.target.value);
                if (e.target.checked && !state.value.levels.includes(v)) state.value.levels.push(v);
                if (!e.target.checked) state.value.levels = state.value.levels.filter((x) => x !== v);
                emit();
            })
        );
        typeChecks.forEach((ch) =>
            ch.addEventListener('change', (e) => {
                const v = e.target.value;
                if (e.target.checked && !state.value.types.includes(v)) state.value.types.push(v);
                if (!e.target.checked) state.value.types = state.value.types.filter((x) => x !== v);
                emit();
            })
        );
        tagChecks.forEach((ch) =>
            ch.addEventListener('change', (e) => {
                const v = e.target.value;
                if (e.target.checked && !state.value.tags.includes(v)) state.value.tags.push(v);
                if (!e.target.checked) state.value.tags = state.value.tags.filter((x) => x !== v);
                emit();
            })
        );
    };

    const setState = (partial) => {
        state = { ...state, ...partial };
        container.innerHTML = render();
        bindEvents();
    };

    const loadStyles = () => {
        ensureStyle('./src/components/FiltersComponent/FiltersComponent.css');
    };

    return {
        init: () => {
            loadStyles();
            setState({});
        },
        setState,
    };
};

export default FiltersComponent;
