const html = window.html || String.raw;
import HistoryList from '../../components/HistoryList/HistoryList.js';
import { ensureStyle } from '../../utils/style-utils.js';

const DiceTabController = (root, props = {}) => {
    const character = props.character || {};
    const onRoll = typeof props.onRoll === 'function' ? props.onRoll : () => {};
    const attributes = character && character.attributes ? character.attributes : {};

    const bindEvents = (tab) => {
        if (!tab) return;
        tab.addEventListener('click', (e) => {
            const btn = e.target && e.target.closest && e.target.closest('[data-dice]');
            const delBtn = e.target && e.target.closest && e.target.closest('[data-dice-del]');
            const clearBtn = e.target && e.target.closest && e.target.closest('[data-dice-clear]');
            if (clearBtn) {
                character.rollLog = [];
                renderHistory();
                return;
            }
            if (delBtn) {
                const ts = Number(delBtn.getAttribute('data-dice-del'));
                character.rollLog = (character.rollLog || []).filter((x) => x.ts !== ts);
                renderHistory();
                return;
            }
            if (btn) {
                const notation = btn.getAttribute('data-dice');
                const m = notation.match(/^(\d*)d(\d+)$/i);
                if (!m) return;
                const n = Math.max(1, Number(m[1] || 1));
                const faces = Number(m[2] || 0);
                if (!faces) return;
                const rolls = [];
                let sum = 0;
                for (let i = 0; i < n; i++) {
                    const r = 1 + Math.floor(Math.random() * faces);
                    rolls.push(r);
                    sum += r;
                }
                character.rollLog = Array.isArray(character.rollLog) ? character.rollLog : [];
                const entry = {
                    type: 'dice',
                    ts: Date.now(),
                    notation: notation.toLowerCase(),
                    rolls,
                    total: sum,
                    details: { parts: [{ type: 'dice', notation: notation.toLowerCase(), rolls, sum, sign: 1 }] },
                };
                character.rollLog.unshift(entry);
                if (character.rollLog.length > 200) character.rollLog.length = 200;
                try {
                    onRoll(entry);
                } catch (_) {}
                renderHistory();
            }
        });
        const varsHost = tab.querySelector('#dice-vars');
        if (varsHost) {
            const allowed = ['cuerpo', 'reflejos', 'mente', 'instinto', 'presencia', 'esquiva', 'mitigacion', 'suerte'];
            varsHost.innerHTML = `Variables: ${allowed.map((k) => '`' + k + '`').join(', ')}`;
        }
        const doExprRoll = () => {
            const exprInp = tab.querySelector('#dice-expr');
            const expr = String(exprInp && exprInp.value ? exprInp.value : '').trim();
            if (!expr) return;
            const { total, parts } = evaluateDiceExpression(expr, attributes, character);
            character.rollLog = Array.isArray(character.rollLog) ? character.rollLog : [];
            const entry = {
                type: 'dice',
                ts: Date.now(),
                notation: expr.toLowerCase(),
                rolls: parts.flatMap((p) => p.rolls || []),
                total,
                details: { parts },
            };
            character.rollLog.unshift(entry);
            if (character.rollLog.length > 200) character.rollLog.length = 200;
            try {
                onRoll(entry);
            } catch (_) {}
            renderHistory();
            if (exprInp) {
                exprInp.value = '';
                exprInp.focus();
            }
        };
        const exprBtn = tab.querySelector('#dice-expr-roll');
        if (exprBtn) exprBtn.addEventListener('click', doExprRoll);
        const exprInp = tab.querySelector('#dice-expr');
        if (exprInp)
            exprInp.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    doExprRoll();
                }
            });
    };

    const renderHistory = () => {
        try {
            const host = root.querySelector('#dice-history');
            if (!host) return;
            const items = (character.rollLog || []).slice(0, 100);
            const renderItem = (r) => {
                if (r.type === 'attr') {
                    const d = r.details || {};
                    const advLabel = d.advantage && d.advantage !== 'normal' ? `, ${d.advantage}=${d.advMod}` : '';
                    return html`<div class="dice-line" data-ts="${r.ts}">
                        <span class="dice-entry"
                            >[Atributo] ${r.attr}: ${r.total} (1d6=${d.d6}${advLabel}, base=${d.base}, mods=${d.extras},
                            suerte=${d.luck})</span
                        ><button class="button" data-dice-del="${r.ts}" title="Eliminar">🗑️</button>
                    </div>`;
                }
                const breakdown = formatParts(r.details && r.details.parts);
                return html`<div class="dice-line" data-ts="${r.ts}">
                    <span class="dice-entry"
                        >[Dados] ${r.notation} = ${r.total}${breakdown ? html` (${breakdown})` : ''}</span
                    ><button class="button" data-dice-del="${r.ts}" title="Eliminar">🗑️</button>
                </div>`;
            };
            const list = HistoryList(host, { items, renderItem, wrap: false });
            list.init();
        } catch (_) {}
    };

    return {
        init() {
            ensureStyle('./src/components/DiceTab/DiceTabController.css');
            const tab = root.querySelector('.dice-tab');
            if (!tab) return;
            bindEvents(tab);
            renderHistory();
        },
    };
};

