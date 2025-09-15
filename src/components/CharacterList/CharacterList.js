const html = window.html || String.raw;
import { ensureStyles } from '../../utils/style-utils.js';

/**
 * CharacterList: reusable sidebar list for characters
 * Props:
 * - items: array of characters (any shape)
 * - getId(item, index): string id (optional if selectedIndex is used)
 * - getName(item): string
 * - getPortraitUrl(item): string
 * - selectedId: string (optional)
 * - selectedIndex: number (optional)
 * - headerHtml: string (optional) - actions/header area
 * - onSelect(index, item): callback when an item is selected
 */
export default function CharacterList(container, props = {}) {
    const getId = props.getId || ((_, i) => String(i));
    const getName = props.getName || ((x) => x && x.name ? String(x.name) : 'Personaje');
    const getPortraitUrl = props.getPortraitUrl || ((x) => (x && x.portraitUrl) || '');

    const loadStyles = () => {
        ensureStyles(['./src/components/CharacterList/CharacterList.css']);
    };

    const render = () => {
        const items = Array.isArray(props.items) ? props.items : [];
        const selectedId = props.selectedId;
        const selectedIndex = typeof props.selectedIndex === 'number' ? props.selectedIndex : null;
        return html`
            <aside class="characters-list">
                <div class="list-header">${props.headerHtml || ''}</div>
                <ul class="items">
                    ${items
                        .map((item, idx) => {
                            const id = getId(item, idx);
                            const name = getName(item);
                            const url = getPortraitUrl(item);
                            const initial = (name || '?').trim().charAt(0).toUpperCase();
                            const active = selectedId ? selectedId === id : selectedIndex === idx;
                            return html`<li>
                                <button class="item ${active ? 'active' : ''}" data-idx="${idx}" data-id="${id}">
                                    <span class="avatar ${url ? '' : 'placeholder'}" aria-hidden="true">
                                        ${url ? html`<img src="${url}" alt="" referrerpolicy="no-referrer" />` : ''}
                                        <span class="initial">${initial}</span>
                                    </span>
                                    <span class="item-name">${name}</span>
                                </button>
                            </li>`;
                        })
                        .join('')}
                </ul>
            </aside>
        `;
    };

    const bind = () => {
        const itemsRoot = container.querySelector('.items');
        if (!itemsRoot) return;
        itemsRoot.querySelectorAll('.item').forEach((btn) => {
            btn.addEventListener('click', () => {
                const idx = Number(btn.getAttribute('data-idx')) || 0;
                const items = Array.isArray(props.items) ? props.items : [];
                const item = items[idx];
                if (props.onSelect) props.onSelect(idx, item);
            });
        });
    };

    const init = () => {
        loadStyles();
        container.innerHTML = render();
        bind();
    };

    const update = (nextProps = {}) => {
        Object.assign(props, nextProps);
        container.innerHTML = render();
        bind();
    };

    return { init, update };
}


