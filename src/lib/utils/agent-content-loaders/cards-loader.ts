import { mapAbilityCard, mapItemCard } from '$lib/mappers/card-mapper';
import type { Card } from '$lib/types/cards/card';
import type { Uses } from '$lib/types/uses';
import { load as yamlLoad } from 'js-yaml';
import { loadAgentFile } from './agent-content-loader';

const ABILITY_CARDS_FILE_PATH = '/docs/cards.yml';
const MAGICAL_ITEM_CARDS_FILE_PATH = '/docs/magical-items.yml';

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

const cardToMarkdownRow = (card: Card): string => {
	const columns: string[] = [];

	columns.push(card.name);
	columns.push(card.level.toString());
	columns.push(card.type);
	columns.push(card.description);
	columns.push(card.tags ? card.tags.join(', ') : '—');
	columns.push(card.requirements ? card.requirements.join(', ') : '—');
	columns.push(formatUses(card.uses));
	if (card.cardType === 'item') {
		columns.push((card as any).cost.toString());
	}

	return `| ${columns.join(' | ')} |`;
};

const cardsToMarkdownTable = (cards: Card[]): string => {
	const columns = [
		'Nombre',
		'Nivel',
		'Tipo',
		'Tipo de carta',
		'Etiquetas',
		'Requerimientos',
		'Usos',
	];

	if (cards[0].cardType === 'item') {
		columns.push('Costo (oro)');
	}

	const rows = cards.map(cardToMarkdownRow);

	return `| **${columns.join('** | **')}** |\n| --- | --- | --- | --- | --- | --- | --- |\n${rows.join('\n')}`;
};

const loadCards = async (
	path: string,
	mapper: (card: any) => Card,
	rootKey: string,
): Promise<string> => {
	const fileContent = await loadAgentFile(path);

	let rawCards = [];
	try {
		rawCards = (yamlLoad(fileContent) as any)[rootKey] ?? [];
	} catch (e) {
		console.error('Error parsing YAML:', e);
	}

	const cards = rawCards.map((x) => mapper(x));

	return cardsToMarkdownTable(cards);
};

export const loadAbilityCardsAsMD = async () => {
	return await loadCards(ABILITY_CARDS_FILE_PATH, mapAbilityCard, 'cards');
};

export const loadMagicalItemsCardsAsMD = async () => {
	return await loadCards(MAGICAL_ITEM_CARDS_FILE_PATH, mapItemCard, 'items');
};
