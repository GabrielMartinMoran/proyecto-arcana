import type { Card, ItemCard, Uses } from '../../types/card.js';

export interface CardSummaryOptions {
	showId?: boolean;
	showSlug?: boolean;
	includeKindLabel?: boolean;
	alignColumns?: boolean;
}

export interface CardDetailOptions {
	showId?: boolean;
	showSlug?: boolean;
	showDescription?: boolean;
	showRequirements?: boolean;
	showTags?: boolean;
	showUses?: boolean;
	showCost?: boolean;
}

const DEFAULT_SUMMARY_OPTIONS: Required<CardSummaryOptions> = {
	showId: false,
	showSlug: false,
	includeKindLabel: true,
	alignColumns: true,
};

const DEFAULT_DETAIL_OPTIONS: Required<CardDetailOptions> = {
	showId: true,
	showSlug: true,
	showDescription: true,
	showRequirements: true,
	showTags: true,
	showUses: true,
	showCost: true,
};

const formatUses = (uses: Uses | null): string => {
	if (!uses || !uses.type) return '—';
	switch (uses.type) {
		case 'LONG_REST':
			return `Usos por descanso largo: ${uses.qty ?? 1}`;
		case 'RELOAD':
			return `Recarga ${uses.qty ?? '—'}+`;
		case 'USES':
			return `Usos: ${uses.qty ?? '—'}`;
		case 'DAY':
			return `Usos por día: ${uses.qty ?? 1}`;
		default:
			return '—';
	}
};

const pad = (value: string, length: number): string => value.padEnd(length, ' ');

const formatColumn = (value: string, length: number, shouldAlign: boolean): string =>
	shouldAlign ? pad(value, length) : value;

const toLabel = (card: Card, includeKind: boolean): string => {
	if (!includeKind) return card.name;
	const label = card.cardType === 'item' ? 'Objeto' : 'Habilidad';
	return `${label}: ${card.name}`;
};

const formatTags = (tags: string[]): string => (tags.length ? tags.join(', ') : '—');

const formatRequirements = (requirements: string | null): string =>
	requirements && requirements.trim().length > 0 ? requirements : '—';

const collectSummaryColumns = (card: Card, options: Required<CardSummaryOptions>): string[] => {
	const columns: string[] = [];

	if (options.showId) {
		columns.push(card.id);
	}

	if (options.showSlug && card.slug) {
		columns.push(card.slug);
	}

	columns.push(toLabel(card, options.includeKindLabel));
	columns.push(`Nivel ${card.level}`);
	columns.push(formatTags(card.tags));

	return columns;
};

const computeColumnWidths = (rows: string[][]): number[] => {
	const widths: number[] = [];

	for (const row of rows) {
		row.forEach((value, index) => {
			const length = value.length;
			if (!widths[index] || length > widths[index]) {
				widths[index] = length;
			}
		});
	}
	return widths;
};

export const formatCardSummary = (
	card: Card,
	options: CardSummaryOptions = {},
): string => {
	const resolved = { ...DEFAULT_SUMMARY_OPTIONS, ...options };
	const columns = collectSummaryColumns(card, resolved);

	if (!resolved.alignColumns) {
		return columns.join(' | ');
	}

	const widths = computeColumnWidths([columns]);
	const aligned = columns.map((col, index) => formatColumn(col, widths[index], true));
	return aligned.join(' | ');
};

export const formatCardSummaries = (
	cards: Card[],
	options: CardSummaryOptions = {},
): string => {
	if (cards.length === 0) return 'No se encontraron cartas que cumplan esos criterios.';

	const resolved = { ...DEFAULT_SUMMARY_OPTIONS, ...options };

	const rows = cards.map((card) => collectSummaryColumns(card, resolved));
	const widths = resolved.alignColumns ? computeColumnWidths(rows) : [];

	const lines = rows.map((row) =>
		row
			.map((col, index) => formatColumn(col, widths[index], resolved.alignColumns))
			.join(' | '),
	);

	return lines.join('\n');
};

export const formatCardDetails = (
	card: Card,
	options: CardDetailOptions = {},
): string => {
	const resolved = { ...DEFAULT_DETAIL_OPTIONS, ...options };
	const lines: string[] = [];

	lines.push(toLabel(card, true));
	lines.push('-'.repeat(lines[0].length));

	if (resolved.showId) {
		lines.push(`ID: ${card.id}`);
	}

	if (resolved.showSlug && card.slug) {
		lines.push(`Slug: ${card.slug}`);
	}

	lines.push(`Nivel: ${card.level}`);
	lines.push(`Tipo: ${card.type}`);

	if (card.cardType === 'item' && resolved.showCost) {
		const cost = (card as ItemCard).cost ?? '—';
		lines.push(`Costo: ${cost}`);
	}

	if (resolved.showTags) {
		lines.push(`Etiquetas: ${formatTags(card.tags)}`);
	}

	if (resolved.showRequirements) {
		lines.push(`Requerimientos: ${formatRequirements(card.requirements)}`);
	}

	if (resolved.showUses) {
		lines.push(`Usos: ${formatUses(card.uses ?? null)}`);
	}

	if (resolved.showDescription && card.description.trim()) {
		lines.push('\nDescripción:\n');
		lines.push(card.description.trim());
	}

	return lines.join('\n');
};

export const formatListHeader = (title: string, count: number): string => {
	const plural = count === 1 ? 'carta' : 'cartas';
	return `${title} (${count} ${plural})\n${'-'.repeat(title.length + plural.length + 4)}`;
};

export const formatListWithHeader = (
	title: string,
	cards: Card[],
	options: CardSummaryOptions = {},
): string => {
	const header = formatListHeader(title, cards.length);
	const body = formatCardSummaries(cards, options);
	return `${header}\n${body}`;
};
