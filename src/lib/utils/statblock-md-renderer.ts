import type { Creature, CreatureAction, CreatureAttack, CreatureTrait } from '$lib/types/creature';
import type { Uses } from '$lib/types/uses';

export const renderStatblockMarkdown = (creature: Creature): string => {
	let md = ``;
	md += `# ${creature.name}\n\n`;
	md += `**NA:** ${creature.na}\n\n`;
	if (creature.behavior) {
		md += `**Comportamiento:** ${creature.behavior}\n\n`;
	}
	if (creature.languages && creature.languages.length > 0) {
		md += `**Lenguas:** ${creature.languages.join(', ')}\n\n`;
	}

	md += `## Atributos\n`;
	md += `- **Cuerpo:** ${creature.attributes.body}\n`;
	md += `- **Reflejos:** ${creature.attributes.reflexes}\n`;
	md += `- **Mente:** ${creature.attributes.mind}\n`;
	md += `- **Instinto:** ${creature.attributes.instinct}\n`;
	md += `- **Presencia:** ${creature.attributes.presence}\n\n`;

	md += `## Estadísticas\n`;
	md += `- **Salud Máxima:** ${creature.stats.maxHealth}\n`;
	md += `- **Exquiva:** ${creature.stats.evasion.value}${creature.stats.evasion.note ? ` (${creature.stats.evasion.note})` : ''}\n`;
	md += `- **Mitigación Física:** ${creature.stats.physicalMitigation.value}${creature.stats.physicalMitigation.note ? ` (${creature.stats.physicalMitigation.note})` : ''}\n`;
	md += `- **Mitigación Mágica:** ${creature.stats.magicalMitigation.value}${creature.stats.magicalMitigation.note ? ` (${creature.stats.magicalMitigation.note})` : ''}\n`;
	md += `- **Velocidad:** ${creature.stats.speed.value}${creature.stats.speed.note ? ` (${creature.stats.speed.note})` : ''}\n\n`;
	md += `- **Iniciativa:** ${creature.attributes.reflexes}\n\n`;

	if (creature.attacks && creature.attacks.length > 0) {
		md += `## Ataques\n`;
		creature.attacks.forEach((attack: CreatureAttack) => {
			md += `- **${attack.name}:** Modificador de ataque: +${attack.bonus}. Daño: ${attack.damage}${attack.note ? ` (${attack.note})` : ''}\n`;
		});
		md += `\n`;
	}

	if (creature.traits && creature.traits.length > 0) {
		md += `## Rasgos\n`;
		creature.traits.forEach((trait: CreatureTrait) => {
			md += `- **${trait.name}:** ${trait.detail}\n`;
		});
		md += `\n`;
	}

	if (creature.actions && creature.actions.length > 0) {
		md += `## Acciones\n`;
		creature.actions.forEach((action: CreatureAction) => {
			md += `- **${action.name}:** ${action.detail}${action.uses ? ` (Usos: ${formatUses(action.uses)})` : ''}\n`;
		});
		md += `\n`;
	}

	if (creature.reactions && creature.reactions.length > 0) {
		md += `## Reacciones\n`;
		creature.reactions.forEach((reaction: CreatureAction) => {
			md += `- **${reaction.name}:** ${reaction.detail}${reaction.uses ? ` (Usos: ${formatUses(reaction.uses)})` : ''}\n`;
		});
		md += `\n`;
	}

	return md;
};

const formatUses = (uses: Uses | null) => {
	switch (uses?.type) {
		case 'RELOAD':
			return `${uses.qty} [Recarga ${uses.qty}+]`;
		case 'USES':
		case 'LONG_REST':
			return `${uses.qty}`;
		default:
			return '';
	}
};
