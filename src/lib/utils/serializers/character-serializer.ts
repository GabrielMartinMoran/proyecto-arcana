import type { Card } from '$lib/types/cards/card';
import type { Character } from '$lib/types/character';

export const serializeCharacterAsMD = (character: Character, cards: Card[]): string => {
	let md = '';

	md += `# ${character.name}\n\n`;

	md += `## Atributos\n`;
	md += `- **Cuerpo:** ${character.attributes.body}\n`;
	md += `- **Reflejos:** ${character.attributes.reflexes}\n`;
	md += `- **Mente:** ${character.attributes.mind}\n`;
	md += `- **Instinto:** ${character.attributes.instinct}\n`;
	md += `- **Presencia:** ${character.attributes.presence}\n\n`;
	md += `- **Suerte:** ${character.currentLuck}/${character.maxLuck}\n`;
	md += '\n';

	md += `## Atributos derivados\n`;
	md += `- **Salud:** ${character.currentHP}/${character.maxHP}\n`;
	md += `- **Salud Temporal:** ${character.tempHP}\n`;
	md += `- **Velocidad:** ${character.speed}\n`;
	md += `- **Esquiva:** ${character.evasion}\n`;
	md += `- **Mitigación Física:** ${character.physicalMitigation}\n`;
	md += `- **Mitigación Mágica:** ${character.magicalMitigation}\n`;
	md += `- **Iniciativa:** ${character.initiative}\n`;
	md += '\n';

	if (character.quickInfo) {
		md += `## Información Rápida\n`;
		md += `\`\`\`${character.quickInfo}\n\`\`\`\n`;
		md += '\n';
	}

	md += `## Lenguas\n`;
	md += `${character.languages || '-'}\n`;
	md += '\n';

	md += `## Oro\n`;
	md += `${character.currentGold}\n`;
	md += '\n';

	md += `## Inventario\n`;
	if (character.equipment.length > 0) {
		md += '| Cantidad | Nombre | Notas |\n';
		md += '| - | - | - |\n';
		for (const item of character.equipment) {
			md += `| ${item.quantity} | ${item.name} | ${item.notes} |\n`;
		}
	} else {
		md += `__No hay items en el inventario.__\n`;
	}
	md += '\n';

	md += `## Cartas\n`;
	md += `**Cartas activas:** ${character.numActiveCards}${character.maxActiveCards}\n`;
	md += `### Colección\n`;
	if (character.cards.length > 0) {
		md += '| Nombre | Tipo | Activa |\n';
		md += '| - | - | - |\n';
		for (const playerCard of character.cards) {
			const card = cards.find((x) => x.id === playerCard.id);
			if (!card) continue;
			md += `| ${card.name} | ${card.cardType === 'item' ? 'Objeto Mágico' : 'Habilidad'} | ${playerCard.isActive ? 'Si' : 'No'} |\n`;
		}
	} else {
		md += '__No hay cartas en la colección.__\n';
	}
	md += '\n';

	md += `## Progreso\n`;
	md += `- **PP Actuales:** ${character.currentPP}\n`;
	md += `- **PP Gastados:** ${character.spentPP}\n`;
	md += `- **Poder de Personaje:** ${character.pjPower}\n`;
	md += '\n';

	if (character.story) {
		md += `## Historia\n`;
		md += `${character.story}\n`;
		md += '\n';
	}

	if (character.notes.length > 0) {
		md += `## Notas del Jugador\n`;
		for (const note of character.notes) {
			md += `### ${note.title}\n`;
			md += `\`\`\`${note.content}\`\`\`\n`;
		}
		md += '\n';
	}

	return md;
};
