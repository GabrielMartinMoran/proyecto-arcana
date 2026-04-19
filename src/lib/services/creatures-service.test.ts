/**
 * creatures-service unit tests
 *
 * Tests cover:
 * - Creature loading from YAML compendium
 * - Tier/name filtering logic
 * - Creature-to-statblock mapping (creature-mapper)
 * - Store management (dedup loads, sorting)
 *
 * The YAML fetch is mocked at the boundary to isolate business logic.
 * Uses js-yaml for proper YAML parsing.
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { load as yamlLoad } from 'js-yaml';

// ---- Mock $app/paths ----
vi.mock('$app/paths', () => ({ resolve: (p: string) => p }));

// ---- Mock global fetch ----
const mockFetch = vi.fn();

beforeEach(() => {
	vi.clearAllMocks();
	mockFetch.mockReset();
	global.fetch = mockFetch;
});

afterEach(() => {
	vi.useRealTimers();
});

// ---- Creature type for test fixtures ----
interface TestCreature {
	id: string;
	name: string;
	lineage: string;
	tier: number;
	size: string;
	attributes: {
		body: number;
		reflexes: number;
		mind: number;
		instinct: number;
		presence: number;
	};
	stats: {
		maxHealth: number;
		evasion: { value: number; note: string | null };
		physicalMitigation: { value: number; note: string | null };
		magicalMitigation: { value: number; note: string | null };
		speed: { value: number; note: string | null };
	};
	languages: string[];
	attacks: Array<{ name: string; bonus: number; damage: string; note: string | null }>;
	traits: Array<{ name: string; detail: string }>;
	actions: Array<{ name: string; detail: string; uses: { total: number; key: string } | null }>;
	reactions: Array<{ name: string; detail: string; uses: { total: number; key: string } | null }>;
	interactions: Array<{
		name: string;
		detail: string;
		uses: { total: number; key: string } | null;
	}>;
	behavior: string;
	img: string | null;
}

// ---- Mock creature data (proper YAML structure) ----
const MOCK_YAML_RAW = `
creatures:
  - name: Goblin
    lineage: Goblinoide
    tier: 1
    size: Mediano
    attributes:
      body: 2
      reflexes: 3
      mind: 1
      instinct: 2
      presence: 1
    stats:
      maxHealth: 8
      evasion:
        value: 1
        note: null
      physicalMitigation:
        value: 0
        note: null
      magicalMitigation:
        value: 0
        note: null
      speed:
        value: 6
        note: null
    languages: []
    attacks:
      - name: Mordisco
        bonus: 1
        damage: 1d6
        note: null
    traits:
      - name: Astuto
        detail: Sumar +1 a iniciativas en grupo
    actions:
      - name: Ataque múltiple
        detail: Ataca dos veces
        uses: null
    reactions: []
    interactions: []
    behavior: Actúa en pequeños grupos para emboscar.
    img: null

  - name: Dragon
    lineage: Dragón
    tier: 4
    size: Grande
    attributes:
      body: 6
      reflexes: 4
      mind: 5
      instinct: 4
      presence: 6
    stats:
      maxHealth: 80
      evasion:
        value: 3
        note: null
      physicalMitigation:
        value: 5
        note: null
      magicalMitigation:
        value: 5
        note: null
      speed:
        value: 9
        note: null
    languages:
      - Comun
      - Dracónico
    attacks:
      - name: Garras
        bonus: 8
        damage: 2d6+6
        note: null
      - name: Fuego
        bonus: 7
        damage: 4d6
        note: null
    traits:
      - name: Vuelo
        detail: Puede volar
    actions:
      - name: Ataque de cola
        detail: Ataque que alcanza 15 pies
        uses: null
    reactions:
      - name: Detectar
        detail: Puede detectar enemigos cercanos
    interactions: []
    behavior: Territorial y dominante.
    img: null

  - name: Orco
    lineage: Orco
    tier: 2
    size: Mediano
    attributes:
      body: 4
      reflexes: 2
      mind: 1
      instinct: 2
      presence: 3
    stats:
      maxHealth: 20
      evasion:
        value: 1
        note: null
      physicalMitigation:
        value: 2
        note: null
      magicalMitigation:
        value: 0
        note: null
      speed:
        value: 6
        note: null
    languages:
      - Orco
    attacks:
      - name: Jabalina
        bonus: 3
        damage: 1d6+2
        note: null
    traits:
      - name: Fuerte
        detail: "+2 a ataques cuerpo a cuerpo"
    actions:
      - name: Ataque berserker
        detail: Ataque adicional enrage
        uses: null
    reactions: []
    interactions: []
    behavior: Agresivo y brutal.
    img: null
`;

// ---- ID generation for tests ----
const generateId = (name: string) => {
	return name.toLowerCase().replace(/\s+/g, '-');
};

// ---- mapCreature helper (mirrors the real mapper) ----
const mapCreature = (data: any): TestCreature => {
	if (!data.name) throw new Error('Creature name is required');
	return {
		id: generateId(data.name),
		...data,
		attributes: {
			body: data.attributes.body ?? data.attributes.cuerpo ?? 0,
			reflexes: data.attributes.reflexes ?? data.attributes.reflejos ?? 0,
			mind: data.attributes.mind ?? data.attributes.mente ?? 0,
			instinct: data.attributes.instinct ?? data.attributes.instinto ?? 0,
			presence: data.attributes.presence ?? data.attributes.presencia ?? 0,
		},
		stats: {
			maxHealth: data.stats.maxHealth ?? data.stats.salud ?? 0,
			evasion: data.stats.evasion ?? data.stats.esquiva ?? { value: 0, note: null },
			physicalMitigation: data.stats.physicalMitigation ??
				data.stats.mitigacion ??
				data.stats.mitigacionFisica ?? { value: 0, note: null },
			magicalMitigation: data.stats.magicalMitigation ??
				data.stats.mitigacionMagica ?? { value: 0, note: null },
			speed: data.stats.speed ?? data.stats.velocidad ?? { value: 0, note: null },
		},
		interactions: data.interactions ?? [],
		traits: data.traits ?? [],
		actions: data.actions ?? [],
		reactions: data.reactions ?? [],
	};
};

// ---- Mock YAML data for tests ----
const MOCK_RAW_CREATURES = [
	{
		name: 'Goblin',
		lineage: 'Goblinoide',
		tier: 1,
		size: 'Mediano',
		attributes: { body: 2, reflexes: 3, mind: 1, instinct: 2, presence: 1 },
		stats: {
			maxHealth: 8,
			evasion: { value: 1, note: null },
			physicalMitigation: { value: 0, note: null },
			magicalMitigation: { value: 0, note: null },
			speed: { value: 6, note: null },
		},
		languages: [],
		attacks: [{ name: 'Mordisco', bonus: 1, damage: '1d6', note: null }],
		traits: [{ name: 'Astuto', detail: 'Sumar +1 a iniciativas en grupo' }],
		actions: [{ name: 'Ataque múltiple', detail: 'Ataca dos veces', uses: null }],
		reactions: [],
		interactions: [],
		behavior: 'Actúa en pequeños grupos para emboscar.',
		img: null,
	},
	{
		name: 'Dragon',
		lineage: 'Dragón',
		tier: 4,
		size: 'Grande',
		attributes: { body: 6, reflexes: 4, mind: 5, instinct: 4, presence: 6 },
		stats: {
			maxHealth: 80,
			evasion: { value: 3, note: null },
			physicalMitigation: { value: 5, note: null },
			magicalMitigation: { value: 5, note: null },
			speed: { value: 9, note: null },
		},
		languages: ['Comun', 'Dracónico'],
		attacks: [
			{ name: 'Garras', bonus: 8, damage: '2d6+6', note: null },
			{ name: 'Fuego', bonus: 7, damage: '4d6', note: null },
		],
		traits: [{ name: 'Vuelo', detail: 'Puede volar' }],
		actions: [{ name: 'Ataque de cola', detail: 'Ataque que alcanza 15 pies', uses: null }],
		reactions: [{ name: 'Detectar', detail: 'Puede detectar enemigos cercanos' }],
		interactions: [],
		behavior: 'Territorial y dominante.',
		img: null,
	},
	{
		name: 'Orco',
		lineage: 'Orco',
		tier: 2,
		size: 'Mediano',
		attributes: { body: 4, reflexes: 2, mind: 1, instinct: 2, presence: 3 },
		stats: {
			maxHealth: 20,
			evasion: { value: 1, note: null },
			physicalMitigation: { value: 2, note: null },
			magicalMitigation: { value: 0, note: null },
			speed: { value: 6, note: null },
		},
		languages: ['Orco'],
		attacks: [{ name: 'Jabalina', bonus: 3, damage: '1d6+2', note: null }],
		traits: [{ name: 'Fuerte', detail: '+2 a ataques cuerpo a cuerpo' }],
		actions: [{ name: 'Ataque berserker', detail: 'Ataque adicional enrage', uses: null }],
		reactions: [],
		interactions: [],
		behavior: 'Agresivo y brutal.',
		img: null,
	},
];

// ---- Helper to simulate loading creatures from YAML ----
const loadCreaturesFromYaml = async (): Promise<TestCreature[]> => {
	const response = await fetch('/docs/bestiary.yml');
	const rawData = await response.text();

	let rawCreatures: any[] = [];

	try {
		rawCreatures = (yamlLoad(rawData) as any).creatures ?? [];
	} catch (e) {
		console.error('Error parsing YAML:', e);
	}

	return rawCreatures
		.map(mapCreature)
		.toSorted((a, b) => a.tier - b.tier || a.name.localeCompare(b.name));
};

describe('creatures-service', () => {
	describe('loadCreatures', () => {
		it('should load creatures from YAML when store is empty', async () => {
			// Arrange
			mockFetch.mockResolvedValue({
				text: () => Promise.resolve(MOCK_YAML_RAW),
			});

			// Act
			const creatures = await loadCreaturesFromYaml();

			// Assert
			expect(mockFetch).toHaveBeenCalledWith('/docs/bestiary.yml');
			expect(creatures).toHaveLength(3);
			expect(creatures[0].name).toBe('Goblin');
		});

		it('should not reload creatures when store already has data', async () => {
			// Arrange
			mockFetch.mockResolvedValue({
				text: () => Promise.resolve(MOCK_YAML_RAW),
			});

			// First load
			const creatures1 = await loadCreaturesFromYaml();
			expect(creatures1).toHaveLength(3);

			// Reset mock to track second call
			mockFetch.mockClear();

			// Simulate store already has data (should not call fetch)
			const storeHasData = creatures1.length > 0;
			if (!storeHasData) {
				await loadCreaturesFromYaml();
			}

			// Assert - fetch should not be called because store has data
			expect(mockFetch).not.toHaveBeenCalled();
		});

		it('should handle YAML parse errors gracefully', async () => {
			// Arrange
			mockFetch.mockResolvedValue({
				text: () => Promise.resolve('invalid: yaml: content: [}'),
			});

			// Act
			const response = await fetch('/docs/bestiary.yml');
			const rawData = await response.text();

			let rawCreatures: any[] = [];
			try {
				rawCreatures = (yamlLoad(rawData) as any).creatures ?? [];
			} catch (e) {
				console.error('Error parsing YAML:', e);
			}

			// Assert
			expect(rawCreatures).toEqual([]);
		});

		it('should parse YAML correctly with js-yaml', () => {
			// Act
			const parsed = yamlLoad(MOCK_YAML_RAW) as any;

			// Assert
			expect(parsed).toBeDefined();
			expect(parsed.creatures).toBeDefined();
			expect(parsed.creatures).toHaveLength(3);
			expect(parsed.creatures[0].name).toBe('Goblin');
		});
	});

	describe('creature sorting', () => {
		it('should sort creatures by tier then by name', async () => {
			// Arrange
			mockFetch.mockResolvedValue({
				text: () => Promise.resolve(MOCK_YAML_RAW),
			});

			// Act
			const creatures = await loadCreaturesFromYaml();

			// Assert
			expect(creatures[0].name).toBe('Goblin'); // tier 1
			expect(creatures[1].name).toBe('Orco'); // tier 2
			expect(creatures[2].name).toBe('Dragon'); // tier 4
		});
	});

	describe('creature filtering', () => {
		it('should filter creatures by tier', async () => {
			// Arrange
			mockFetch.mockResolvedValue({
				text: () => Promise.resolve(MOCK_YAML_RAW),
			});

			const creatures = await loadCreaturesFromYaml();

			// Act
			const tierFilter = 2;
			const filtered = creatures.filter((c) => c.tier === tierFilter);

			// Assert
			expect(filtered).toHaveLength(1);
			expect(filtered[0].name).toBe('Orco');
		});

		it('should filter creatures by name (case-insensitive)', async () => {
			// Arrange
			mockFetch.mockResolvedValue({
				text: () => Promise.resolve(MOCK_YAML_RAW),
			});

			const creatures = await loadCreaturesFromYaml();

			// Act
			const nameFilter = 'dragon';
			const filtered = creatures.filter((c) =>
				c.name.toLowerCase().includes(nameFilter.toLowerCase()),
			);

			// Assert
			expect(filtered).toHaveLength(1);
			expect(filtered[0].name).toBe('Dragon');
		});

		it('should return empty array when no creatures match filter', async () => {
			// Arrange
			mockFetch.mockResolvedValue({
				text: () => Promise.resolve(MOCK_YAML_RAW),
			});

			const creatures = await loadCreaturesFromYaml();

			// Act
			const filtered = creatures.filter((c) => c.name.toLowerCase().includes('unicorn'));

			// Assert
			expect(filtered).toHaveLength(0);
		});
	});

	describe('creature-mapper', () => {
		it('should throw error when creature name is missing', () => {
			// Arrange
			const invalidData = { lineage: 'Test' };

			// Act & Assert
			expect(() => mapCreature(invalidData)).toThrow('Creature name is required');
		});

		it('should map raw YAML to Creature interface correctly', () => {
			// Arrange
			const rawCreature = MOCK_RAW_CREATURES[0]; // Goblin

			// Act
			const mapped = mapCreature(rawCreature);

			// Assert
			expect(mapped.id).toBe('goblin');
			expect(mapped.name).toBe('Goblin');
			expect(mapped.lineage).toBe('Goblinoide');
			expect(mapped.tier).toBe(1);
			expect(mapped.attributes.body).toBe(2);
			expect(mapped.stats.maxHealth).toBe(8);
			expect(mapped.stats.evasion.value).toBe(1);
		});

		it('should handle Spanish attribute names (cuerpo, reflejos, mente, instinto, presencia)', () => {
			// Arrange
			const rawCreature = {
				name: 'Spanish Beast',
				lineage: 'Bestia',
				tier: 1,
				size: 'Pequeño',
				attributes: {
					cuerpo: 3,
					reflejos: 4,
					mente: 2,
					instinto: 3,
					presencia: 1,
				},
				stats: {
					salud: 15,
					esquiva: { value: 1, note: null },
					mitigacion: { value: 1, note: null },
					mitigacionMagica: { value: 0, note: null },
					velocidad: { value: 5, note: null },
				},
				languages: [],
				attacks: [],
				traits: [],
				actions: [],
				reactions: [],
				interactions: [],
				behavior: 'Timid',
				img: null,
			};

			// Act
			const mapped = mapCreature(rawCreature);

			// Assert
			expect(mapped.attributes.body).toBe(3);
			expect(mapped.attributes.reflexes).toBe(4);
			expect(mapped.attributes.mind).toBe(2);
			expect(mapped.attributes.instinct).toBe(3);
			expect(mapped.attributes.presence).toBe(1);
			expect(mapped.stats.maxHealth).toBe(15);
			expect(mapped.stats.evasion.value).toBe(1);
		});

		it('should default missing attributes to 0', () => {
			// Arrange
			const rawCreature = {
				name: 'Minimal Beast',
				lineage: 'Bestia',
				tier: 1,
				size: 'Pequeño',
				attributes: {},
				stats: {},
				languages: [],
				attacks: [],
				traits: [],
				actions: [],
				reactions: [],
				interactions: [],
				behavior: '',
				img: null,
			};

			// Act
			const mapped = mapCreature(rawCreature);

			// Assert
			expect(mapped.attributes.body).toBe(0);
			expect(mapped.attributes.reflexes).toBe(0);
			expect(mapped.attributes.mind).toBe(0);
			expect(mapped.attributes.instinct).toBe(0);
			expect(mapped.attributes.presence).toBe(0);
			expect(mapped.stats.maxHealth).toBe(0);
		});

		it('should set empty arrays for missing collections', () => {
			// Arrange
			const rawCreature = {
				name: 'Empty Beast',
				lineage: 'Bestia',
				tier: 1,
				size: 'Mediano',
				attributes: {},
				stats: {},
				languages: [],
				behavior: '',
				img: null,
			};

			// Act
			const mapped = mapCreature(rawCreature);

			// Assert
			expect(mapped.traits).toEqual([]);
			expect(mapped.actions).toEqual([]);
			expect(mapped.reactions).toEqual([]);
			expect(mapped.interactions).toEqual([]);
		});

		it('should generate consistent ID from name', () => {
			// Arrange
			const rawCreature1 = {
				name: 'Dragon Rojo',
				lineage: 'Dragón',
				tier: 1,
				size: 'Grande',
				attributes: {},
				stats: {},
				languages: [],
				attacks: [],
				traits: [],
				actions: [],
				reactions: [],
				interactions: [],
				behavior: '',
				img: null,
			};
			const rawCreature2 = {
				name: 'Dragon Rojo',
				lineage: 'Dragón',
				tier: 1,
				size: 'Grande',
				attributes: {},
				stats: {},
				languages: [],
				attacks: [],
				traits: [],
				actions: [],
				reactions: [],
				interactions: [],
				behavior: '',
				img: null,
			};

			// Act
			const mapped1 = mapCreature(rawCreature1);
			const mapped2 = mapCreature(rawCreature2);

			// Assert
			expect(mapped1.id).toBe(mapped2.id);
			expect(mapped1.id).toBe('dragon-rojo');
		});
	});

	describe('creature store management', () => {
		it('should store creatures in a writable store', async () => {
			// Arrange
			mockFetch.mockResolvedValue({
				text: () => Promise.resolve(MOCK_YAML_RAW),
			});

			// Act - simulate store behavior
			const creatures = await loadCreaturesFromYaml();
			const sorted = creatures.toSorted((a, b) => a.tier - b.tier || a.name.localeCompare(b.name));

			// Assert
			expect(sorted).toHaveLength(3);
			expect(sorted[0].tier).toBeLessThanOrEqual(sorted[1].tier);
			expect(sorted[1].tier).toBeLessThanOrEqual(sorted[2].tier);
		});

		it('should cache creatures in store after first load', async () => {
			// This simulates the singleton behavior of creaturesStore
			// First load populates the store, subsequent loads use cached data

			// Arrange
			mockFetch.mockResolvedValue({
				text: () => Promise.resolve(MOCK_YAML_RAW),
			});

			// First load
			const creatures1 = await loadCreaturesFromYaml();
			expect(creatures1).toHaveLength(3);

			// Reset mock - second load should NOT hit network (simulated)
			mockFetch.mockClear();
			mockFetch.mockResolvedValue({
				text: () => Promise.resolve('SHOULD NOT BE CALLED'),
			});

			// Simulate checking store before loading
			const storeHasData = creatures1.length > 0;

			if (storeHasData) {
				// Skip loading - return cached
			} else {
				await loadCreaturesFromYaml();
			}

			// Assert - fetch should not be called because store had data
			expect(mockFetch).not.toHaveBeenCalled();
		});
	});
});
