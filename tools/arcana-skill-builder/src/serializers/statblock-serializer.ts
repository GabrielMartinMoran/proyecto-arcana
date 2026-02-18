import type { Uses } from '../types/card.js';
import type { Creature, CreatureAction, CreatureAttack, CreatureTrait } from '../types/creature.js';

export const serializeStatblockAsMD = (creature: Creature): string => {
	let md = ``;
	md += `# ${creature.name}\n\n`;
	md += `**Linaje:** ${creature.lineage}\n\n`;
	md += `**Rango:** ${creature.tier}\n\n`;
	if (creature.behavior) {
		md += `**Comportamiento:** ${creature.behavior}\n\n`;
	}
	if (creature.languages && creature.languages.length > 0) {
		md += `**Lenguas:** ${creature.languages.join(', ')}\n\n`;
	} else {
		md += `**Lenguas:** Ninguna\n\n`;
	}

	md += `## Atributos\n`;
	md += `- **Cuerpo:** ${creature.attributes.body}\n`;
	md += `- **Reflejos:** ${creature.attributes.reflexes}\n`;
	md += `- **Mente:** ${creature.attributes.mind}\n`;
	md += `- **Instinto:** ${creature.attributes.instinct}\n`;
	md += `- **Presencia:** ${creature.attributes.presence}\n\n`;

	md += `## Estadísticas\n`;
	md += `- **Salud Máxima:** ${creature.stats.maxHealth}\n`;
	md += `- **Esquiva:** ${creature.stats.evasion.value}${creature.stats.evasion.note ? ` (${creature.stats.evasion.note})` : ''}\n`;
	md += `- **Mitigación Física:** ${creature.stats.physicalMitigation.value}${creature.stats.physicalMitigation.note ? ` (${creature.stats.physicalMitigation.note})` : ''}\n`;
	md += `- **Mitigación Mágica:** ${creature.stats.magicalMitigation.value}${creature.stats.magicalMitigation.note ? ` (${creature.stats.magicalMitigation.note})` : ''}\n`;
	md += `- **Velocidad:** ${creature.stats.speed.value}${creature.stats.speed.note ? ` (${creature.stats.speed.note})` : ''}\n`;
	md += `- **Iniciativa:** ${creature.attributes.reflexes}\n\n`;

	if (creature.attacks && creature.attacks.length > 0) {
		md += `## Ataques\n`;
		creature.attacks.forEach((attack: CreatureAttack) => {
			md += `- **${attack.name}:** +${attack.bonus} para golpear. Daño: ${attack.damage}${attack.note ? ` (${attack.note})` : ''}\n`;
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

	if (creature.interactions && creature.interactions.length > 0) {
		md += `## Interacciones\n`;
		creature.interactions.forEach((interaction: CreatureAction) => {
			md += `- **${interaction.name}:** ${interaction.detail}${interaction.uses ? ` (Usos: ${formatUses(interaction.uses)})` : ''}\n`;
		});
		md += `\n`;
	}

	return md;
};

const formatStat = (value: number, note: string | null) =>
	note ? `${value} (${note})` : `${value}`;

const formatAttacks = (attacks: CreatureAttack[]) =>
	attacks.map((a) => `${a.name} +${a.bonus} ${a.damage}${a.note ? ` (${a.note})` : ''}`).join('; ');

const formatAbilities = (actions: CreatureAction[]) =>
	actions
		.map((a) => `${a.name}${a.uses ? ` [${formatUses(a.uses)}]` : ''}: ${a.detail}`)
		.join('; ');

const escapeCell = (value: string) => value.replace(/\|/g, '\\|').replace(/\n/g, ' ');

const COLUMNS = [
	'Nombre',
	'Linaje',
	'Rango',
	'Cuerpo',
	'Reflejos',
	'Mente',
	'Instinto',
	'Presencia',
	'Salud',
	'Esquiva',
	'Mitigación Física',
	'Mitigación Mágica',
	'Velocidad',
	'Iniciativa',
	'Lenguas',
	'Ataques',
	'Rasgos',
	'Acciones',
	'Reacciones',
	'Interacciones',
	'Comportamiento',
];

const creatureToTableRow = (creature: Creature): string => {
	const cells = [
		creature.name,
		creature.lineage,
		creature.tier.toString(),
		creature.attributes.body.toString(),
		creature.attributes.reflexes.toString(),
		creature.attributes.mind.toString(),
		creature.attributes.instinct.toString(),
		creature.attributes.presence.toString(),
		creature.stats.maxHealth.toString(),
		formatStat(creature.stats.evasion.value, creature.stats.evasion.note),
		formatStat(creature.stats.physicalMitigation.value, creature.stats.physicalMitigation.note),
		formatStat(creature.stats.magicalMitigation.value, creature.stats.magicalMitigation.note),
		formatStat(creature.stats.speed.value, creature.stats.speed.note),
		creature.attributes.reflexes.toString(),
		creature.languages.length > 0 ? creature.languages.join(', ') : 'Ninguna',
		creature.attacks.length > 0 ? formatAttacks(creature.attacks) : '—',
		creature.traits.length > 0
			? creature.traits.map((t) => `${t.name}: ${t.detail}`).join('; ')
			: '—',
		creature.actions.length > 0 ? formatAbilities(creature.actions) : '—',
		creature.reactions.length > 0 ? formatAbilities(creature.reactions) : '—',
		creature.interactions.length > 0 ? formatAbilities(creature.interactions) : '—',
		creature.behavior ?? '—',
	];
	return `| ${cells.map(escapeCell).join(' | ')} |`;
};

export const serializeStatblocksAsMDTable = (creatures: Creature[]): string => {
	const header = `| **${COLUMNS.join('** | **')}** |`;
	const separator = `| ${COLUMNS.map(() => '---').join(' | ')} |`;
	const rows = creatures.map(creatureToTableRow);
	return `${header}\n${separator}\n${rows.join('\n')}`;
};

const formatUses = (uses: Uses | null) => {
	switch (uses?.type) {
		case 'RELOAD':
			return `${uses.qty} [Recarga ${uses.qty}+]`;
		case 'USES':
			return `${uses.qty}`;
		case 'LONG_REST':
		case 'DAY':
			return `${uses.qty} por día`;
		default:
			return '';
	}
};
