import type { Card } from '$lib/types/cards/card';
import { dump } from 'js-yaml';

export const cardToYaml = (card: Card): string => {
	const { id: _id, img: _img, cardType: _cardType, ...rest } = card;
	return dump(rest, { lineWidth: -1, noRefs: true }).trim();
};
