const html = window.html || String.raw;

/**
 * HistoryList - simple render-only list for histories (dice, PP)
 *
 * @param {HTMLElement} container
 * @param {{ items: any[], renderItem: (item:any)=>string, header?: string, onClick?: (ev:MouseEvent)=>void, wrap?: boolean }} props
 */
const HistoryList = (container, props = {}) => {
    let state = {
        items: Array.isArray(props.items) ? props.items : [],
        renderItem: typeof props.renderItem === 'function' ? props.renderItem : () => '',
        header: typeof props.header === 'string' ? props.header : 'Historial',
        onClick: typeof props.onClick === 'function' ? props.onClick : null,
        wrap: !!props.wrap,
    };

    const render = () =>
        state.wrap
            ? html`<div class="panel">
                  <div class="panel-header">
                      <label style="margin:0;">${state.header}</label>
                  </div>
                  <div class="dice-log">${state.items.map((it) => state.renderItem(it)).join('')}</div>
              </div>`
            : html`<div class="dice-log">${state.items.map((it) => state.renderItem(it)).join('')}</div>`;

    const setState = (partial = {}) => {
        state = { ...state, ...partial };
        container.innerHTML = render();
        if (state.onClick) container.addEventListener('click', state.onClick);
    };

    return {
        init: () => setState({}),
        setState,
    };
};

export default HistoryList;