export default DiceTabController;
// Expose for dynamic usage in pages that can't import async
if (typeof window !== 'undefined') {
    window.__diceTabController = DiceTabController;
}

// Simple dice expression evaluator supporting: NdM, +, -, integers, and variables
function evaluateDiceExpression(expr, attributes = {}, character = {}) {
    const cleaned = expr.replace(/\s+/g, '').toLowerCase();
    const tokens = cleaned.match(/(\+|\-|\d+d\d+|\d+|[a-zA-Z_][a-zA-Z0-9_]*)/g) || [];
    let sign = 1;
    let total = 0;
    const parts = [];
    const resolveVar = (name) => {
        const map = attributes || {};
        const lower = String(name).toLowerCase();
        // direct attributes (case-insensitive) or explicit spanish names
        const attrNameMap = {
            cuerpo: 'Cuerpo',
            reflejos: 'Reflejos',
            mente: 'Mente',
            instinto: 'Instinto',
            presencia: 'Presencia',
        };
        if (attrNameMap[lower]) {
            const v = map[attrNameMap[lower]];
            if (v != null) return Number(v) || 0;
        }
        const key = Object.keys(map).find((k) => String(k).toLowerCase() === lower);
        if (key) return Number(map[key]) || 0;
        if (lower === 'suerte') return Number(character && character.suerte) || 0;
        if (lower === 'esquiva') {
            const v =
                (character && character.stats && character.stats.esquiva && character.stats.esquiva.value) ??
                character.esquiva;
            return Number(v) || 0;
        }
        if (lower === 'mitigacion' || lower === 'mitigación') {
            const v =
                character.mitigacion ??
                (character && character.stats && character.stats.mitigacion && character.stats.mitigacion.value);
            return Number(v) || 0;
        }
        return 0;
    };
    for (const t of tokens) {
        if (t === '+') {
            sign = 1;
            continue;
        }
        if (t === '-') {
            sign = -1;
            continue;
        }
        if (/^\d+d\d+$/.test(t)) {
            const [nStr, fStr] = t.split('d');
            const n = Math.max(1, Number(nStr) || 1);
            const f = Math.max(2, Number(fStr) || 2);
            const rolls = [];
            let sum = 0;
            for (let i = 0; i < n; i++) {
                const r = 1 + Math.floor(Math.random() * f);
                rolls.push(r);
                sum += r;
            }
            total += sign * sum;
            parts.push({ type: 'dice', notation: t, rolls, sum, sign });
            continue;
        }
        if (/^\d+$/.test(t)) {
            total += sign * Number(t);
            parts.push({ type: 'num', value: Number(t), sign });
            continue;
        }
        // var
        const v = resolveVar(t);
        total += sign * v;
        parts.push({ type: 'var', name: t, value: v, sign });
    }
    return { total, parts };
}

function formatParts(parts) {
    try {
        if (!Array.isArray(parts) || parts.length === 0) return '';
        const s = parts
            .map((p) => {
                const sign = p.sign === -1 ? '-' : '';
                if (p.type === 'dice') {
                    const rolls = Array.isArray(p.rolls) ? `[${p.rolls.join(', ')}]` : '';
                    return `${sign}${p.notation}=${rolls ? `${rolls} => ` : ''}${p.sum}`;
                }
                if (p.type === 'var') {
                    return `${sign}${p.name}=${p.value}`;
                }
                if (p.type === 'num') {
                    return `${sign}${p.value}`;
                }
                return '';
            })
            .filter(Boolean)
            .join(', ');
        return s;
    } catch (_) {
        return '';
    }
}
