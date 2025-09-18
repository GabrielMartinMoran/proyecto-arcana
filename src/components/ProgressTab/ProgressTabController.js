const html = window.html || String.raw;
import HistoryList from '../../components/HistoryList/HistoryList.js';
import CharacterService from '../../services/character-service.js';
import { ensureStyle } from '../../utils/style-utils.js';

const ProgressTabController = (root, props = {}) => {
    const c = props.character || {};

    const bind = () => {
        const ppTab = root.querySelector('.pp-tab');
        if (!ppTab) return;
        ppTab.addEventListener('click', (e) => {
            const delBtn = e.target && e.target.closest && e.target.closest('[data-pp-del]');
            if (delBtn) {
                const ts = Number(delBtn.getAttribute('data-pp-del'));
                const hist = Array.isArray(c.ppHistory) ? c.ppHistory : [];
                const entry = hist.find((x) => x.ts === ts);
                if (entry) {
                    const amount = Math.max(0, Number(entry.amount) || 0);
                    const reason = String(entry.reason || '').trim();
                    const delta = entry.type === 'spend' ? `+${amount}` : `-${amount}`;
                    const ok = window.confirm(
                        `¿Deshacer movimiento de PP?\n\nCambio: ${delta}\nMotivo: ${reason || '(sin motivo)'}\n\nEsta acción revertirá el total actual.`
                    );
                    if (!ok) return;
                    CharacterService.undoPP(c, ts);
                    renderHistory();
                }
            }
        });
        renderHistory();
    };

    const renderHistory = () => {
        try {
            const host = root.querySelector('#pp-history');
            if (!host) return;
            const items = (c.ppHistory || []).slice(0, 200).sort((a, b) => Number(b.ts || 0) - Number(a.ts || 0));
            const renderItem = (h) => {
                const sign = h.type === 'spend' ? '-' : '+';
                const amt = Number(h.amount) || 0;
                const reason = (h.reason || '').toString();
                return html`<div class="dice-line" data-ts="${h.ts}">
                    <span class="dice-entry">[PP] ${sign}${amt} — ${reason}</span
                    ><button class="button" data-pp-del="${h.ts}" title="Deshacer">↩️</button>
                </div>`;
            };
            const list = HistoryList(host, { items, renderItem, wrap: false });
            list.init();
        } catch (_) {}
    };

    return {
        init: () => {
            ensureStyle('./src/components/ProgressTab/ProgressTabController.css');
            bind();
        },
    };
};

export default ProgressTabController;
