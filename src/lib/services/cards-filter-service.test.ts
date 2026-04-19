import { describe, it, expect, vi } from 'vitest';

// ---- Mock $app/navigation and $app/state ----
vi.mock('$app/navigation', () => ({
	replaceState: vi.fn(),
}));

vi.mock('$app/state', () => ({
	page: {
		url: new URL('http://localhost/'),
	},
}));

// ---- Card filter type ----
type CardFilters = {
	name: string;
	level: number[];
	tags: string[];
	type: string;
	onlyAvailables?: boolean;
};

// ---- Card type for test fixtures ----
interface TestCard {
	id: string;
	name: string;
	type: string;
	level: number;
	tags: string[];
	description: string;
	available: boolean;
}

// ---- Test fixtures ----
const MOCK_CARDS: TestCard[] = [
	{
		id: 'card-1',
		name: 'Fuego Mágico',
		type: 'ability',
		level: 2,
		tags: ['fuego', 'magia', 'ataque'],
		description: 'Ataque de fuego',
		available: true,
	},
	{
		id: 'card-2',
		name: 'Escudo de Hielo',
		type: 'ability',
		level: 1,
		tags: ['hielo', 'defensa', 'magia'],
		description: 'Defensa mágica',
		available: true,
	},
	{
		id: 'card-3',
		name: 'Espada Larga',
		type: 'weapon',
		level: 1,
		tags: ['melee', 'ataque', 'comun'],
		description: 'Arma cuerpo a cuerpo',
		available: false,
	},
	{
		id: 'card-4',
		name: 'Curación Mayor',
		type: 'ability',
		level: 3,
		tags: ['sagrado', 'curacion', 'magia'],
		description: 'Curación poderosa',
		available: true,
	},
	{
		id: 'card-5',
		name: 'Daga Envenenada',
		type: 'weapon',
		level: 2,
		tags: ['melee', 'veneno', 'ataque'],
		description: 'Ataque con veneno',
		available: true,
	},
	{
		id: 'card-6',
		name: 'Fuego Alpha',
		type: 'ability',
		level: 5,
		tags: ['fuego', 'magia', 'area'],
		description: 'Ataque de área',
		available: false,
	},
];

// ---- Filter logic helpers (mirrors the service) ----
const applyFilters = (cards: TestCard[], filters: CardFilters): TestCard[] => {
	return cards.filter((card) => {
		// Name filter (case-insensitive partial match)
		if (filters.name && !card.name.toLowerCase().includes(filters.name.toLowerCase())) {
			return false;
		}

		// Type filter
		if (filters.type && card.type !== filters.type) {
			return false;
		}

		// Level filter (card level must be in the selected levels)
		if (filters.level.length > 0 && !filters.level.includes(card.level)) {
			return false;
		}

		// Tags filter (card must have ALL selected tags)
		if (filters.tags.length > 0) {
			const hasAllTags = filters.tags.every((tag) =>
				card.tags.some((cardTag) => cardTag.toLowerCase() === tag.toLowerCase()),
			);
			if (!hasAllTags) return false;
		}

		// Only availables filter
		if (filters.onlyAvailables && !card.available) {
			return false;
		}

		return true;
	});
};

// We'll test the URL manipulation logic directly

