const html = window.html || String.raw;
import { ensureStyle } from '../../utils/style-utils.js';
/**
 * CardComponent - Compact card preview item
 * @param {HTMLElement} container
 * @param {{ card: any, onClick?: (card:any)=>void, actionsRenderer?: (card:any)=>string, usesRenderer?: (card:any)=>string }} props
 */
const CardComponent = (container, props = {}) => {
    let state = {
        card: props.card || null,
        onClick: typeof props.onClick === 'function' ? props.onClick : () => {},
        actionsRenderer: typeof props.actionsRenderer === 'function' ? props.actionsRenderer : null,
        usesRenderer: typeof props.usesRenderer === 'function' ? props.usesRenderer : null,
    };

    const getAccentForAttribute = (attr) => {
        switch ((attr || '').toLowerCase()) {
            case 'mente':
                return 'var(--accent-mente)';
            case 'cuerpo':
                return 'var(--accent-cuerpo)';
            case 'agilidad':
                return 'var(--accent-agilidad)';
            case 'instinto':
                return 'var(--accent-instinto)';
            case 'presencia':
                return 'var(--accent-presencia)';
            default:
                return 'var(--accent-default)';
        }
    };

    const loadStyles = () => {
        ensureStyle('./src/components/CardComponent/CardComponent.css');
    };

    const renderReload = (reload) => {
        if (reload.type === 'LONG_REST') {
            return html`<span class="chip"
                >Usos: ${reload.qty} por día de descanso</span
            >`;
        }
        if (reload.type === 'ROLL') {
            return html`<span class="chip">Usos: 1 (Recarga ${reload.qty}+)</span>`;
        }
        return '';
    };

    const render = () => {
        const c = state.card;
        if (!c) return html`<div class="empty-state">No card</div>`;
        const accent = getAccentForAttribute(c.attribute);
        return html`
            <div
                class="arcana-card"
                data-id="${c.id}"
                data-attr="${c.attribute || ''}"
                data-type="${c.type || ''}"
                style="--accent: ${accent}"
            >
                <div class="card-inner">
                    <div class="card-header">
                        <h4 class="card-name">${c.name}</h4>
                        <div class="card-meta">
                            <span class="level-badge">Lv ${c.level}</span>
                            <span class="type-badge">${c.type}</span>
                        </div>
                    </div>
                    <div class="card-body">
                        <div class="card-description">${c.description}</div>
                    </div>
                    <div class="card-footer">
                        <div class="card-badges">
                            ${c.attribute ? html`<span class="chip">Atributo: ${c.attribute}</span>` : ''}
                            ${(Array.isArray(c.tags) ? c.tags : [])
                                .map((t) => html`<span class="chip">${t}</span>`)
                                .join('')}
                            ${c.reload ? renderReload(c.reload) : ''}
                        </div>
                        ${state.usesRenderer ? html`<div class="card-uses">${state.usesRenderer(c)}</div>` : ''}
                        ${c.requirements && c.requirements.length
                            ? html`
                                  <div class="card-reqs">
                                      <span class="req-title">Requirements</span>
                                      <div class="req-list">${c.requirements.join(', ')}</div>
                                  </div>
                              `
                            : ''}
                        ${state.actionsRenderer
                            ? html`<div class="card-actions">${state.actionsRenderer(c)}</div>`
                            : ''}
                    </div>
                </div>
            </div>
        `;
    };

    const bindEvents = () => {};

    const setState = (partial) => {
        state = { ...state, ...partial };
        container.innerHTML = render();
        bindEvents();
    };

    return {
        init: () => {
            loadStyles();
            setState({});
        },
        setState,
    };
};

export default CardComponent;
