/**
 * Centralized rules/constants derived from the manual
 * Change numbers here to tweak balance without touching the UI
 */

export const RULES = {
    arquetipos: ['Infiltrador', 'Combatiente', 'Arcanista', 'Sacerdote', 'Druida', 'Barbaro'],

    attributesOrder: ['Cuerpo', 'Agilidad', 'Mente', 'Instinto', 'Presencia'],
    attributeMin: 1,
    attributeMax: 5,

    // Derived stats coefficients (editable)
    derived: {
        salud: { perCuerpo: 4 },
        velocidad: { base: 6, perAgilidad: 1 },
        esquiva: { perAgilidad: 2 },
    },
};

export function computeDerivedStats(attributes) {
    const a = attributes || {};
    const cuerpo = Number(a.Cuerpo) || 0;
    const agilidad = Number(a.Agilidad) || 0;
    const d = RULES.derived;
    const salud = d.salud.perCuerpo * cuerpo;
    const velocidad = d.velocidad.base + d.velocidad.perAgilidad * agilidad;
    const esquiva = d.esquiva.perAgilidad * agilidad;
    return { salud, velocidad, esquiva };
}

// --- Shared modifiers API ---
export const ALLOWED_MODIFIER_FIELDS = [
    'salud',
    'velocidad',
    'esquiva',
    'mitigacion',
    'ndMente',
    'ndInstinto',
    'suerteMax',
];

export function evaluateModifierExpression(expression, context) {
    if (!expression && expression !== 0) return 0;
    const expr = String(expression).trim();
    try {
        // Expose a safe, limited context
        const fn = new Function(
            'cuerpo',
            'agilidad',
            'mente',
            'instinto',
            'presencia',
            'salud',
            'velocidad',
            'esquiva',
            'ndMente',
            'ndInstinto',
            'suerteMax',
            'mitigacion',
            'pp',
            'gold',
            'Math',
            `return (${expr});`
        );
        return (
            Number(
                fn(
                    Number(context.cuerpo) || 0,
                    Number(context.agilidad) || 0,
                    Number(context.mente) || 0,
                    Number(context.instinto) || 0,
                    Number(context.presencia) || 0,
                    Number(context.salud) || 0,
                    Number(context.velocidad) || 0,
                    Number(context.esquiva) || 0,
                    Number(context.ndMente) || 0,
                    Number(context.ndInstinto) || 0,
                    Number(context.suerteMax) || 0,
                    Number(context.mitigacion) || 0,
                    Number(context.pp) || 0,
                    Number(context.gold) || 0,
                    Math
                )
            ) || 0
        );
    } catch (_) {
        return 0;
    }
}

export function applyModifiersToDerived(baseDerived, character) {
    const attrs = (character && character.attributes) || {};
    const ctx = {
        cuerpo: attrs.Cuerpo || 0,
        agilidad: attrs.Agilidad || 0,
        mente: attrs.Mente || 0,
        instinto: attrs.Instinto || 0,
        presencia: attrs.Presencia || 0,
        salud: baseDerived.salud,
        velocidad: baseDerived.velocidad,
        esquiva: baseDerived.esquiva,
        ndMente: baseDerived.ndMente,
        ndInstinto: baseDerived.ndInstinto,
        suerteMax: baseDerived.suerteMax,
        mitigacion: baseDerived.mitigacion,
        pp: (character && character.pp) || 0,
        gold: (character && character.gold) || 0,
    };
    const out = { ...baseDerived };
    const mods = Array.isArray(character && character.modifiers) ? character.modifiers : [];
    for (const m of mods) {
        if (!m || !ALLOWED_MODIFIER_FIELDS.includes(m.field)) continue;
        const mode = m.mode === 'set' ? 'set' : 'add';
        const delta = evaluateModifierExpression(m.expr ?? 0, ctx);
        if (mode === 'set') out[m.field] = delta;
        else out[m.field] = (Number(out[m.field]) || 0) + delta;
        // Update context for chained expressions
        ctx[m.field] = out[m.field];
    }
    return out;
}
