const html = window.html || String.raw;
import { renderSheetTab } from './tabs/SheetTab.js';
import { renderCardsTab } from './tabs/CardsTab.js';
import { renderConfigTab } from './tabs/ConfigTab.js';
import { renderBioTab } from './tabs/BioTab.js';
import { renderProgressTab } from './tabs/ProgressTab.js';
import { renderDiceTab } from './tabs/DiceTab.js';
import { renderNotesTab } from './tabs/NotesTab.js';

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

    const render = () => {
        return html`
            <div class="editor-header">
                <input id="name" class="name-input" type="text" value="${character.name || ''}" ${readOnly ? 'disabled' : ''} />
            </div>
            <div class="tabs">
                <button class="tab ${state.tab === 'sheet' ? 'active' : ''}" data-tab="sheet">Hoja</button>
                <button class="tab ${state.tab === 'cards' ? 'active' : ''}" data-tab="cards">Cartas</button>
                ${readOnly ? '' : html`<button class="tab ${state.tab === 'notes' ? 'active' : ''}" data-tab="notes">Notas</button>`}
                <button class="tab ${state.tab === 'bio' ? 'active' : ''}" data-tab="bio">Bio</button>
                ${readOnly ? '' : html`<button class="tab ${state.tab === 'config' ? 'active' : ''}" data-tab="config">Configuración</button>`}
                ${readOnly ? '' : html`<button class="tab ${state.tab === 'progress' ? 'active' : ''}" data-tab="progress">Progreso</button>`}
                <span class="tab-spacer"></span>
                <button class="tab ${state.tab === 'dice' ? 'active' : ''} tab-right" data-tab="dice">Dados</button>
            </div>
            ${state.tab === 'sheet'
                ? renderSheetTab(character, props.derived, RULES, { readOnly })
                : state.tab === 'cards'
                ? renderCardsTab(character, state, CardService, meetsRequirements, { readOnly })
                : state.tab === 'config'
                ? renderConfigTab(character, props.derived, props.allowedFields)
                : state.tab === 'bio'
                ? renderBioTab(character, { readOnly })
                : state.tab === 'progress'
                ? renderProgressTab(character)
                : state.tab === 'dice'
                ? renderDiceTab()
                : renderNotesTab(character)}
        `;
    };

    const setState = (partial) => {
        state = { ...state, ...partial };
        container.innerHTML = render();
        if (props.hooks && typeof props.hooks.onBind === 'function') props.hooks.onBind(container);
    };

    return { init: () => setState({}), setState };
}


