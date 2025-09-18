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

/**
 * Roll exploding dice (6s explode for d6, max value explodes for other dice)
 * @param {string} notation - Dice notation (e.g., "1d6", "2d4")
 * @returns {Object} { total, rolls } - Total value and array of individual rolls
 */
export function rollExplodingDice(notation) {
    const m = String(notation)
        .trim()
        .match(/^(\d*)d(\d+)$/i);
    if (!m) return { total: NaN, rolls: [] };

    const n = Math.max(1, Number(m[1] || 1));
    const faces = Number(m[2] || 0);
    if (!faces) return { total: NaN, rolls: [] };

    const allRolls = [];
    let total = 0;

    for (let i = 0; i < n; i++) {
        const diceRolls = [];
        let currentRoll = 1 + Math.floor(Math.random() * faces);
        diceRolls.push(currentRoll);
        total += currentRoll;

        // Keep rolling while we get max value (6 for d6, faces for other dice)
        while (currentRoll === faces) {
            currentRoll = 1 + Math.floor(Math.random() * faces);
            diceRolls.push(currentRoll);
            total += currentRoll;
        }

        allRolls.push(...diceRolls);
    }

    return { total, rolls: allRolls };
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

/**
 * Evaluate formula with explosive dice support
 * @param {string} formula - Formula with explosive dice notation (e.g., "1d6e+cuerpo+1d4")
 * @param {Object} vars - Variables object
 * @returns {Object} { total, parts } - Total result and breakdown of parts
 */
export function evaluateDiceExpression(formula, vars = {}) {
    if (formula == null || formula === '') return { total: 0, parts: [] };

    let expr = String(formula);
    const parts = [];

    // Replace explosive dice occurrences with their roll results (must be first!)
    expr = expr.replace(/(\d*)d(\d+)e/gi, (match, a, b) => {
        const notation = `${a || 1}d${b}`;
        const { total, rolls } = rollExplodingDice(notation);
        parts.push({
            type: 'dice',
            notation: match, // Keep the original notation with 'e'
            rolls: rolls,
            sum: total,
            sign: 1,
        });
        return String(total);
    });

    // Replace normal dice occurrences with their roll results (must be after explosive dice)
    expr = expr.replace(/(\d*)d(\d+)/gi, (match, a, b) => {
        const notation = `${a || 1}d${b}`;
        const result = rollDice(notation);
        parts.push({
            type: 'dice',
            notation: notation,
            rolls: [result],
            sum: result,
            sign: 1,
        });
        return String(result);
    });

    // Allowed variable names come from vars object
    const names = Object.keys(vars);
    const values = names.map((k) => Number(vars[k]) || 0);

    try {
        // eslint-disable-next-line no-new-func
        const fn = new Function(...names, `return (${expr});`);
        const total = Number(fn(...values)) || 0;
        return { total, parts };
    } catch (e) {
        return { total: 0, parts };
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
