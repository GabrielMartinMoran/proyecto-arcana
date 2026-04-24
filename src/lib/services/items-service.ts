import { asset } from '$app/paths';
import type { LibraryItem } from '$lib/types/item';

class ItemsService {
	private items: LibraryItem[] = [];
	private loaded = false;

	/**
	 * Loads items from the static JSON file
	 */
	async loadItems(): Promise<void> {
		if (this.loaded) return;

		try {
			const response = await fetch(asset('/docs/items.json'));
			if (!response.ok) {
				throw new Error(`Failed to load items: ${response.status}`);
			}
			const data = await response.json();

			// Flatten all categories into a single array
			this.items = [...data.weapons, ...data.armors, ...data['adventure-gear']];
			this.loaded = true;
		} catch (error) {
			console.error('Error loading items:', error);
			this.items = [];
			this.loaded = true;
		}
	}

	/**
	 * Returns all loaded items
	 */
	getItems(): LibraryItem[] {
		return this.items;
	}

	/**
	 * Returns items filtered by category
	 */
	getItemsByCategory(category: LibraryItem['category']): LibraryItem[] {
		return this.items.filter((item) => item.category === category);
	}

	/**
	 * Returns a single item by ID
	 */
	getItemById(id: string): LibraryItem | undefined {
		return this.items.find((item) => item.id === id);
	}

	/**
	 * Searches items by name (case-insensitive)
	 */
	searchItems(query: string): LibraryItem[] {
		if (!query.trim()) return this.items;
		const lowerQuery = query.toLowerCase();
		return this.items.filter((item) => item.name.toLowerCase().includes(lowerQuery));
	}

	/**
	 * Filters items by category and/or name search
	 */
	filterItems(category: LibraryItem['category'] | null, searchQuery: string): LibraryItem[] {
		let result = this.items;

		if (category) {
			result = result.filter((item) => item.category === category);
		}

		if (searchQuery.trim()) {
			const lowerQuery = searchQuery.toLowerCase();
			result = result.filter((item) => item.name.toLowerCase().includes(lowerQuery));
		}

		return result;
	}

	/**
	 * Check if items are loaded
	 */
	isLoaded(): boolean {
		return this.loaded;
	}
}

// Export singleton instance
export const itemsService = new ItemsService();
