/**
 * proyecto-arcana/src/utils/damage-utils.js
 *
 * Utilities to parse and roll damage formulas in a robust, testable way.
 *
 * Exports:
 *  - parseDamageFormula(raw: string) => parts[]
 *  - rollDiceOnce(n, faces) => { rolls: number[], sum: number }
 *  - rollExplodingDice(n, faces) => { rolls: number[], sum: number }
 *  - evaluateDamageParts(parts, options?) => { total, partsResults, flatRolls, breakdown }
 *
 * Parts format:
 *  {
 *    kind: 'dice' | 'flat',
 *    sign: 1 | -1,
 *    n?: number,         // for dice
 *    faces?: number,     // for dice
 *    value?: number,     // for flat
 *    damageType?: string,
 *    raw: string
 *  }
 *
 * partsResults entry:
 *  {
 *    kind, sign, damageType, raw,
 *    // if dice:
 *    n, faces, rolls: [...], sum,
 *    // if flat:
 *    value
 *  }
 *
 * Options for evaluateDamageParts:
 *  - rollFn: function(n, faces) => { rolls: number[], sum: number } (default: rollDiceOnce)
 *  - explodeDice: boolean | function(part) => boolean (if true, uses exploding rule for dice)
 *
 * Notes:
 *  - Parser is intentionally simple and linear: supports sequences of + / - terms.
 *  - It tolerates spaces and common input forms like "1d6 Perforante" or "1d8 + 2 Contundente + 2d4 - 1 Perforante".
 *  - It does NOT evaluate parentheses or complex math expressions.
 */

export function parseDamageFormula(raw) {
    const out = [];
    if (!raw || !String(raw).trim()) return out;
    const s = String(raw).trim();

    // Normalize plus/minus spacing but preserve case for damageType.
    // Ensure uniform leading sign
    const norm = /^[+-]/.test(s) ? s : `+${s}`;

    // Regex to capture sequences: sign then all until next sign
    const tokenRe = /([+-])\s*([^+-]+)/g;
    let m;
    while ((m = tokenRe.exec(norm)) !== null) {
        const sign = m[1] === '+' ? 1 : -1;
        const term = (m[2] || '').trim();
        if (!term) continue;

        // Try dice at start: NdM or N d M
        const diceMatch = term.match(/^(\d+)\s*d\s*(\d+)/i);
        if (diceMatch) {
            const n = Number(diceMatch[1]);
            const faces = Number(diceMatch[2]);
            const rest = term.slice(diceMatch[0].length).trim();
            const damageType = rest || null;
            out.push({ kind: 'dice', sign, n, faces, damageType, raw: term });
            continue;
        }

        // Try flat number at start
        const numMatch = term.match(/^(\d+)/);
        if (numMatch) {
            const value = Number(numMatch[1]);
            const rest = term.slice(numMatch[0].length).trim();
            const damageType = rest || null;
            out.push({ kind: 'flat', sign, value, damageType, raw: term });
            continue;
        }

        // Fallback: try to find any dice anywhere
        const anyDice = term.match(/(\d+)\s*d\s*(\d+)/i);
        if (anyDice) {
            const n = Number(anyDice[1]);
            const faces = Number(anyDice[2]);
            const damageType = term.replace(anyDice[0], '').trim() || null;
            out.push({ kind: 'dice', sign, n, faces, damageType, raw: term });
            continue;
        }

        // Fallback: treat as "flat" label with zero numeric effect (keeps type information)
        out.push({ kind: 'flat', sign, value: 0, damageType: term || null, raw: term });
    }

    return out;
}

/** Roll N dice with F faces (non-exploding). */
export function rollDiceOnce(n, faces) {
    const rolls = [];
    let sum = 0;
    for (let i = 0; i < Math.max(0, Number(n) || 0); i++) {
        const r = 1 + Math.floor(Math.random() * Math.max(1, Number(faces) || 1));
        rolls.push(r);
        sum += r;
    }
    return { rolls, sum };
}

/** Roll N dice with faces, exploding on max (each die may produce multiple rolls). */
export function rollExplodingDice(n, faces) {
    const rolls = [];
    let sum = 0;
    for (let i = 0; i < Math.max(0, Number(n) || 0); i++) {
        let r = 1 + Math.floor(Math.random() * Math.max(1, Number(faces) || 1));
        rolls.push(r);
        sum += r;
        while (r === faces) {
            r = 1 + Math.floor(Math.random() * Math.max(1, Number(faces) || 1));
            rolls.push(r);
            sum += r;
        }
    }
    return { rolls, sum };
}

/**
 * Evaluate parsed parts into numeric total and detailed per-part results.
 * options:
 *   - rollFn(part): function(n,faces) => { rolls, sum } OR default rollDiceOnce
 *   - explodeDice: boolean | function(part) => boolean  (if true, use exploding dice roll)
 */
export function evaluateDamageParts(parts = [], options = {}) {
    const rollFn = options.rollFn || rollDiceOnce;
    const explodeOpt = options.explodeDice || false;

    const partsResults = [];
    let total = 0;

    for (const p of parts) {
        if (!p || !p.kind) continue;
        if (p.kind === 'dice') {
            const n = Number(p.n) || 0;
            const faces = Number(p.faces) || 0;
            // Decide whether to explode
            const shouldExplode = typeof explodeOpt === 'function' ? !!explodeOpt(p) : !!explodeOpt;
            const rollResult = shouldExplode
                ? rollExplodingDice(n, faces)
                : rollFn
                  ? rollFn(n, faces)
                  : rollDiceOnce(n, faces);
            const sum = Number(rollResult.sum) || 0;
            partsResults.push({
                kind: 'dice',
                sign: p.sign,
                n,
                faces,
                damageType: p.damageType || null,
                raw: p.raw || null,
                rolls: rollResult.rolls || [],
                sum,
            });
            total += p.sign * sum;
        } else if (p.kind === 'flat') {
            const v = Number(p.value || 0) || 0;
            partsResults.push({
                kind: 'flat',
                sign: p.sign,
                value: v,
                damageType: p.damageType || null,
                raw: p.raw || null,
            });
            total += p.sign * v;
        } else {
            // Unknown kind -> ignore but keep record
            partsResults.push({
                kind: p.kind,
                sign: p.sign || 1,
                damageType: p.damageType || null,
                raw: p.raw || null,
            });
        }
    }

    // Flatten all numeric rolls to simple array for toast display, if any
    const flatRolls = [];
    for (const pr of partsResults) {
        if (pr.rolls && Array.isArray(pr.rolls)) {
            flatRolls.push(...pr.rolls);
        }
    }

    const breakdown = partsResults
        .map((pr) => {
            if (pr.kind === 'dice') {
                const rollStr = (pr.rolls || []).join('+') || '';
                return `${pr.sign === -1 ? '-' : '+'}${pr.n}d${pr.faces}${pr.damageType ? ' ' + pr.damageType : ''} => ${rollStr}`;
            }
            if (pr.kind === 'flat') {
                return `${pr.sign === -1 ? '-' : '+'}${pr.value}${pr.damageType ? ' ' + pr.damageType : ''}`;
            }
            return `${pr.sign === -1 ? '-' : '+'}0 ${pr.damageType || ''}`;
        })
        .join(' ; ');

    return { total, partsResults, flatRolls, breakdown };
}

export default {
    parseDamageFormula,
    rollDiceOnce,
    rollExplodingDice,
    evaluateDamageParts,
};
