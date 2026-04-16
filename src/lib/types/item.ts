export interface LibraryItem {
	id: string;
	name: string;
	category: 'weapons' | 'armors' | 'adventure-gear' | 'services';
	price: number;
	notes: string;
	damage?: string;
	type?: string;
	properties?: string;
	requirement?: string;
	physicalMitigation?: number;
	evasionPenalty?: number;
	stealthPenalty?: number;
}

export type ItemCategory = LibraryItem['category'];

export const ITEM_CATEGORIES: ItemCategory[] = ['weapons', 'armors', 'adventure-gear', 'services'];

export const CATEGORY_LABELS: Record<ItemCategory, string> = {
	weapons: 'Armas',
	armors: 'Armaduras',
	'adventure-gear': 'Equipo de Aventura',
	services: 'Servicios',
};
