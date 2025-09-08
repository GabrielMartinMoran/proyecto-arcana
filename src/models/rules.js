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