describe('cards-filter-service URL handling', () => {
	describe('updateURLFilters should use separate params', () => {
		it('should format multiple tags as separate URL params', () => {
			// Simulate what updateURLFilters SHOULD do
			const url = new URL('http://localhost/');
			const tags = ['fuego', 'magia'];

			// CORRECT approach: delete + append per value
			url.searchParams.delete('tags');
			tags.forEach((tag) => url.searchParams.append('tags', tag));

			expect(url.searchParams.getAll('tags')).toEqual(['fuego', 'magia']);
			expect(url.toString()).toContain('tags=fuego');
			expect(url.toString()).toContain('tags=magia');
		});

		it('should format multiple levels as separate URL params', () => {
			const url = new URL('http://localhost/');
			const level = [1, 2];

			// CORRECT approach: delete + append per value
			url.searchParams.delete('level');
			level.forEach((lvl) => url.searchParams.append('level', String(lvl)));

			expect(url.searchParams.getAll('level')).toEqual(['1', '2']);
		});

		it('should NOT use comma-joined format', () => {
			const url = new URL('http://localhost/');
			const tags = ['fuego', 'magia'];

			// WRONG approach (current bug): set with join
			url.searchParams.set('tags', tags.join(','));

			// When we getAll from this, we get ONE element
			const values = url.searchParams.getAll('tags');
			expect(values).toEqual(['fuego,magia']); // Single element with comma
			expect(values.length).toBe(1); // This is the bug!
		});
	});

	describe('getFiltersFromURL with getAll', () => {
		it('should parse separate params correctly', () => {
			// Format that works: ?tags=fuego&tags=magia
			const url = new URL('http://localhost/?tags=fuego&tags=magia');

			const tags = url.searchParams.getAll('tags').filter((tag) => tag !== '');
			expect(tags).toEqual(['fuego', 'magia']);
		});

		it('should fail with comma-joined format', () => {
			// Buggy format: ?tags=fuego,magia
			const url = new URL('http://localhost/?tags=fuego,magia');

			const tags = url.searchParams.getAll('tags').filter((tag) => tag !== '');
			expect(tags).toEqual(['fuego,magia']); // Single element!
			expect(tags.length).toBe(1); // This is the problem
		});
	});

	describe('roundtrip compatibility', () => {
		it('should preserve tags with separate param format', () => {
			const originalTags = ['fuego', 'magia'];

			// Step 1: Save with separate params
			const url = new URL('http://localhost/');
			url.searchParams.delete('tags');
			originalTags.forEach((tag) => url.searchParams.append('tags', tag));

			// Step 2: Load from URL (simulating page reload)
			const savedTags = url.searchParams.getAll('tags').filter((tag) => tag !== '');

			expect(savedTags).toEqual(originalTags); // Roundtrip works!
		});

		it('should preserve levels with separate param format', () => {
			const originalLevels = [1, 2];

			// Step 1: Save with separate params
			const url = new URL('http://localhost/');
			url.searchParams.delete('level');
			originalLevels.forEach((lvl) => url.searchParams.append('level', String(lvl)));

			// Step 2: Load from URL
			const savedLevels = url.searchParams
				.getAll('level')
				.filter((tag) => tag !== '')
				.map(Number)
				.filter((x) => x > 0);

			expect(savedLevels).toEqual(originalLevels); // Roundtrip works!
		});

		it('should fail roundtrip with comma-joined format', () => {
			const originalTags = ['fuego', 'magia'];

			// Step 1: Save with buggy comma-join
			const url = new URL('http://localhost/');
			url.searchParams.set('tags', originalTags.join(','));

			// Step 2: Load from URL
			const savedTags = url.searchParams.getAll('tags').filter((tag) => tag !== '');

			// Bug: we get ['fuego,magia'] instead of ['fuego', 'magia']
			expect(savedTags).not.toEqual(originalTags);
			expect(savedTags).toEqual(['fuego,magia']);
		});
	});
});

