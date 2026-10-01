import type { Card } from '$lib/types/cards/card';
import type { ItemCard } from '$lib/types/cards/item-card';
import type { Uses } from '$lib/types/uses';

const getFormulaText = (uses: Uses): string =>
	typeof uses.formula === 'string' ? uses.formula.trim() : '';

const formatQuantity = (qty: Uses['qty']): string =>
	qty === null || qty === undefined ? '—' : String(qty);

export const formatUses = (uses: Uses | null): string => {
	if (!uses) return 'N/A';

	const formula = getFormulaText(uses);
	if (!uses.type && !formula) return 'N/A';

	const amount = formula || formatQuantity(uses.qty);

	switch (uses.type) {
		case 'LONG_REST':
			return `${amount} por día de descanso`;
		case 'RELOAD':
			return `1 (Recarga ${amount}+)`;
		case 'USES':
			return `${amount}`;
		case 'DAY':
			return formula ? `${amount} por día` : '1 por día';
		default:
			return formula ? amount : '—';
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
