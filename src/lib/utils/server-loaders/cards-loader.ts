import { mapAbilityCard, mapItemCard } from '$lib/mappers/card-mapper';
import type { Card } from '$lib/types/cards/card';
import type { Uses } from '$lib/types/uses';
import { load as yamlLoad } from 'js-yaml';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

const ABILITY_CARDS_FILE_PATH = join(process.cwd(), 'static', 'docs', 'cards.yml');
const MAGICAL_ITEM_CARDS_FILE_PATH = join(process.cwd(), 'static', 'docs', 'magical-items.yml');

const formatUses = (uses: Uses | null): string => {
	if (!uses || !uses.type) return 'N/A';

	switch (uses.type) {
		case 'LONG_REST':
			return `${uses.qty ?? '—'} por día de descanso`;
		case 'RELOAD':
			return `1 (Recarga ${uses.qty ?? '—'}+)`;
		case 'USES':
			return `${uses.qty ?? '—'}`;
		default:
			return '—';
	}
};

const cardToMarkdown = (card: Card): string => {
	let md = ``;
	md += `# ${card.name}\n\n`;
	md += `**Nivel:** ${card.level}\n\n`;
	md += `**Tipo:** ${card.type.charAt(0).toUpperCase() + card.type.slice(1)}\n\n`;

	if (card.cardType === 'item') {
		md += `**Costo:** ${(card as any).cost} de oro\n\n`;
	}

	md += `**Descripción:**\n${card.description}\n\n`;

	if (card.tags && card.tags.length > 0) {
		md += `**Etiquetas:** ${card.tags ? card.tags.join(', ') : '—'}\n\n`;
	}

	md += `**Requerimientos:** ${card.requirements && card.requirements.length > 0 ? card.requirements.join(', ') : '—'}\n\n`;

	const usesText = formatUses(card.uses);
	if (usesText !== 'N/A') {
		md += `**Usos:** ${usesText}\n\n`;
	}

	return md;
};

const loadCards = async (path: string, mapper: (card: any) => Card) => {
	const fileContent = await readFile(path, 'utf-8');

	let rawCards = [];
	try {
		rawCards = (yamlLoad(fileContent) as any).cards ?? [];
	} catch (e) {
		console.error('Error parsing YAML:', e);
	}

	const cards = rawCards.map((x) => mapper(x));

	return cards.map(cardToMarkdown).join('---\n\n');
};

export const loadAbilityCardsAsMD = async () => {
	return await loadCards(ABILITY_CARDS_FILE_PATH, mapAbilityCard);
};

export const loadMagicalItemsCardsAsMD = async () => {
	return await loadCards(MAGICAL_ITEM_CARDS_FILE_PATH, mapItemCard);
};
