import type { LibraryModifier } from '$lib/types/modifier';

class ModifiersService {
	private modifiers: LibraryModifier[] = [];
	private loaded = false;

	/**
	 * Loads modifiers from the static JSON file
	 */
	async loadModifiers(): Promise<void> {
		if (this.loaded) return;

		try {
			const response = await fetch('/docs/modifiers.json');
			if (!response.ok) {
				throw new Error(`Failed to load modifiers: ${response.status}`);
			}
			const data = await response.json();

			this.modifiers = data;
			this.loaded = true;
		} catch (error) {
			console.error('Error loading modifiers:', error);
			this.modifiers = [];
			this.loaded = true;
		}
	}

	/**
	 * Returns all loaded modifiers
	 */
	getModifiers(): LibraryModifier[] {
		return this.modifiers;
	}

	/**
	 * Finds a modifier by exact name match
	 */
	findByName(name: string): LibraryModifier | undefined {
		return this.modifiers.find(
			(modifier) => modifier.name.toLowerCase() === name.toLowerCase(),
		);
	}

	/**
	 * Finds all modifiers that match a partial name (for auto-add from cards)
	 */
	findAllByNameMatch(name: string): LibraryModifier[] {
		if (!name.trim()) return [];
		const lowerName = name.toLowerCase();
		return this.modifiers.filter((modifier) =>
			modifier.name.toLowerCase().includes(lowerName),
		);
	}

	/**
	 * Returns unique categories
	 */
	getCategories(): string[] {
		const categories = new Set(this.modifiers.map((m) => m.category));
		return Array.from(categories);
	}

	/**
	 * Returns modifiers filtered by category
	 */
	getByCategory(category: string): LibraryModifier[] {
		return this.modifiers.filter((modifier) => modifier.category === category);
	}

	/**
	 * Check if modifiers are loaded
	 */
	isLoaded(): boolean {
		return this.loaded;
	}
}

// Export singleton instance
export const modifiersService = new ModifiersService();
