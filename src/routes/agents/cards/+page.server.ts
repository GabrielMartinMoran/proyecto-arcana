import { mapCard } from '$lib/mappers/card-mapper';
import type { AbilityCard } from '$lib/types/cards/ability-card';
import type { Uses } from '$lib/types/uses';
import { load as yamlLoad } from 'js-yaml';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { PageServerLoad } from './$types';

export const prerender = true;
export const ssr = true;

const formatUses = (uses: Uses | null): string => {
	if (!uses || !uses.type) return 'N/A';

	switch (uses.type) {
		case 'LONG_REST':
			return `${uses.qty ?? '?'} por día de descanso`;
		case 'RELOAD':
			return `1 (Recarga ${uses.qty ?? '?'}+)`;
		case 'USES':
			return `${uses.qty ?? '?'}`;
		default:
			return 'N/A';
	}
};

const cardToMarkdown = (card: AbilityCard): string => {
	let md = ``;
	md += `# ${card.name}\n\n`;
	md += `**Nivel:** ${card.level}\n\n`;
	md += `**Tipo:** ${card.type.charAt(0).toUpperCase() + card.type.slice(1)}\n\n`;

	md += `**Descripción:**\n${card.description}\n\n`;

	if (card.tags && card.tags.length > 0) {
		md += `**Etiquetas:** ${card.tags.join(', ')}\n\n`;
	}

	md += `**Requerimientos:** ${card.requirements && card.requirements.length > 0 ? card.requirements.join(', ') : '—'}\n\n`;

	const usesText = formatUses(card.uses);
	if (usesText !== 'N/A') {
		md += `**Usos:** ${usesText}\n\n`;
	}

	return md;
};

export const load: PageServerLoad = () => {
	const filePath = join(process.cwd(), 'static', 'docs', 'cards.yml');
	const fileContent = readFileSync(filePath, 'utf-8');

	let rawCards = [];
	try {
		rawCards = (yamlLoad(fileContent) as any).cards ?? [];
	} catch (e) {
		console.error('Error parsing YAML:', e);
	}

	const cards: AbilityCard[] = rawCards.map((x) => mapCard(x));

	const doc = cards.map(cardToMarkdown).join('---\n\n');

	return {
		doc,
	};
};
