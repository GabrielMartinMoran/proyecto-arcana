// Simple dice and formula parser: supports numbers, + - * / parentheses, and dice NdM
export function rollDice(notation) {
    const m = String(notation)
        .trim()
        .match(/^(\d*)d(\d+)$/i);
    if (!m) return NaN;
    const n = Math.max(1, Number(m[1] || 1));
    const faces = Number(m[2] || 0);
    if (!faces) return NaN;
    let sum = 0;
    for (let i = 0; i < n; i++) sum += 1 + Math.floor(Math.random() * faces);
    return sum;
}

export function evalFormula(formula, vars = {}) {
    if (formula == null || formula === '') return 0;
    let expr = String(formula);
    // Replace dice occurrences with their roll results
    expr = expr.replace(/(\d*)d(\d+)/gi, (_, a, b) => String(rollDice(`${a || 1}d${b}`)));
    // Allowed variable names come from vars object
    const names = Object.keys(vars);
    const values = names.map((k) => Number(vars[k]) || 0);
    try {
        // eslint-disable-next-line no-new-func
        const fn = new Function(...names, `return (${expr});`);
        return Number(fn(...values)) || 0;
    } catch (e) {
        return 0;
    }
}

export function rollWithAdvantage(base, advantage = 'normal') {
    // Roll d20 with normal/advantage/disadvantage
    const r1 = 1 + Math.floor(Math.random() * 20);
    if (advantage === 'ventaja') {
        const r2 = 1 + Math.floor(Math.random() * 20);
        return Math.max(r1, r2);
    }
    if (advantage === 'desventaja') {
        const r2 = 1 + Math.floor(Math.random() * 20);
        return Math.min(r1, r2);
    }
    return r1;
}