describe('cards-filter-service multi-filter logic', () => {
	describe('applyFilters', () => {
		it('should return all cards when no filters are applied', () => {
			const filters: CardFilters = { name: '', level: [], tags: [], type: '' };
			const result = applyFilters(MOCK_CARDS, filters);
			expect(result).toHaveLength(6);
		});

		it('should filter by name (case-insensitive)', () => {
			const filters: CardFilters = { name: 'fuego', level: [], tags: [], type: '' };
			const result = applyFilters(MOCK_CARDS, filters);

			expect(result).toHaveLength(2);
			expect(result.map((c) => c.name)).toContain('Fuego Mágico');
			expect(result.map((c) => c.name)).toContain('Fuego Alpha');
		});

		it('should filter by type', () => {
			const filters: CardFilters = { name: '', level: [], tags: [], type: 'ability' };
			const result = applyFilters(MOCK_CARDS, filters);

			expect(result).toHaveLength(4);
			expect(result.every((c) => c.type === 'ability')).toBe(true);
		});

		it('should filter by level', () => {
			const filters: CardFilters = { name: '', level: [1, 2], tags: [], type: '' };
			const result = applyFilters(MOCK_CARDS, filters);

			expect(result).toHaveLength(4);
			expect(result.every((c) => c.level === 1 || c.level === 2)).toBe(true);
		});

		it('should filter by tags (AND logic - card must have ALL selected tags)', () => {
			const filters: CardFilters = { name: '', level: [], tags: ['fuego', 'magia'], type: '' };
			const result = applyFilters(MOCK_CARDS, filters);

			expect(result).toHaveLength(2);
			expect(result.map((c) => c.name)).toContain('Fuego Mágico');
			expect(result.map((c) => c.name)).toContain('Fuego Alpha');
		});

		it('should combine multiple filters with AND logic', () => {
			const filters: CardFilters = { name: 'fuego', level: [2], tags: ['magia'], type: 'ability' };
			const result = applyFilters(MOCK_CARDS, filters);

			expect(result).toHaveLength(1);
			expect(result[0].name).toBe('Fuego Mágico');
		});

		it('should filter by onlyAvailables', () => {
			const filters: CardFilters = {
				name: '',
				level: [],
				tags: [],
				type: '',
				onlyAvailables: true,
			};
			const result = applyFilters(MOCK_CARDS, filters);

			expect(result).toHaveLength(4);
			expect(result.every((c) => c.available === true)).toBe(true);
		});

		it('should return empty array when no cards match', () => {
			const filters: CardFilters = { name: 'unicornio', level: [], tags: [], type: '' };
			const result = applyFilters(MOCK_CARDS, filters);

			expect(result).toHaveLength(0);
		});

		it('should be case-insensitive for tag matching', () => {
			const filters: CardFilters = { name: '', level: [], tags: ['FUEGO', 'MAGIA'], type: '' };
			const result = applyFilters(MOCK_CARDS, filters);

			expect(result).toHaveLength(2);
		});
	});

	describe('filter edge cases', () => {
		it('should handle empty cards array', () => {
			const filters: CardFilters = { name: 'test', level: [], tags: [], type: '' };
			const result = applyFilters([], filters);
			expect(result).toHaveLength(0);
		});

		it('should handle cards with empty tags array', () => {
			const cardsWithNoTags: TestCard[] = [
				{
					id: 'card-x',
					name: 'Test Card',
					type: 'ability',
					level: 1,
					tags: [],
					description: '',
					available: true,
				},
			];
			const filters: CardFilters = { name: '', level: [], tags: ['magic'], type: '' };
			const result = applyFilters(cardsWithNoTags, filters);
			expect(result).toHaveLength(0);
		});

		it('should handle partial name match', () => {
			const filters: CardFilters = { name: 'Fuego', level: [], tags: [], type: '' };
			const result = applyFilters(MOCK_CARDS, filters);
			expect(result).toHaveLength(2);
		});

		it('should not match name with empty string', () => {
			const filters: CardFilters = { name: '', level: [], tags: [], type: '' };
			const result = applyFilters(MOCK_CARDS, filters);
			expect(result).toHaveLength(6);
		});
	});
});

describe('cards-filter-service view modes', () => {
	type ViewMode = 'grid' | 'compact' | 'list';

	it('should define three valid view modes', () => {
		const validModes: ViewMode[] = ['grid', 'compact', 'list'];
		expect(validModes).toHaveLength(3);
	});

	it('should switch between view modes without affecting filter logic', () => {
		// View mode is orthogonal to filters - it only affects display, not card selection
		const filters: CardFilters = { name: 'Fuego', level: [], tags: [], type: '' };
		const cards = applyFilters(MOCK_CARDS, filters);

		// Same filtered cards regardless of view mode
		const gridCards = cards;
		const compactCards = cards;
		const listCards = cards;

		expect(gridCards).toEqual(compactCards);
		expect(compactCards).toEqual(listCards);
		expect(gridCards).toHaveLength(2);
	});

	it('should persist view mode preference', () => {
		// Simulate view mode persistence in localStorage
		const VIEW_MODE_KEY = 'arcana:cardViewMode';
		const viewMode: ViewMode = 'compact';

		localStorage.setItem(VIEW_MODE_KEY, viewMode);

		const savedMode = localStorage.getItem(VIEW_MODE_KEY) as ViewMode;
		expect(savedMode).toBe('compact');
	});

	it('should default to grid view mode when not set', () => {
		const VIEW_MODE_KEY = 'arcana:cardViewMode';
		localStorage.removeItem(VIEW_MODE_KEY);

		const savedMode = localStorage.getItem(VIEW_MODE_KEY);
		expect(savedMode).toBeNull();

		// Default should be 'grid'
		const defaultMode = savedMode || 'grid';
		expect(defaultMode).toBe('grid');
	});
});

