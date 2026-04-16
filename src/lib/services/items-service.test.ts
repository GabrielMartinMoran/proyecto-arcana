import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { LibraryItem } from '$lib/types/item';
import { itemsService } from './items-service';

// Mock fetch for items.json
global.fetch = vi.fn();

const mockItemsData = {
	weapons: [
		{
			id: 'weapon-daga',
			name: 'Daga',
			category: 'weapons',
			price: 5,
			damage: '1d4',
			type: 'Perforante',
			properties: 'Precisa, Arrojadiza (Cercana)',
			requirement: '',
			notes: 'Daño 1d4, Perforante, Precisa, Arrojadiza (Cercana)',
		},
		{
			id: 'weapon-espada-larga',
			name: 'Espada larga',
			category: 'weapons',
			price: 50,
			damage: '1d6/1d8',
			type: 'Cortante',
			properties: 'Versátil',
			requirement: 'Cuerpo 2',
			notes: 'Daño 1d6/1d8, Cortante, Versátil, Requiere Cuerpo 2',
		},
	],
	armors: [
		{
			id: 'armor-cuero',
			name: 'Cuero',
			category: 'armors',
			price: 20,
			physicalMitigation: 1,
			evasionPenalty: 0,
			stealthPenalty: 0,
			requirement: 'Cuerpo 1',
			notes: 'Mitigación Física 1, Esquiva 0, Penalización Sigilo 0, Requiere Cuerpo 1',
		},
	],
	'adventure-gear': [
		{
			id: 'gear-mochila',
			name: 'Mochila',
			category: 'adventure-gear',
			price: 5,
			notes: 'Mochila para transportar objetos',
		},
	],
};

describe('items-service', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		// Reset the service state to test fresh loads
		const service = itemsService as unknown as { loaded: boolean; items: LibraryItem[] };
		service.loaded = false;
		service.items = [];
	});

	describe('loadItems', () => {
		it('should load items from JSON file', async () => {
			vi.mocked(fetch).mockResolvedValueOnce({
				ok: true,
				json: async () => mockItemsData,
			} as Response);

			await itemsService.loadItems();
			const items = itemsService.getItems();

			expect(items).toHaveLength(4);
			expect(items[0].name).toBe('Daga');
		});

		it('should handle fetch error gracefully', async () => {
			vi.mocked(fetch).mockResolvedValueOnce({
				ok: false,
				status: 404,
			} as Response);

			await itemsService.loadItems();
			const items = itemsService.getItems();

			expect(items).toHaveLength(0);
		});
	});

	describe('getItemsByCategory', () => {
		it('should return only weapons', async () => {
			vi.mocked(fetch).mockResolvedValueOnce({
				ok: true,
				json: async () => mockItemsData,
			} as Response);

			await itemsService.loadItems();
			const weapons = itemsService.getItemsByCategory('weapons');

			expect(weapons).toHaveLength(2);
			expect(weapons.every((w) => w.category === 'weapons')).toBe(true);
		});

		it('should return only armors', async () => {
			vi.mocked(fetch).mockResolvedValueOnce({
				ok: true,
				json: async () => mockItemsData,
			} as Response);

			await itemsService.loadItems();
			const armors = itemsService.getItemsByCategory('armors');

			expect(armors).toHaveLength(1);
			expect(armors[0].name).toBe('Cuero');
		});
	});

	describe('getItemById', () => {
		it('should return item by id', async () => {
			vi.mocked(fetch).mockResolvedValueOnce({
				ok: true,
				json: async () => mockItemsData,
			} as Response);

			await itemsService.loadItems();
			const item = itemsService.getItemById('weapon-daga');

			expect(item).toBeDefined();
			expect(item?.name).toBe('Daga');
		});

		it('should return undefined for non-existent id', async () => {
			vi.mocked(fetch).mockResolvedValueOnce({
				ok: true,
				json: async () => mockItemsData,
			} as Response);

			await itemsService.loadItems();
			const item = itemsService.getItemById('non-existent');

			expect(item).toBeUndefined();
		});
	});

	describe('searchItems', () => {
		it('should search items by name (case-insensitive)', async () => {
			vi.mocked(fetch).mockResolvedValueOnce({
				ok: true,
				json: async () => mockItemsData,
			} as Response);

			await itemsService.loadItems();
			const results = itemsService.searchItems('espada');

			expect(results).toHaveLength(1);
			expect(results[0].name).toBe('Espada larga');
		});

		it('should return all items for empty query', async () => {
			vi.mocked(fetch).mockResolvedValueOnce({
				ok: true,
				json: async () => mockItemsData,
			} as Response);

			await itemsService.loadItems();
			const results = itemsService.searchItems('');

			expect(results).toHaveLength(4);
		});
	});

	describe('filterItems', () => {
		it('should filter by category and search query', async () => {
			vi.mocked(fetch).mockResolvedValueOnce({
				ok: true,
				json: async () => mockItemsData,
			} as Response);

			await itemsService.loadItems();
			const results = itemsService.filterItems('weapons', 'espada');

			expect(results).toHaveLength(1);
			expect(results[0].name).toBe('Espada larga');
		});

		it('should filter by category only', async () => {
			vi.mocked(fetch).mockResolvedValueOnce({
				ok: true,
				json: async () => mockItemsData,
			} as Response);

			await itemsService.loadItems();
			const results = itemsService.filterItems('weapons', '');

			expect(results).toHaveLength(2);
		});

		it('should filter by search query only', async () => {
			vi.mocked(fetch).mockResolvedValueOnce({
				ok: true,
				json: async () => mockItemsData,
			} as Response);

			await itemsService.loadItems();
			const results = itemsService.filterItems(null, 'mochila');

			expect(results).toHaveLength(1);
			expect(results[0].name).toBe('Mochila');
		});
	});
});

describe('LibraryItem type', () => {
	it('should have required properties for weapons', () => {
		const weapon: LibraryItem = {
			id: 'test',
			name: 'Test Weapon',
			category: 'weapons',
			price: 10,
			notes: 'Test notes',
			damage: '1d6',
			type: 'Cortante',
		};

		expect(weapon.category).toBe('weapons');
		expect(weapon.damage).toBe('1d6');
	});

	it('should have required properties for armors', () => {
		const armor: LibraryItem = {
			id: 'test',
			name: 'Test Armor',
			category: 'armors',
			price: 50,
			notes: 'Test notes',
			physicalMitigation: 2,
			evasionPenalty: -1,
		};

		expect(armor.category).toBe('armors');
		expect(armor.physicalMitigation).toBe(2);
	});

	it('should have required properties for adventure gear', () => {
		const gear: LibraryItem = {
			id: 'test',
			name: 'Test Gear',
			category: 'adventure-gear',
			price: 5,
			notes: 'Test notes',
		};

		expect(gear.category).toBe('adventure-gear');
	});
});
