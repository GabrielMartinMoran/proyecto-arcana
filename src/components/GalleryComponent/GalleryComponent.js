const html = window.html || String.raw;
import { ensureStyle } from '../../utils/style-utils.js';
import CardComponent from "../CardComponent/CardComponent.js";

/**
 * GalleryComponent - Grid of cards
 * @param {HTMLElement} container
 * @param {{ cards: any[], onCardClick?: (card:any)=>void }} props
 */
const GalleryComponent = (container, props = {}) => {
    const loadStyles = () => { ensureStyle('./src/components/GalleryComponent/GalleryComponent.css'); };

    let state = {
        cards: Array.isArray(props.cards) ? props.cards : [],
        onCardClick: typeof props.onCardClick === "function" ? props.onCardClick : () => {}
    };

    const render = () => html`
        <div class="grid" data-testid="gallery-grid">
            ${state.cards.map((c) => html`<div class="grid-item" data-id="${c.id}"></div>`).join("")}
        </div>
    `;

    const mountCards = () => {
        for (const c of state.cards) {
            const slot = container.querySelector(`.grid-item[data-id="${c.id}"]`);
            if (!slot) continue;
            const card = CardComponent(slot, { card: c, onClick: state.onCardClick });
            card.init();
        }
    };

    const setState = (partial) => {
        state = { ...state, ...partial };
        container.innerHTML = render();
        mountCards();
    };

    return { init: () => { loadStyles(); setState({}); }, setState };
};

export default GalleryComponent;


