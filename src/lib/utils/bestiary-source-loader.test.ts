/**
 * bestiary-source-loader tests
 *
 * Covers the shared web boundary that loads the bestiary YAML files through
 * $app/paths.asset from the generated build-time registry:
 * - zero runtime manifest fetches and one fetch per safe registered YAML
 * - all YAML fetches start before any response resolves (parallel load) while
 *   the output keeps canonical registry order
 * - module-level cache: sequential reuse, concurrent deduplication, and
 *   sharing between the creatures service and the Markdown loader
 * - global error releases the cache so the next call retries
 * - fault isolation: a broken YAML is logged with its path and omitted while
 *   valid files keep loading; the valid partial result is cached
 * - isSafeFilename guard: registry entries with separators/traversal are
 *   skipped with a contextual error and never fetched
 * - module reset simulates a page reload and starts a fresh load
 * - mapper contract: sha1(name) ids, mapped fields and Markdown row order
 */

import { get } from 'svelte/store';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { mockAsset, testBestiarySourceFiles } = vi.hoisted(() => {
	const mockAsset = vi.fn((path: string) => `/base${path}`);
	const testBestiarySourceFiles = [
		'/docs/bestiary/goblin.yml',
		'/docs/bestiary/broken.yml',
		'/docs/bestiary/orco.yml',
		'/docs/bestiary/../secret.yml',
	];
	return { mockAsset, testBestiarySourceFiles };
});

vi.mock('$app/paths', () => ({
	asset: mockAsset,
}));

vi.mock('$lib/generated/bestiary-source-files', () => ({
	BESTIARY_SOURCE_FILES: testBestiarySourceFiles,
}));

const GOBLIN_URL = '/base/docs/bestiary/goblin.yml';
const BROKEN_URL = '/base/docs/bestiary/broken.yml';
const ORCO_URL = '/base/docs/bestiary/orco.yml';
const UNSAFE_URL = '/base/docs/bestiary/../secret.yml';

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

const okResponse = (body: string): Response =>
	({ ok: true, status: 200, text: async () => body }) as Response;

const notOkResponse = (status = 500): Response =>
	({ ok: false, status, text: async () => '' }) as Response;

const creatureResponsesByUrl = (): Record<string, Response> => ({
	[GOBLIN_URL]: okResponse(GOBLIN_YAML),
	[BROKEN_URL]: okResponse(': : :\n- not: [valid'),
	[ORCO_URL]: okResponse(ORCO_YAML),
});

const mockFetchByUrl = (responses: Record<string, Response>) => {
	const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
		const url = String(input);
		const response = responses[url];
		if (!response) throw new Error(`unexpected fetch: ${url}`);
		return response;
	});
	vi.stubGlobal('fetch', fetchMock);
	return fetchMock;
};

interface Deferred<T> {
	promise: Promise<T>;
	resolve: (value: T) => void;
	reject: (reason?: unknown) => void;
}

const createDeferred = <T>(): Deferred<T> => {
	let resolve!: (value: T) => void;
	let reject!: (reason?: unknown) => void;
	const promise = new Promise<T>((res, rej) => {
		resolve = res;
		reject = rej;
	});
	return { promise, resolve, reject };
};

const collectConsoleError = (): { errors: unknown[][]; restore: () => void } => {
	const errors: unknown[][] = [];
	const spy = vi.spyOn(console, 'error').mockImplementation((...args: unknown[]) => {
		errors.push(args);
	});
	return { errors, restore: () => spy.mockRestore() };
};

