// --- Script para convertir cards.yml a cards.md ---
// Este script lee un archivo YAML con la configuración de las cartas del juego ARCANA
// y lo convierte en un archivo Markdown formateado para una fácil lectura.

// Requisitos: Node.js y el paquete 'js-yaml'
// Para instalar: npm install js-yaml

const fs = require('fs');
const yaml = require('js-yaml');

// --- CONFIGURACIÓN ---
const inputFile = '../config/cards.yml';
const outputFile = './out/cards.md';

/**
 * Procesa el objeto 'reload' y devuelve una cadena de texto formateada para el cooldown.
 * @param {object} reloadObject - El objeto reload de la carta.
 * @returns {string} - La cadena de texto del cooldown.
 */
function formatUses(reloadObject) {
    // Si no hay objeto reload o el tipo es nulo/cantidad es 0, no hay cooldown.
    if (!reloadObject || !reloadObject.type || reloadObject.qty === 0) {
        return '—';
    }

    const { type, qty } = reloadObject;

    switch (type.toUpperCase()) {
        case 'ROLL':
            return `1 (Recarga ${qty}+)`;
        case 'LONG_REST':
            return `${qty} por día de descanso`;
        // Puedes añadir más tipos de cooldown aquí si los necesitas en el futuro
        // case 'COMBAT':
        //     const combatTimes = qty === 1 ? 'vez' : 'veces';
        //     return `${qty} ${combatTimes} por combate`;
        default:
            return '—';
    }
}

/**
 * Función principal que lee, procesa y escribe los archivos.
 */
function generateMarkdown() {
    try {
        console.log(`Leyendo archivo de entrada: ${inputFile}...`);
        const fileContents = fs.readFileSync(inputFile, 'utf8');
        const data = yaml.load(fileContents);

        if (!data || !data.cards) {
            throw new Error(
                "El archivo YAML está vacío o no tiene el formato esperado (debe tener una clave 'cards' en la raíz)."
            );
        }

        const cards = data.cards;
        let markdownContent = `# Compendio de Cartas de ARCANA\n\n`;

        // Itera sobre cada carta y la formatea
        for (const card of cards) {
            const usesString = formatUses(card.reload);
            const tagsString = card.tags ? card.tags.join(', ') : 'Ninguno';
            const requirementsString = card.requirements ? card.requirements.join(', ') : 'Ninguno';

            // trim() elimina espacios extra o saltos de línea en la descripción
            const description = card.description ? card.description.trim() : 'Sin descripción.';

            // Plantilla de Markdown para cada carta
            const cardMarkdown = `
### ${card.name}

**Nivel:** ${card.level} | **Tipo:** ${card.type} | **Tags:** ${tagsString}

**Requerimientos:** ${requirementsString}

**Descripción:** ${description}

**Usos:** ${usesString}

---\n\n`;

            markdownContent += cardMarkdown;
        }

        fs.writeFileSync(outputFile, markdownContent);
        console.log(`¡Éxito! Se ha generado el archivo ${outputFile} con ${cards.length} cartas.`);
    } catch (e) {
        console.error('Ha ocurrido un error durante la generación del archivo:');
        console.error(e);
    }
}

// Ejecuta la función principal
generateMarkdown();
