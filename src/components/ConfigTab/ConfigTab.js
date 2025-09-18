const html = window.html || String.raw;
import PanelHeader from '../PanelHeader/PanelHeader.js';
import InlineStat from '../InlineStat/InlineStat.js';
import { ensureStyle } from '../../utils/style-utils.js';

/**
 * ConfigTab - Component for character configuration
 * @param {HTMLElement} container
 * @param {{ character: Object, derived: Object, allowedFields: Array, onUpdate: Function }} props
 */
const ConfigTab = (container, props = {}) => {
    let state = {
        character: props.character || {},
        derived: props.derived || {},
        allowedFields: props.allowedFields || [],
        onUpdate: typeof props.onUpdate === 'function' ? props.onUpdate : () => {},
    };

    const render = () => {
        const c = state.character;
        const derived = state.derived;

        return html`
            <div class="editor-grid one-col">
                <div class="panel">
                    ${PanelHeader({ title: 'Retrato' })}
                    <div class="attrs">
                        <div class="attr">
                            <span>URL</span>
                            <input
                                type="text"
                                id="portrait-url"
                                class="portrait-url-input"
                                value="${c.portraitUrl || ''}"
                            />
                        </div>
                    </div>
                </div>
                <div class="panel">
                    ${PanelHeader({ title: 'Listado de modificadores' })}
                    <div id="mods-host"></div>
                    <div class="config-vars-help">
                        <small
                            >Variables disponibles: cuerpo, reflejos, mente, instinto, presencia, salud, velocidad,
                            esquiva, mitigacion, ndMente, ndInstinto, suerteMax, pp, gold.</small
                        >
                    </div>
                    <label>Valores actuales</label>
                    <div class="config-summary">
                        ${InlineStat('Salud', derived.salud)} ${InlineStat('Velocidad', derived.velocidad)}
                        ${InlineStat('Esquiva', derived.esquiva)} ${InlineStat('Mitigación', derived.mitigacion)}
                        ${InlineStat('ND (Mente)', derived.ndMente)} ${InlineStat('ND (Instinto)', derived.ndInstinto)}
                        ${InlineStat('Suerte máx.', derived.suerteMax)}
                    </div>
                </div>
            </div>
        `;
    };

    const bindEvents = () => {
        if (!container) return;

        // Event delegation for input changes
        container.addEventListener('input', (e) => {
            if (e.target.id === 'portrait-url') {
                handlePortraitUrlChange(e.target.value);
            }
        });

        // Event delegation for blur events (auto-save)
        container.addEventListener(
            'blur',
            (e) => {
                if (e.target.id === 'portrait-url') {
                    // Trigger update if needed
                    state.onUpdate(state.character);
                }
            },
            true
        );
    };

    const handlePortraitUrlChange = (value) => {
        state.character.portraitUrl = value.trim();
        state.onUpdate(state.character);
    };

    const mountSubComponents = async () => {
        // Mount ModifiersList
        try {
            const modsHost = container.querySelector('#mods-host');
            if (modsHost && state.allowedFields) {
                const ModifiersList = (await import('../ModifiersList/ModifiersList.js')).default;
                const comp = ModifiersList(modsHost, {
                    items: Array.isArray(state.character.modifiers) ? state.character.modifiers : [],
                    allowedFields: state.allowedFields,
                    onChange: (items) => {
                        state.character.modifiers = items;
                        state.onUpdate(state.character);
                    },
                });
                comp.init();
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
            ensureStyle('./src/components/ConfigTab/ConfigTab.css');
            await update();
        },
        async setState(partial) {
            state = { ...state, ...partial };
            await update();
        },
    };
};

export default ConfigTab;
