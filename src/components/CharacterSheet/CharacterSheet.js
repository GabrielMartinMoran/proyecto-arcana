const html = window.html || String.raw;
import SheetTab from '../SheetTab/SheetTab.js';
import CardsTab from '../CardsTab/CardsTab.js';
import ConfigTab from '../ConfigTab/ConfigTab.js';
import BioTab from '../BioTab/BioTab.js';
import ProgressTab from '../ProgressTab/ProgressTab.js';
import DiceTab from '../DiceTab/DiceTab.js';
import NotesTab from '../NotesTab/NotesTab.js';

/**
 * CharacterSheet component: renders and binds the character tabs UI.
 * Props:
 *  - state: external shared state (cards, filters, selected tab, facets...)
 *  - character: the character object
 *  - services: { CardService, meetsRequirements, RULES }
 *  - options: { readOnly?: boolean }
 *  - hooks: { onBind?: (root)=>void }
 */
export default function CharacterSheet(container, props = {}) {
    let state = props.state || {};
    let character = props.character || {};
    const CardService = props.services?.CardService;
    const meetsRequirements = props.services?.meetsRequirements || (() => true);
    const RULES = props.services?.RULES || {};
    const readOnly = !!(props.options && props.options.readOnly);
    const lockName = !!(props.options && props.options.lockName);

    // Initialize state.character with the passed character
    state.character = character;

    // Keep references to mounted components to avoid re-initialization
    let mountedComponents = {};
    // Call hooks.onBind each time setState runs so tabs/buttons are rebound after every re-render
    // (keeps backward-compat fallback variable for compatibility)
    let boundOnce = false;
    // Reentrancy guard to avoid notification loops when updateCharacter is invoked
    let suppressUpdateCharacter = false;

    const render = () => {
        return html`
            <div class="editor-header">
                ${readOnly || lockName
                    ? html`<div
                          class="name-input"
                          style="border:1px solid var(--border-color); border-radius: var(--radius-md); padding: .5rem .75rem; background:#fff;"
                      >
                          ${character.name || ''}
                      </div>`
                    : html`<input id="name" class="name-input" type="text" value="${character.name || ''}" />`}
            </div>
            <div class="tabs">
                <button class="tab ${state.tab === 'sheet' ? 'active' : ''}" data-tab="sheet">Hoja</button>
                <button class="tab ${state.tab === 'cards' ? 'active' : ''}" data-tab="cards">Cartas</button>
                ${readOnly
                    ? ''
                    : html`<button class="tab ${state.tab === 'notes' ? 'active' : ''}" data-tab="notes">
                          Notas
                      </button>`}
                <button class="tab ${state.tab === 'bio' ? 'active' : ''}" data-tab="bio">Bio</button>
                ${readOnly
                    ? ''
                    : html`<button class="tab ${state.tab === 'config' ? 'active' : ''}" data-tab="config">
                          Configuración
                      </button>`}
                ${readOnly
                    ? ''
                    : html`<button class="tab ${state.tab === 'progress' ? 'active' : ''}" data-tab="progress">
                          Progreso
                      </button>`}
                <span class="tab-spacer"></span>
                <button class="tab ${state.tab === 'dice' ? 'active' : ''} tab-right" data-tab="dice">Dados</button>
            </div>
            ${state.tab === 'sheet'
                ? html`<div id="sheet-tab-container"></div>`
                : state.tab === 'cards'
                  ? html`<div id="cards-tab-container"></div>`
                  : state.tab === 'config'
                    ? html`<div id="config-tab-container"></div>`
                    : state.tab === 'bio'
                      ? html`<div id="bio-tab-container"></div>`
                      : state.tab === 'progress'
                        ? html`<div id="progress-tab-container"></div>`
                        : state.tab === 'dice'
                          ? html`<div id="dice-tab-container"></div>`
                          : html`<div id="notes-tab-container"></div>`}
        `;
    };

    const mountTabComponents = async () => {
        try {
            if (state.tab === 'sheet') {
                const tabContainer = container.querySelector('#sheet-tab-container');
                if (tabContainer) {
                    if (!mountedComponents.sheet) {
                        const comp = SheetTab(tabContainer, {
                            character: state.character,
                            derived: props.derived,
                            rules: props.rules,
                            readOnly: readOnly,
                            onUpdate: (updatedCharacter) => {
                                state.character = updatedCharacter;
                                if (props.onUpdate) props.onUpdate(updatedCharacter);
                            },
                            onRoll: (rollData) => {
                                // Forward roll events to parent if provided. Keep it safe.
                                if (typeof props.onRoll === 'function') {
                                    try {
                                        props.onRoll(rollData);
                                    } catch (_) {
                                        // swallow to avoid breaking sheet interactions
                                    }
                                }
                            },
                        });
                        await comp.init();
                        mountedComponents.sheet = comp;
                    } else {
                        // Update existing component with new data
                        await mountedComponents.sheet.setState({
                            character: state.character,
                            derived: props.derived,
                            rules: props.rules,
                            readOnly: readOnly,
                        });
                    }
                }
            } else if (state.tab === 'cards') {
                const tabContainer = container.querySelector('#cards-tab-container');
                if (tabContainer) {
                    if (!mountedComponents.cards) {
                        const comp = CardsTab(tabContainer, {
                            character: state.character,
                            state: props.state,
                            cardService: CardService,
                            meetsRequirements: meetsRequirements,
                            readOnly: readOnly,
                            onUpdate: (updatedCharacter) => {
                                state.character = updatedCharacter;
                                if (props.onUpdate) props.onUpdate(updatedCharacter);
                            },
                            onStateUpdate: (updatedState) => {
                                // Update the global state
                                Object.assign(props.state, updatedState);
                                if (props.onStateUpdate) props.onStateUpdate(updatedState);
                            },
                        });
                        await comp.init();
                        mountedComponents.cards = comp;
                    } else {
                        // Update existing component with new data
                        mountedComponents.cards.update();
                    }
                }
            } else if (state.tab === 'config') {
                const tabContainer = container.querySelector('#config-tab-container');
                if (tabContainer) {
                    const comp = ConfigTab(tabContainer, {
                        character: state.character,
                        derived: props.derived,
                        allowedFields: props.allowedFields,
                        onUpdate: (updatedCharacter) => {
                            state.character = updatedCharacter;
                            if (props.onUpdate) props.onUpdate(updatedCharacter);
                        },
                    });
                    await comp.init();
                }
            } else if (state.tab === 'bio') {
                const tabContainer = container.querySelector('#bio-tab-container');
                if (tabContainer) {
                    const comp = BioTab(tabContainer, {
                        character: state.character,
                        readOnly: props.readOnly,
                        onUpdate: (updatedCharacter) => {
                            state.character = updatedCharacter;
                            if (props.onUpdate) props.onUpdate(updatedCharacter);
                        },
                    });
                    await comp.init();
                }
            } else if (state.tab === 'progress') {
                const tabContainer = container.querySelector('#progress-tab-container');
                if (tabContainer) {
                    const comp = ProgressTab(tabContainer, {
                        character: state.character,
                        onUpdate: (updatedCharacter) => {
                            state.character = updatedCharacter;
                            if (props.onUpdate) props.onUpdate(updatedCharacter);
                        },
                    });
                    await comp.init();
                }
            } else if (state.tab === 'dice') {
                const tabContainer = container.querySelector('#dice-tab-container');
                if (tabContainer) {
                    const comp = DiceTab(tabContainer, {
                        character: state.character,
                        onRoll: (rollData) => {
                            if (props.onRoll) props.onRoll(rollData);
                        },
                    });
                    await comp.init();
                }
            } else if (state.tab === 'notes') {
                const tabContainer = container.querySelector('#notes-tab-container');
                if (tabContainer) {
                    const comp = NotesTab(tabContainer, {
                        character: state.character,
                        readOnly: readOnly,
                        onUpdate: (updatedCharacter) => {
                            state.character = updatedCharacter;
                            if (props.onUpdate) props.onUpdate(updatedCharacter);
                        },
                    });
                    await comp.init();
                }
            }
        } catch (error) {
            console.error('Error mounting tab component:', error);
        }
    };

    const setState = async (partial) => {
        state = { ...state, ...partial };
        container.innerHTML = render();
        // Always call hooks.onBind on every setState so tab buttons and per-tab mount logic
        // are rebound after the DOM is re-rendered. This ensures clicking a tab from any parent
        // context (e.g., Encounter manager) rebinds the tab buttons and their handlers.
        if (props.hooks && typeof props.hooks.onBind === 'function') {
            try {
                props.hooks.onBind(container);
            } catch (_) {}
        }
        // Wait for DOM to be ready before mounting components
        await new Promise((resolve) => requestAnimationFrame(resolve));

        // Destroy any previously mounted subcomponents before mounting new ones.
        // This avoids stale mounts keeping old DOM references/listeners and ensures
        // each tab mount starts from a clean state.
        try {
            for (const key in mountedComponents) {
                const comp = mountedComponents[key];
                if (comp && typeof comp.destroy === 'function') {
                    try {
                        comp.destroy();
                    } catch (_) {
                        // ignore destroy errors for safety
                    }
                }
            }
        } catch (_) {}
        // Clear references so mountTabComponents creates fresh instances
        mountedComponents = {};

        await mountTabComponents();
    };

    return {
        init: () => setState({}),
        setState,

        /**
         * updateCharacter(partial) - delegate character partial updates to the mounted SheetTab
         * This allows parent pages to patch small pieces of state (gold, luck, rollLog, hp, etc.)
         * without forcing a full re-render of the tab container.
         */
        updateCharacter(partial = {}) {
            if (!partial || typeof partial !== 'object') return;
            // Avoid re-entrant calls: if we're already processing an updateCharacter,
            // skip to prevent notification loops.
            if (suppressUpdateCharacter) return;
            suppressUpdateCharacter = true;
            try {
                // If the underlying mounted SheetTab exposes an updateCharacter API, use it.
                if (mountedComponents.sheet && typeof mountedComponents.sheet.updateCharacter === 'function') {
                    try {
                        mountedComponents.sheet.updateCharacter(partial);
                        return;
                    } catch (e) {
                        // fallthrough to setState fallback
                    }
                }
                // Fallback: patch SheetTab via setState to update character subcomponents.
                if (mountedComponents.sheet && typeof mountedComponents.sheet.setState === 'function') {
                    try {
                        const patched = { character: { ...state.character, ...partial } };
                        mountedComponents.sheet.setState(patched);
                    } catch (e) {
                        // Last resort: trigger full setState of this component to keep consistency
                        setState({ character: { ...state.character, ...partial } });
                    }
                } else {
                    // If sheet isn't mounted, update local state so future mounts render correct data.
                    state.character = { ...state.character, ...partial };
                }
            } finally {
                suppressUpdateCharacter = false;
            }
        },

        /**
         * updateDerived(partialDerived) - update derived stats only (salud, velocidad, esquiva, nd, suerteMax...)
         * Delegates to mounted sheet's updateDerived if present, otherwise tries to patch via setState.
         */
        updateDerived(partialDerived = {}) {
            if (!partialDerived || typeof partialDerived !== 'object') return;
            // If the mounted SheetTab exposes updateDerived use it.
            if (mountedComponents.sheet && typeof mountedComponents.sheet.updateDerived === 'function') {
                try {
                    mountedComponents.sheet.updateDerived(partialDerived);
                    return;
                } catch (e) {
                    // fallthrough to setState fallback
                }
            }
            // Fallback to updating local derived state and patching the sheet via setState
            state.derived = { ...state.derived, ...partialDerived };
            if (mountedComponents.sheet && typeof mountedComponents.sheet.setState === 'function') {
                try {
                    mountedComponents.sheet.setState({ derived: state.derived });
                } catch (e) {
                    // Last resort: full re-render
                    setState({ derived: state.derived });
                }
            }
        },
    };
}