describe('bestiary source loader', () => {
	beforeEach(() => {
		vi.resetModules();
		mockAsset.mockReset();
		mockAsset.mockImplementation((path: string) => `/base${path}`);
	});

	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it('should fetch every safe registered YAML through asset URLs without a runtime manifest', async () => {
		const fetchMock = mockFetchByUrl(creatureResponsesByUrl());
		const { errors, restore } = collectConsoleError();

		const { loadBestiaryCreatures } = await import('./bestiary-source-loader');
		const creatures = await loadBestiaryCreatures();

		restore();
		expect(fetchMock).not.toHaveBeenCalledWith(expect.stringContaining('index.json'));
		expect(fetchMock).toHaveBeenCalledTimes(3);
		for (const url of [GOBLIN_URL, BROKEN_URL, ORCO_URL]) {
			expect(fetchMock).toHaveBeenCalledWith(url);
		}
		expect(fetchMock).not.toHaveBeenCalledWith(UNSAFE_URL);
		expect(mockAsset).toHaveBeenCalledWith('/docs/bestiary/goblin.yml');
		expect(mockAsset).toHaveBeenCalledWith('/docs/bestiary/broken.yml');
		expect(mockAsset).toHaveBeenCalledWith('/docs/bestiary/orco.yml');
		expect(creatures.map((creature) => creature.name)).toEqual(['Goblin', 'Orco']);
		expect(errors.some((args) => String(args[0]).includes('/docs/bestiary/broken.yml'))).toBe(true);
	});

	it('should start every YAML fetch before any response resolves and keep canonical order', async () => {
		const deferredByUrl = new Map<string, Deferred<Response>>();
		const fetchMock = vi.fn((input: RequestInfo | URL) => {
			const url = String(input);
			const deferred = createDeferred<Response>();
			deferredByUrl.set(url, deferred);
			return deferred.promise;
		});
		vi.stubGlobal('fetch', fetchMock);

		const { loadBestiaryCreatures } = await import('./bestiary-source-loader');
		const loadPromise = loadBestiaryCreatures();

		expect(fetchMock).toHaveBeenCalledTimes(3);
		for (const url of [GOBLIN_URL, BROKEN_URL, ORCO_URL]) {
			expect(deferredByUrl.has(url)).toBe(true);
		}
		expect(deferredByUrl.has(UNSAFE_URL)).toBe(false);

		deferredByUrl.get(GOBLIN_URL)!.resolve(okResponse(GOBLIN_YAML));
		deferredByUrl.get(BROKEN_URL)!.resolve(okResponse(': : :\n- not: [valid'));
		deferredByUrl.get(ORCO_URL)!.resolve(okResponse(ORCO_YAML));

		const creatures = await loadPromise;
		expect(creatures.map((creature) => creature.name)).toEqual(['Goblin', 'Orco']);
	});

	it('should reuse the resolved result on a second sequential call', async () => {
		const fetchMock = mockFetchByUrl(creatureResponsesByUrl());

		const { loadBestiaryCreatures } = await import('./bestiary-source-loader');
		const first = await loadBestiaryCreatures();
		const second = await loadBestiaryCreatures();

		expect(second).toBe(first);
		expect(fetchMock).toHaveBeenCalledTimes(3);
	});

	it('should share a single in-flight load between concurrent calls', async () => {
		const fetchMock = mockFetchByUrl(creatureResponsesByUrl());

		const { loadBestiaryCreatures } = await import('./bestiary-source-loader');
		const firstCall = loadBestiaryCreatures();
		const secondCall = loadBestiaryCreatures();

		expect(secondCall).toBe(firstCall);
		await expect(secondCall).resolves.toHaveLength(2);
		expect(fetchMock).toHaveBeenCalledTimes(3);
	});

	it('should share the load between the creatures service and the markdown loader', async () => {
		const fetchMock = mockFetchByUrl(creatureResponsesByUrl());

		const [creaturesModule, markdownModule] = await Promise.all([
			import('$lib/services/creatures-service'),
			import('$lib/utils/agent-content-loaders/bestiary-loader'),
		]);

		const creaturesService = creaturesModule.useCreaturesService();
		await Promise.all([creaturesService.loadCreatures(), markdownModule.loadBestiaryAsMD()]);

		expect(fetchMock).toHaveBeenCalledTimes(3);
		expect(get(creaturesService.creatures)).toHaveLength(2);
	});

	it('should not cache a rejected load and should retry on the next call', async () => {
		mockAsset.mockImplementationOnce(() => {
			throw new Error('asset resolution failed');
		});
		const fetchMock = mockFetchByUrl(creatureResponsesByUrl());

		const { loadBestiaryCreatures } = await import('./bestiary-source-loader');
		await expect(loadBestiaryCreatures()).rejects.toThrow('asset resolution failed');
		expect(fetchMock).not.toHaveBeenCalled();

		const creatures = await loadBestiaryCreatures();
		expect(creatures.map((creature) => creature.name)).toEqual(['Goblin', 'Orco']);
		expect(fetchMock).toHaveBeenCalledTimes(3);
	});

	it('should isolate an invalid YAML and cache the valid partial result', async () => {
		const fetchMock = mockFetchByUrl(creatureResponsesByUrl());
		const { errors, restore } = collectConsoleError();

		const { loadBestiaryCreatures } = await import('./bestiary-source-loader');
		const creatures = await loadBestiaryCreatures();

		restore();
		expect(creatures.map((creature) => creature.name)).toEqual(['Goblin', 'Orco']);
		expect(errors.some((args) => String(args[0]).includes('/docs/bestiary/broken.yml'))).toBe(true);

		await loadBestiaryCreatures();
		expect(fetchMock).toHaveBeenCalledTimes(3);
	});

	it('should log and skip a file when the fetch response is not OK', async () => {
		// Arrange — goblin.yml responds with a server error, orco.yml is valid
		const responses = creatureResponsesByUrl();
		responses[GOBLIN_URL] = notOkResponse(500);
		const fetchMock = mockFetchByUrl(responses);
		const { errors, restore } = collectConsoleError();

		const { loadBestiaryCreatures } = await import('./bestiary-source-loader');
		const creatures = await loadBestiaryCreatures();

		restore();
		expect(creatures.map((creature) => creature.name)).toEqual(['Orco']);
		expect(errors.some((args) => String(args[0]).includes('/docs/bestiary/goblin.yml'))).toBe(true);
		expect(errors.some((args) => String(args[0]).includes(GOBLIN_URL))).toBe(true);
		expect(fetchMock).toHaveBeenCalledWith(GOBLIN_URL);
	});

	it('should log and skip an empty file', async () => {
		// Arrange — goblin.yml is empty, orco.yml is valid
		const responses = creatureResponsesByUrl();
		responses[GOBLIN_URL] = okResponse('');
		mockFetchByUrl(responses);
		const { errors, restore } = collectConsoleError();

		const { loadBestiaryCreatures } = await import('./bestiary-source-loader');
		const creatures = await loadBestiaryCreatures();

		restore();
		expect(creatures.map((creature) => creature.name)).toEqual(['Orco']);
		expect(errors.some((args) => String(args[0]).includes('/docs/bestiary/goblin.yml'))).toBe(true);
	});

	it('should log and skip a file without a creatures wrapper', async () => {
		// Arrange — goblin.yml has no creatures key, orco.yml is valid
		const responses = creatureResponsesByUrl();
		responses[GOBLIN_URL] = okResponse('name: Goblin');
		mockFetchByUrl(responses);
		const { errors, restore } = collectConsoleError();

		const { loadBestiaryCreatures } = await import('./bestiary-source-loader');
		const creatures = await loadBestiaryCreatures();

		restore();
		expect(creatures.map((creature) => creature.name)).toEqual(['Orco']);
		expect(errors.some((args) => String(args[0]).includes('/docs/bestiary/goblin.yml'))).toBe(true);
	});

	it('should log and skip a file whose creatures value is not an array', async () => {
		// Arrange — goblin.yml wraps a single object instead of an array
		const responses = creatureResponsesByUrl();
		responses[GOBLIN_URL] = okResponse('creatures:\n  name: Goblin');
		mockFetchByUrl(responses);
		const { errors, restore } = collectConsoleError();

		const { loadBestiaryCreatures } = await import('./bestiary-source-loader');
		const creatures = await loadBestiaryCreatures();

		restore();
		expect(creatures.map((creature) => creature.name)).toEqual(['Orco']);
		expect(errors.some((args) => String(args[0]).includes('/docs/bestiary/goblin.yml'))).toBe(true);
	});

	it('should log and skip a file with more than one creature in the wrapper', async () => {
		// Arrange — goblin.yml wraps two creatures when exactly one is expected
		const responses = creatureResponsesByUrl();
		responses[GOBLIN_URL] = okResponse('creatures:\n  - name: Goblin\n  - name: Segundo\n');
		mockFetchByUrl(responses);
		const { errors, restore } = collectConsoleError();

		const { loadBestiaryCreatures } = await import('./bestiary-source-loader');
		const creatures = await loadBestiaryCreatures();

		restore();
		expect(creatures.map((creature) => creature.name)).toEqual(['Orco']);
		expect(errors.some((args) => String(args[0]).includes('/docs/bestiary/goblin.yml'))).toBe(true);
	});

	it('should log and skip a file whose creature cannot be mapped', async () => {
		// Arrange — goblin.yml lacks the required name so mapCreature throws
		const responses = creatureResponsesByUrl();
		responses[GOBLIN_URL] = okResponse('creatures:\n  - lineage: Sin nombre');
		mockFetchByUrl(responses);
		const { errors, restore } = collectConsoleError();

		const { loadBestiaryCreatures } = await import('./bestiary-source-loader');
		const creatures = await loadBestiaryCreatures();

		restore();
		expect(creatures.map((creature) => creature.name)).toEqual(['Orco']);
		expect(errors.some((args) => String(args[0]).includes('/docs/bestiary/goblin.yml'))).toBe(true);
	});

	it('should skip an unsafe source path without fetching it and log a contextual error', async () => {
		const fetchMock = mockFetchByUrl(creatureResponsesByUrl());
		const { errors, restore } = collectConsoleError();

		const { loadBestiaryCreatures } = await import('./bestiary-source-loader');
		const creatures = await loadBestiaryCreatures();

		restore();
		expect(creatures.map((creature) => creature.name)).toEqual(['Goblin', 'Orco']);
		expect(fetchMock).not.toHaveBeenCalledWith(UNSAFE_URL);
		expect(errors.some((args) => String(args[0]).includes('/docs/bestiary/../secret.yml'))).toBe(
			true,
		);
	});

	it('should start a fresh load after module reset, simulating a page reload', async () => {
		const fetchMock = mockFetchByUrl(creatureResponsesByUrl());

		const firstLoad = await import('./bestiary-source-loader');
		await firstLoad.loadBestiaryCreatures();
		expect(fetchMock).toHaveBeenCalledTimes(3);

		vi.resetModules();
		const { loadBestiaryCreatures } = await import('./bestiary-source-loader');
		const reloadedCreatures = await loadBestiaryCreatures();
		expect(reloadedCreatures.map((creature) => creature.name)).toEqual(['Goblin', 'Orco']);
		expect(fetchMock).toHaveBeenCalledTimes(6);
	});

	it('should map creatures preserving ids, fields and canonical registry order', async () => {
		mockFetchByUrl(creatureResponsesByUrl());

		const { loadBestiaryCreatures } = await import('./bestiary-source-loader');
		const creatures = await loadBestiaryCreatures();

		expect(creatures).toHaveLength(2);
		expect(creatures.map((creature) => creature.name)).toEqual(['Goblin', 'Orco']);
		const [goblin, orco] = creatures;
		expect(goblin.id).toMatch(/^[0-9a-f]{40}$/);
		expect(goblin.name).toBe('Goblin');
		expect(goblin.lineage).toBe('Goblinoide');
		expect(goblin.tier).toBe(1);
		expect(goblin.size).toBe('Pequeño');
		expect(goblin.attributes.body).toBe(1);
		expect(goblin.stats.maxHealth).toBe(7);
		expect(orco.name).toBe('Orco');
		expect(orco.tier).toBe(2);
	});

	it('should render the Markdown table in canonical registry order through the shared loader', async () => {
		const fetchMock = mockFetchByUrl(creatureResponsesByUrl());

		const { loadBestiaryAsMD } = await import('./agent-content-loaders/bestiary-loader');
		const markdown = await loadBestiaryAsMD();

		expect(markdown).toContain('| **Nombre**');
		const goblinRowIndex = markdown.indexOf('| Goblin |');
		const orcoRowIndex = markdown.indexOf('| Orco |');
		expect(goblinRowIndex).toBeGreaterThan(-1);
		expect(orcoRowIndex).toBeGreaterThan(-1);
		expect(goblinRowIndex).toBeLessThan(orcoRowIndex);
		expect(fetchMock).toHaveBeenCalledTimes(3);
	});
});
