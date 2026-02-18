import { dump as yamlDump } from 'js-yaml';
import type { Card, ItemCard } from '../types/card.js';

const cardToObject = (card: Card): object => {
	const obj: Record<string, any> = {
		id: card.id,
		name: card.name,
		level: card.level,
		type: card.type,
		tags: card.tags,
		requirements: card.requirements ?? null,
		uses: card.uses == null ? null : { ...card.uses },
		description: card.description,
	};
	if (card.slug) {
		obj.slug = card.slug;
	}
	if (card.cardType === 'item') {
		obj.cost = (card as ItemCard).cost;
	}
	return obj;
};

export const serializeCardsAsYaml = (cards: Card[], rootKey = 'cards'): string => {
	return yamlDump({ [rootKey]: cards.map(cardToObject) }, { lineWidth: 120, quotingType: '"' });
};