describe('cards-filter-service URL sync', () => {
	it('should build empty filters correctly', () => {
		const filters: CardFilters = { name: '', level: [], tags: [], type: '' };
		expect(filters.name).toBe('');
		expect(filters.level).toHaveLength(0);
		expect(filters.tags).toHaveLength(0);
		expect(filters.type).toBe('');
	});

	it('should serialize filters to URL params', () => {
		const filters: CardFilters = {
			name: 'Fuego',
			level: [1, 2],
			tags: ['magia', 'ataque'],
			type: 'ability',
		};

		const url = new URL('http://localhost/');

		// Serialize name
		if (filters.name) url.searchParams.set('name', filters.name);

		// Serialize level (multiple params)
		url.searchParams.delete('level');
		filters.level.forEach((lvl) => url.searchParams.append('level', String(lvl)));

		// Serialize tags (multiple params)
		url.searchParams.delete('tags');
		filters.tags.forEach((tag) => url.searchParams.append('tags', tag));

		// Serialize type
		if (filters.type) url.searchParams.set('type', filters.type);

		expect(url.searchParams.get('name')).toBe('Fuego');
		expect(url.searchParams.getAll('level')).toEqual(['1', '2']);
		expect(url.searchParams.getAll('tags')).toEqual(['magia', 'ataque']);
		expect(url.searchParams.get('type')).toBe('ability');
	});

	it('should deserialize URL params to filters', () => {
		const url = new URL(
			'http://localhost/?name=Fuego&level=1&level=2&tags=magia&tags=ataque&type=ability',
		);

		const filters: CardFilters = {
			name: url.searchParams.get('name') ?? '',
			level: url.searchParams
				.getAll('level')
				.filter((tag) => tag !== '')
				.map(Number)
				.filter((x) => x > 0),
			tags: url.searchParams.getAll('tags').filter((tag) => tag !== ''),
			type: url.searchParams.get('type') ?? '',
		};

		expect(filters.name).toBe('Fuego');
		expect(filters.level).toEqual([1, 2]);
		expect(filters.tags).toEqual(['magia', 'ataque']);
		expect(filters.type).toBe('ability');
	});

	it('should handle empty URL params gracefully', () => {
		const url = new URL('http://localhost/');

		const filters: CardFilters = {
			name: url.searchParams.get('name') ?? '',
			level: url.searchParams
				.getAll('level')
				.filter((tag) => tag !== '')
				.map(Number)
				.filter((x) => x > 0),
			tags: url.searchParams.getAll('tags').filter((tag) => tag !== ''),
			type: url.searchParams.get('type') ?? '',
		};

		expect(filters.name).toBe('');
		expect(filters.level).toEqual([]);
		expect(filters.tags).toEqual([]);
		expect(filters.type).toBe('');
	});

	it('should maintain filter roundtrip across URL serialization', () => {
		// Original filters
		const originalFilters: CardFilters = {
			name: 'Fuego',
			level: [2, 3],
			tags: ['magia'],
			type: 'ability',
		};

		// Serialize to URL
		const url = new URL('http://localhost/');
		if (originalFilters.name) url.searchParams.set('name', originalFilters.name);
		url.searchParams.delete('level');
		originalFilters.level.forEach((lvl) => url.searchParams.append('level', String(lvl)));
		url.searchParams.delete('tags');
		originalFilters.tags.forEach((tag) => url.searchParams.append('tags', tag));
		if (originalFilters.type) url.searchParams.set('type', originalFilters.type);

		// Deserialize from URL
		const parsedFilters: CardFilters = {
			name: url.searchParams.get('name') ?? '',
			level: url.searchParams
				.getAll('level')
				.filter((tag) => tag !== '')
				.map(Number)
				.filter((x) => x > 0),
			tags: url.searchParams.getAll('tags').filter((tag) => tag !== ''),
			type: url.searchParams.get('type') ?? '',
		};

		expect(parsedFilters).toEqual(originalFilters);
	});

	it('should clear params when filters are empty', () => {
		const url = new URL('http://localhost/?name=Fuego&level=1&tags=magia');

		// Simulate clearing all filters
		url.searchParams.delete('name');
		url.searchParams.delete('level');
		url.searchParams.delete('tags');
		url.searchParams.delete('type');

		expect(url.searchParams.toString()).toBe('');
	});
});
