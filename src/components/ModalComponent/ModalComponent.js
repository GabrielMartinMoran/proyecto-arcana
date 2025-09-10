const html = window.html || String.raw;
/**
 * ModalComponent - Accessible modal for card detail
 * @param {HTMLElement} container
 * @param {{ title?: string, onClose?: ()=>void }} props
 */
const ModalComponent = (container, props = {}) => {
    let state = {
        title: props.title || '',
        content: props.content || '',
        open: false,
        onClose: typeof props.onClose === 'function' ? props.onClose : () => {},
    };

    const render = () => html`
        <div class="modal-backdrop ${state.open ? 'open' : ''}" role="dialog" aria-modal="true">
            <div class="modal-panel">
                <div class="modal-header">
                    <h3 class="modal-title">${state.title}</h3>
                    <button class="modal-close" aria-label="Close">×</button>
                </div>
                <div class="modal-body">${state.content}</div>
            </div>
        </div>
    `;

    const bindEvents = () => {
        const backdrop = container.querySelector('.modal-backdrop');
        const closeBtn = container.querySelector('.modal-close');
        if (backdrop) {
            backdrop.addEventListener('click', (e) => {
                if (e.target === backdrop) api.close();
            });
        }
        if (closeBtn) {
            closeBtn.addEventListener('click', () => api.close());
        }
        document.addEventListener('keydown', onKeyDown);
    };

    const onKeyDown = (e) => {
        if (state.open && e.key === 'Escape') api.close();
    };

    const unbindEvents = () => {
        document.removeEventListener('keydown', onKeyDown);
    };

    const setState = (partial) => {
        state = { ...state, ...partial };
        container.innerHTML = render();
        bindEvents();
    };

    const api = {
        init() {
            container.innerHTML = render();
            bindEvents();
        },
        open(content, title = state.title) {
            setState({ content, title, open: true });
        },
        close() {
            setState({ open: false });
            state.onClose();
        },
        setState,
    };

    return api;
};

export default ModalComponent;
