const html = window.html || String.raw;
import PanelHeader from '../PanelHeader/PanelHeader.js';
import { ensureStyle } from '../../utils/style-utils.js';

/**
 * BioTab - Component for character biography
 * @param {HTMLElement} container
 * @param {{ character: Object, readOnly: boolean, onUpdate: Function }} props
 */
const BioTab = (container, props = {}) => {
    let state = {
        character: props.character || {},
        readOnly: !!props.readOnly,
        onUpdate: typeof props.onUpdate === 'function' ? props.onUpdate : () => {},
    };

    const render = () => {
        const c = state.character;
        const readOnly = state.readOnly;

        return html`
            <div class="editor-grid one-col">
                <div class="panel">
                    ${PanelHeader({ title: 'Retrato' })}
                    <div class="portrait-wrap"><div id="portrait-mount"></div></div>
                </div>
                <div class="panel">
                    ${PanelHeader({ title: 'Historia' })}
                    ${readOnly
                        ? html`<div class="bio-content">${c.bio || ''}</div>`
                        : html`<textarea id="bio-text" rows="10">${c.bio || ''}</textarea>`}
                </div>
            </div>
        `;
    };

    const bindEvents = () => {
        if (!container) return;

        // Event delegation for textarea changes
        container.addEventListener('input', (e) => {
            if (e.target.id === 'bio-text') {
                handleBioChange(e.target.value);
            }
        });

        // Event delegation for blur events (auto-save)
        container.addEventListener(
            'blur',
            (e) => {
                if (e.target.id === 'bio-text') {
                    // Trigger update if needed
                    state.onUpdate(state.character);
                }
            },
            true
        );
    };

    const handleBioChange = (value) => {
        state.character.bio = value;
        state.onUpdate(state.character);
    };

    const mountSubComponents = async () => {
        // Mount portrait image
        try {
            const pm = container.querySelector('#portrait-mount');
            if (pm && state.character.portraitUrl) {
                const { mountImageWithFallback } = await import('../../utils/image-utils.js');
                mountImageWithFallback(pm, {
                    src: state.character.portraitUrl,
                    alt: `Retrato de ${state.character.name}`,
                    className: 'portrait-img',
                    placeholderText: 'Sin retrato',
                });
            }
        } catch (_) {}
    };

    const update = async () => {
        if (!container) return;
        container.innerHTML = render();
        bindEvents();
        await mountSubComponents();
    };

    return {
        async init() {
            ensureStyle('./src/components/BioTab/BioTab.css');
            await update();
        },
        async setState(partial) {
            state = { ...state, ...partial };
            await update();
        },
    };
};

export default BioTab;
