import type { Card } from '$lib/types/card';
import { generateId } from '$lib/utils/id-generator';

export const mapCard = (data: any): Card => {
	if (!data.name) throw new Error('Card name is required');
	return {
		id: generateId(data.name),
		...data,
	};
};
