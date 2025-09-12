// --- Script para convertir bestiary.yml a bestiary.md ---
// Este script lee un archivo YAML con el bestiario de ARCANA
// y lo convierte en un archivo Markdown formateado similar al render de la web.

// Requisitos: Node.js y el paquete 'js-yaml'
// Para instalar: npm install js-yaml

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

// --- CONFIGURACIÓN ---
const inputFile = path.join(__dirname, '../config/bestiary.yml');
const outDir = path.join(__dirname, './out');
const outputFile = path.join(outDir, 'bestiary.md');

function ensureOutDir() {
    if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
}

function safeStr(v) {
    if (v == null) return '';
    return String(v);
}

function formatUses(uses) {
    if (!uses || typeof uses !== 'object') return '';
    const type = String(uses.type || '').toUpperCase();
    const qty = Number(uses.qty) || 0;
    if (type === 'RELOAD') return `Recarga ${qty}+`;
    if (type === 'USES') return `${qty} ${qty === 1 ? 'uso' : 'usos'}`;
    return '';
}

function formatAttributes(attrs = {}) {
    return `**Atributos:** Cuerpo ${attrs.cuerpo ?? ''}, Reflejos ${attrs.reflejos ?? ''}, Mente ${attrs.mente ?? ''}, Instinto ${
        attrs.instinto ?? ''
    }, Presencia ${attrs.presencia ?? ''}`;
}

function formatStats(stats = {}) {
    const esquivaNote = stats.esquiva && stats.esquiva.note ? ` (${safeStr(stats.esquiva.note)})` : '';
    const mitigNote = stats.mitigacion && stats.mitigacion.note ? ` (${safeStr(stats.mitigacion.note)})` : '';
    return `**Salud:** ${stats.salud ?? ''} | **Esquiva:** ${stats.esquiva ? stats.esquiva.value ?? '' : ''}${esquivaNote} | **Mitigación:** ${
        stats.mitigacion ? stats.mitigacion.value ?? '' : ''
    }${mitigNote}`;
}

function formatLanguages(langs) {
    if (!Array.isArray(langs) || !langs.length) return '';
    return `**Lenguas:** ${langs.join(', ')}`;
}

function formatAttacks(attacks) {
    if (!Array.isArray(attacks) || !attacks.length) return '';
    const lines = attacks.map((a) => {
        const note = a.note ? ` — ${safeStr(a.note)}` : '';
        return `- ${safeStr(a.name)}: +${Number(a.bonus) || 0} (${safeStr(a.damage)})${note}`;
    });
    return [`**Ataques:**`, ...lines].join('\n');
}

function formatPairs(title, items) {
    if (!Array.isArray(items) || !items.length) return '';
    const lines = items.map((x) => `- ${safeStr(x.name)}: ${safeStr(x.detail || x.note || '')}`);
    return [`**${title}:**`, ...lines].join('\n');
}

function formatActions(actions) {
    if (!Array.isArray(actions) || !actions.length) return '';
    const lines = actions.map((a) => {
        const uses = formatUses(a.uses);
        const usesPart = uses ? ` (${uses})` : '';
        return `- ${safeStr(a.name)}${usesPart}: ${safeStr(a.detail || '')}`;
    });
    return [`**Acciones:**`, ...lines].join('\n');
}

function renderCreatureMd(c) {
    const parts = [];
    parts.push(`## ${safeStr(c.name)}`);
    parts.push('');
    parts.push(`**NA:** ${c.na ?? ''}`);
    parts.push('');
    parts.push(formatAttributes(c.attributes || {}));
    parts.push('');
    parts.push(formatStats(c.stats || {}));
    const langs = formatLanguages(c.languages || []);
    if (langs) {
        parts.push('');
        parts.push(langs);
    }
    const attacks = formatAttacks(c.attacks || []);
    if (attacks) {
        parts.push('');
        parts.push(attacks);
    }
    const traits = formatPairs('Rasgos', c.traits || []);
    if (traits) {
        parts.push('');
        parts.push(traits);
    }
    const actions = formatActions(c.actions || []);
    if (actions) {
        parts.push('');
        parts.push(actions);
    }
    const reactions = formatPairs('Reacciones', c.reactions || []);
    if (reactions) {
        parts.push('');
        parts.push(reactions);
    }
    if (c.behavior) {
        parts.push('');
        parts.push(`**Comportamiento:**`);
        parts.push(safeStr(c.behavior).trim());
    }
    parts.push('\n---\n');
    return parts.join('\n');
}

function generateMarkdown() {
    try {
        console.log(`Leyendo archivo de entrada: ${inputFile}...`);
        const fileContents = fs.readFileSync(inputFile, 'utf8');
        const data = yaml.load(fileContents);

        if (!data || !Array.isArray(data.creatures)) {
            throw new Error(
                "El archivo YAML está vacío o no tiene el formato esperado (debe tener una clave 'creatures' en la raíz)."
            );
        }

        const creatures = (data.creatures || []).slice().sort((a, b) => {
            const naA = Number(a.na) || 0;
            const naB = Number(b.na) || 0;
            if (naA !== naB) return naA - naB;
            const nameA = (a.name || '').toString().toLowerCase().normalize('NFD').replace(/[^a-z0-9]+/g, '');
            const nameB = (b.name || '').toString().toLowerCase().normalize('NFD').replace(/[^a-z0-9]+/g, '');
            return nameA.localeCompare(nameB);
        });
        let md = `# Bestiario de ARCANA\n\n`;
        creatures.forEach((c) => {
            md += renderCreatureMd(c) + '\n';
        });

        ensureOutDir();
        fs.writeFileSync(outputFile, md);
        console.log(`¡Éxito! Se generó ${outputFile} con ${creatures.length} criaturas.`);
    } catch (e) {
        console.error('Ha ocurrido un error durante la generación del archivo:');
        console.error(e);
        process.exitCode = 1;
    }
}

generateMarkdown();


