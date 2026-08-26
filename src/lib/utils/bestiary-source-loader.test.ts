/**
 * bestiary-source-loader tests
 *
 * Covers the shared web boundary that loads the bestiary manifest and each
 * individual YAML file through $app/paths.asset:
 * - manifest fetch/parse and empty-list fallback
 * - per-file fetch through asset, wrapper normalization, real mapper usage
 * - fault isolation: non-OK, empty, invalid YAML, invalid wrapper, and invalid
 *   mapping are logged with the filename and only that file is omitted
 * - manifest order preservation
 * - prompt-content Markdown consumer (loadBestiaryAsMD) from modular records
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { loadBestiaryAsMD } from './agent-content-loaders/bestiary-loader';
import { loadBestiaryCreatures } from './bestiary-source-loader';
import { generateId } from './id-generator';

vi.mock('$app/paths', () => ({
	asset: (path: string) => `/base${path}`,
}));

const mockFetch = vi.fn();
const mockConsoleError = vi.fn();

const MANIFEST_URL = '/base/docs/bestiary/index.json';
const GOBLIN_URL = '/base/docs/bestiary/goblin.yml';
const ORCO_URL = '/base/docs/bestiary/orco.yml';

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

const textResponse = (body: string, ok = true, status = 200) =>
	({ ok, status, text: async () => body }) as Response;

const manifestResponse = (files: string[], ok = true) =>
	({ ok, status: ok ? 200 : 500, json: async () => ({ files }) }) as Response;

const mockSingleFile = (filename: string, body: string, ok = true) => {
	mockFetch.mockImplementation((url: string) => {
		if (url === MANIFEST_URL) return Promise.resolve(manifestResponse([filename]));
		if (url.endsWith(`/${filename}`)) return Promise.resolve(textResponse(body, ok));
		return Promise.resolve(textResponse('', false));
	});
};

const loadAll = async () => {
	mockFetch.mockImplementation((url: string) => {
		if (url === MANIFEST_URL) return Promise.resolve(manifestResponse(['goblin.yml', 'orco.yml']));
		if (url === GOBLIN_URL) return Promise.resolve(textResponse(GOBLIN_YAML));
		if (url === ORCO_URL) return Promise.resolve(textResponse(ORCO_YAML));
		return Promise.resolve(textResponse('', false));
	});
	return loadBestiaryCreatures();
};

beforeEach(() => {
	vi.clearAllMocks();
	mockFetch.mockReset();
	global.fetch = mockFetch;
	vi.spyOn(console, 'error').mockImplementation(mockConsoleError);
});

afterEach(() => {
	vi.restoreAllMocks();
});

describe('loadBestiaryCreatures', () => {
	it('should fetch the manifest through the asset path', async () => {
		// Arrange
		mockFetch.mockResolvedValue(manifestResponse([]));

		// Act
		const creatures = await loadBestiaryCreatures();

		// Assert
		expect(mockFetch).toHaveBeenCalledWith(MANIFEST_URL);
		expect(creatures).toEqual([]);
	});

	it('should fetch each YAML file through the asset path and preserve manifest order', async () => {
		// Arrange
		mockFetch.mockImplementation((url: string) => {
			if (url === MANIFEST_URL)
				return Promise.resolve(manifestResponse(['orco.yml', 'goblin.yml']));
			if (url === ORCO_URL) return Promise.resolve(textResponse(ORCO_YAML));
			if (url === GOBLIN_URL) return Promise.resolve(textResponse(GOBLIN_YAML));
			return Promise.resolve(textResponse('', false));
		});

		// Act
		const creatures = await loadBestiaryCreatures();

		// Assert
		expect(mockFetch.mock.calls.map(([url]) => url)).toEqual([MANIFEST_URL, ORCO_URL, GOBLIN_URL]);
		expect(creatures.map((creature) => creature.name)).toEqual(['Orco', 'Goblin']);
	});

	it('should map each valid wrapper with the real mapper and stable ids', async () => {
		// Act
		const creatures = await loadAll();

		// Assert
		expect(creatures).toHaveLength(2);
		expect(creatures[0].name).toBe('Goblin');
		expect(creatures[0].tier).toBe(1);
		expect(creatures[0].id).toBe(generateId('Goblin'));
		expect(creatures[1].name).toBe('Orco');
		expect(creatures[1].id).toBe(generateId('Orco'));
	});

	it('should log and skip a file when the fetch response is not OK', async () => {
		// Arrange
		mockFetch.mockImplementation((url: string) => {
			if (url === MANIFEST_URL)
				return Promise.resolve(manifestResponse(['goblin.yml', 'orco.yml']));
			if (url === GOBLIN_URL) return Promise.resolve(textResponse(GOBLIN_YAML, false, 500));
			if (url === ORCO_URL) return Promise.resolve(textResponse(ORCO_YAML));
			return Promise.resolve(textResponse('', false));
		});

		// Act
		const creatures = await loadBestiaryCreatures();

		// Assert
		expect(creatures.map((creature) => creature.name)).toEqual(['Orco']);
		expect(mockConsoleError).toHaveBeenCalledWith(
			expect.stringContaining('goblin.yml'),
			expect.anything(),
		);
		expect(mockConsoleError.mock.calls[0][0]).toContain(GOBLIN_URL);
	});

	it('should log and skip an empty file', async () => {
		// Arrange
		mockSingleFile('goblin.yml', '');

		// Act
		const creatures = await loadBestiaryCreatures();

		// Assert
		expect(creatures).toEqual([]);
		expect(mockConsoleError).toHaveBeenCalledWith(
			expect.stringContaining('goblin.yml'),
			expect.anything(),
		);
	});

	it('should log and skip a file with invalid YAML', async () => {
		// Arrange
		mockSingleFile('goblin.yml', 'invalid: yaml: content: [}');

		// Act
		const creatures = await loadBestiaryCreatures();

		// Assert
		expect(creatures).toEqual([]);
		expect(mockConsoleError).toHaveBeenCalledWith(
			expect.stringContaining('goblin.yml'),
			expect.anything(),
		);
	});

	it('should log and skip a file without a creatures wrapper', async () => {
		// Arrange
		mockSingleFile('goblin.yml', 'name: Goblin');

		// Act
		const creatures = await loadBestiaryCreatures();

		// Assert
		expect(creatures).toEqual([]);
		expect(mockConsoleError).toHaveBeenCalledWith(
			expect.stringContaining('goblin.yml'),
			expect.anything(),
		);
	});

	it('should log and skip a file with a non-array creatures wrapper', async () => {
		// Arrange
		mockSingleFile('goblin.yml', 'creatures:\n  name: Goblin');

		// Act
		const creatures = await loadBestiaryCreatures();

		// Assert
		expect(creatures).toEqual([]);
		expect(mockConsoleError).toHaveBeenCalledWith(
			expect.stringContaining('goblin.yml'),
			expect.anything(),
		);
	});

	it('should log and skip a file with an empty creatures wrapper', async () => {
		// Arrange
		mockSingleFile('goblin.yml', 'creatures: []');

		// Act
		const creatures = await loadBestiaryCreatures();

		// Assert
		expect(creatures).toEqual([]);
		expect(mockConsoleError).toHaveBeenCalledWith(
			expect.stringContaining('goblin.yml'),
			expect.anything(),
		);
	});

	it('should log and skip a file with more than one creature in the wrapper', async () => {
		// Arrange
		mockSingleFile(
			'goblin.yml',
			`creatures:
  - name: Goblin
  - name: Segundo
`,
		);

		// Act
		const creatures = await loadBestiaryCreatures();

		// Assert
		expect(creatures).toEqual([]);
		expect(mockConsoleError).toHaveBeenCalledWith(
			expect.stringContaining('goblin.yml'),
			expect.anything(),
		);
	});

	it('should log and skip a file whose creature cannot be mapped', async () => {
		// Arrange
		mockSingleFile('goblin.yml', 'creatures:\n  - lineage: Sin nombre');

		// Act
		const creatures = await loadBestiaryCreatures();

		// Assert
		expect(creatures).toEqual([]);
		expect(mockConsoleError).toHaveBeenCalledWith(
			expect.stringContaining('goblin.yml'),
			expect.anything(),
		);
	});

	it('should keep loading the remaining files after one file fails', async () => {
		// Arrange
		mockFetch.mockImplementation((url: string) => {
			if (url === MANIFEST_URL)
				return Promise.resolve(manifestResponse(['goblin.yml', 'orco.yml']));
			if (url === GOBLIN_URL) return Promise.resolve(textResponse('creatures: []'));
			if (url === ORCO_URL) return Promise.resolve(textResponse(ORCO_YAML));
			return Promise.resolve(textResponse('', false));
		});

		// Act
		const creatures = await loadBestiaryCreatures();

		// Assert
		expect(creatures.map((creature) => creature.name)).toEqual(['Orco']);
		expect(mockConsoleError).toHaveBeenCalledTimes(1);
		expect(mockConsoleError).toHaveBeenCalledWith(
			expect.stringContaining('goblin.yml'),
			expect.anything(),
		);
	});

	it('should return an empty list and log when the manifest fetch is not OK', async () => {
		// Arrange
		mockFetch.mockResolvedValue(manifestResponse([], false));

		// Act
		const creatures = await loadBestiaryCreatures();

		// Assert
		expect(creatures).toEqual([]);
		expect(mockConsoleError).toHaveBeenCalledWith(
			expect.stringContaining('index.json'),
			expect.anything(),
		);
	});

	it('should return an empty list and log when the manifest body is not JSON', async () => {
		// Arrange
		mockFetch.mockResolvedValue({
			ok: true,
			status: 200,
			json: async () => {
				throw new Error('Unexpected token');
			},
		} as unknown as Response);

		// Act
		const creatures = await loadBestiaryCreatures();

		// Assert
		expect(creatures).toEqual([]);
		expect(mockConsoleError).toHaveBeenCalledWith(
			expect.stringContaining('index.json'),
			expect.anything(),
		);
	});

	it.each([
		['files is not an array', { files: 'goblin.yml' }],
		['files contains non-string entries', { files: ['goblin.yml', 42] }],
	])('should return an empty list and log when %s', async (_label, body) => {
		// Arrange
		mockFetch.mockResolvedValue({ ok: true, status: 200, json: async () => body } as Response);

		// Act
		const creatures = await loadBestiaryCreatures();

		// Assert
		expect(creatures).toEqual([]);
		expect(mockConsoleError).toHaveBeenCalledWith(
			expect.stringContaining('index.json'),
			expect.anything(),
		);
	});
});

describe('loadBestiaryAsMD', () => {
	it('should render the Markdown table from modular records through the shared loader', async () => {
		// Arrange
		await loadAll();

		// Act
		const markdown = await loadBestiaryAsMD();

		// Assert
		expect(markdown).toContain('| **Nombre**');
		expect(markdown).toContain('| Goblin |');
		expect(markdown).toContain('| Orco |');
	});
});
