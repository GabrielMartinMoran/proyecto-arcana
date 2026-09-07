/**
 * creatures-service tests
 *
 * Integration tests exercising the real loader + mapper + service contract:
 * - registry-driven loading through the shared bestiary-source-loader (no
 *   runtime manifest)
 * - singleton store caching (no refetch once populated)
 * - tier/name sorting, consumer filtering, and mapper behavior
 *
 * The YAML fetches are mocked at the boundary to isolate the service. Modules
 * are reset per test so the loader cache starts fresh, mirroring a new SPA
 * session.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { get } from 'svelte/store';
import { mapCreature } from '$lib/mappers/creature-mapper';
import { generateId } from '$lib/utils/id-generator';

const { testBestiarySourceFiles } = vi.hoisted(() => {
	const testBestiarySourceFiles = [
		'/docs/bestiary/dragon.yml',
		'/docs/bestiary/goblin.yml',
		'/docs/bestiary/orco.yml',
	];
	return { testBestiarySourceFiles };
});

vi.mock('$app/paths', () => ({
	asset: (path: string) => path,
}));

vi.mock('$lib/generated/bestiary-source-files', () => ({
	BESTIARY_SOURCE_FILES: testBestiarySourceFiles,
}));

const mockFetch = vi.fn();
const mockConsoleError = vi.fn();

const GOBLIN_URL = '/docs/bestiary/goblin.yml';
const ORCO_URL = '/docs/bestiary/orco.yml';
const DRAGON_URL = '/docs/bestiary/dragon.yml';

const GOBLIN_YAML = `creatures:
  - name: Goblin
    lineage: Goblinoide
    tier: 1
    size: Pequeño
    attributes:
      body: 1
      reflexes: 2
      mind: 1
      instinct: 2
      presence: 1
    stats:
      maxHealth: 7
      evasion: { value: 8, note: null }
      physicalMitigation: { value: 0, note: null }
      magicalMitigation: { value: 0, note: null }
      speed: { value: 8, note: null }
    languages: []
    attacks: []
    traits: []
    actions: []
    reactions: []
    interactions: []
    behavior: Test
    img: null
`;

const ORCO_YAML = `creatures:
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
      evasion: { value: 1, note: null }
      physicalMitigation: { value: 2, note: null }
      magicalMitigation: { value: 0, note: null }
      speed: { value: 6, note: null }
    languages: []
    attacks: []
    traits: []
    actions: []
    reactions: []
    interactions: []
    behavior: Test
    img: null
`;

const DRAGON_YAML = `creatures:
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
      evasion: { value: 3, note: null }
      physicalMitigation: { value: 5, note: null }
      magicalMitigation: { value: 5, note: null }
      speed: { value: 9, note: null }
    languages:
      - Comun
      - Dracónico
    attacks: []
    traits: []
    actions: []
    reactions: []
    interactions: []
    behavior: Test
    img: null
`;

const yamlBodies: Record<string, string> = {
	'goblin.yml': GOBLIN_YAML,
	'orco.yml': ORCO_YAML,
	'dragon.yml': DRAGON_YAML,
};

const setRegistryResponses = () => {
	mockFetch.mockImplementation((url: string) => {
		const filename = url.split('/').pop();
		if (filename && filename in yamlBodies) {
			return Promise.resolve({
				ok: true,
				status: 200,
				text: async () => yamlBodies[filename],
			} as Response);
		}
		return Promise.resolve({ ok: false, status: 404, text: async () => '' } as Response);
	});
};

beforeEach(() => {
	vi.resetModules();
	vi.clearAllMocks();
	mockFetch.mockReset();
	mockConsoleError.mockReset();
	vi.spyOn(console, 'error').mockImplementation(mockConsoleError);
	vi.stubGlobal('fetch', mockFetch);
	yamlBodies['goblin.yml'] = GOBLIN_YAML;
	yamlBodies['orco.yml'] = ORCO_YAML;
	yamlBodies['dragon.yml'] = DRAGON_YAML;
});

afterEach(() => {
	vi.unstubAllGlobals();
	vi.restoreAllMocks();
});

const useFreshCreaturesService = async () => {
	const { useCreaturesService } = await import('./creatures-service');
	return useCreaturesService();
};

describe('creatures-service', () => {
	describe('loadCreatures', () => {
		it('should load creatures from the registry files without a runtime manifest', async () => {
			// Arrange
			setRegistryResponses();
			const { loadCreatures, creatures } = await useFreshCreaturesService();

			// Act
			await loadCreatures();

			// Assert
			expect(mockFetch.mock.calls.map(([url]) => url)).toEqual([DRAGON_URL, GOBLIN_URL, ORCO_URL]);
			expect(mockFetch).not.toHaveBeenCalledWith(expect.stringContaining('index.json'));
			expect(get(creatures)).toHaveLength(3);
			expect(get(creatures).map((creature) => creature.name)).toEqual(['Goblin', 'Orco', 'Dragon']);
		});

		it('should not refetch when the singleton store already has data', async () => {
			// Arrange
			setRegistryResponses();
			const { loadCreatures, creatures } = await useFreshCreaturesService();
			await loadCreatures();
			expect(get(creatures)).toHaveLength(3);

			// Make any further fetch attempt fail loudly
			mockFetch.mockClear();
			mockFetch.mockImplementation(() => {
				throw new Error('fetch should not be called after cache is populated');
			});

			// Act
			await loadCreatures();

			// Assert
			expect(mockFetch).not.toHaveBeenCalled();
			expect(get(creatures)).toHaveLength(3);
		});

		it('should sort creatures by tier then by name regardless of registry order', async () => {
			// Arrange — registry order differs from the sorted contract order
			setRegistryResponses();
			const { loadCreatures, creatures } = await useFreshCreaturesService();

			// Act
			await loadCreatures();

			// Assert
			expect(get(creatures).map((creature) => creature.name)).toEqual(['Goblin', 'Orco', 'Dragon']);
			expect(get(creatures)[0].tier).toBeLessThanOrEqual(get(creatures)[1].tier);
			expect(get(creatures)[1].tier).toBeLessThanOrEqual(get(creatures)[2].tier);
		});

		it('should omit an invalid file and keep the remaining creatures', async () => {
			// Arrange
			setRegistryResponses();
			yamlBodies['goblin.yml'] = 'creatures: []';
			const { loadCreatures, creatures } = await useFreshCreaturesService();

			// Act
			await loadCreatures();

			// Assert
			expect(get(creatures).map((creature) => creature.name)).toEqual(['Orco', 'Dragon']);
			expect(mockConsoleError).toHaveBeenCalledWith(
				expect.stringContaining('goblin.yml'),
				expect.anything(),
			);
		});

		it('should leave the store empty when no creature file can be fetched', async () => {
			// Arrange
			mockFetch.mockResolvedValue({
				ok: false,
				status: 500,
				text: async () => '',
			} as Response);
			const { loadCreatures, creatures } = await useFreshCreaturesService();

			// Act
			await loadCreatures();

			// Assert
			expect(get(creatures)).toEqual([]);
			expect(mockConsoleError).toHaveBeenCalled();
		});
	});

	describe('creature filtering (consumer contract)', () => {
		it('should filter creatures by tier', async () => {
			// Arrange
			setRegistryResponses();
			const { loadCreatures, creatures } = await useFreshCreaturesService();
			await loadCreatures();

			// Act
			const filtered = get(creatures).filter((creature) => creature.tier === 2);

			// Assert
			expect(filtered).toHaveLength(1);
			expect(filtered[0].name).toBe('Orco');
		});

		it('should filter creatures by name (case-insensitive)', async () => {
			// Arrange
			setRegistryResponses();
			const { loadCreatures, creatures } = await useFreshCreaturesService();
			await loadCreatures();

			// Act
			const filtered = get(creatures).filter((creature) =>
				creature.name.toLowerCase().includes('dragon'),
			);

			// Assert
			expect(filtered).toHaveLength(1);
			expect(filtered[0].name).toBe('Dragon');
		});

		it('should return an empty array when no creatures match the filter', async () => {
			// Arrange
			setRegistryResponses();
			const { loadCreatures, creatures } = await useFreshCreaturesService();
			await loadCreatures();

			// Act
			const filtered = get(creatures).filter((creature) =>
				creature.name.toLowerCase().includes('unicorn'),
			);

			// Assert
			expect(filtered).toEqual([]);
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
			const rawCreature = {
				name: 'Goblin',
				lineage: 'Goblinoide',
				tier: 1,
				size: 'Pequeño',
				attributes: { body: 2, reflexes: 3, mind: 1, instinct: 2, presence: 1 },
				stats: {
					maxHealth: 8,
					evasion: { value: 1, note: null },
					physicalMitigation: { value: 0, note: null },
					magicalMitigation: { value: 0, note: null },
					speed: { value: 6, note: null },
				},
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
			expect(mapped.id).toBe(generateId('Goblin'));
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

		it('should generate a consistent id from the creature name', () => {
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
			const rawCreature2 = { ...rawCreature1 };

			// Act
			const mapped1 = mapCreature(rawCreature1);
			const mapped2 = mapCreature(rawCreature2);

			// Assert
			expect(mapped1.id).toBe(mapped2.id);
			expect(mapped1.id).toBe(generateId('Dragon Rojo'));
		});
	});
});
