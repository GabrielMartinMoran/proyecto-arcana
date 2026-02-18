import type { Card } from '$lib/types/cards/card';
import type { ItemCard } from '$lib/types/cards/item-card';
import type { Uses } from '$lib/types/uses';

export const formatUses = (uses: Uses | null): string => {
	if (!uses || !uses.type) return 'N/A';

	switch (uses.type) {
		case 'LONG_REST':
			return `${uses.qty ?? '—'} por día de descanso`;
		case 'RELOAD':
			return `1 (Recarga ${uses.qty ?? '—'}+)`;
		case 'USES':
			return `${uses.qty ?? '—'}`;
		case 'DAY':
			return '1 por día';
		default:
			return '—';
	}
};

const cardToMarkdownRow = (card: Card): string => {
	const columns: string[] = [
		card.name,
		card.level.toString(),
		card.type,
		card.description,
		card.tags ? card.tags.join(', ') : '—',
		card.requirements ?? '—',
		formatUses(card.uses),
	];

	if (card.cardType === 'item') {
		columns.push((card as ItemCard).cost.toString());
	}

	return `| ${columns.map((c) => c.replace(/\|/g, '\\|')).join(' | ')} |`;
};

export const serializeCardsAsMDTable = (cards: Card[]): string => {
	const columns = ['Nombre', 'Nivel', 'Tipo', 'Descripción', 'Etiquetas', 'Requerimientos', 'Usos'];

	if (cards.length > 0 && cards[0].cardType === 'item') {
		columns.push('Costo (oro)');
	}

	const separator = `| ${columns.map(() => '---').join(' | ')} |`;
	const rows = cards.map(cardToMarkdownRow);

	return `| **${columns.join('** | **')}** |\n${separator}\n${rows.join('\n')}`;
};
