import { get } from 'svelte/store';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { mockAsset, testCardSourceFiles } = vi.hoisted(() => {
	const mockAsset = vi.fn((path: string) => `/base${path}`);
	const testCardSourceFiles = [
		'/docs/cards/z-last.yml',
		'/docs/cards/broken.yml',
		'/docs/cards/a-first.yml',
	];
	return { mockAsset, testCardSourceFiles };
});

vi.mock('$app/paths', () => ({
	asset: mockAsset,
}));

vi.mock('$lib/generated/card-source-files', () => ({
	CARD_SOURCE_FILES: testCardSourceFiles,
}));

const TEST_CARD_URLS = testCardSourceFiles.map((path) => `/base${path}`);

const rawCard = (name: string, tag: string, extras: string = ''): string =>
	`  - name: ${name}
    level: 1
    type: activable
    tags: [${tag}]
    requirements: null
    description: Descripción de ${name}.${extras}
    uses: { type: RELOAD, qty: 3 }`;

const cardYaml = (...rawCards: string[]): string => `cards:\n${rawCards.join('\n')}\n`;

const okResponse = (body: unknown): Response =>
	({
		ok: true,
		status: 200,
		json: async () => body,
		text: async () => (typeof body === 'string' ? body : JSON.stringify(body)),
	}) as Response;

const cardResponsesByUrl = (): Record<string, Response> => ({
	'/base/docs/cards/z-last.yml': okResponse(cardYaml(rawCard('Zeta', 'Mago'))),
	'/base/docs/cards/broken.yml': okResponse(': : :\n- not: [valid'),
	'/base/docs/cards/a-first.yml': okResponse(cardYaml(rawCard('Alfa', 'Bardo'))),
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

describe('cards source loader', () => {
	beforeEach(() => {
		vi.resetModules();
		mockAsset.mockReset();
		mockAsset.mockImplementation((path: string) => `/base${path}`);
	});

	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it('should fetch every registered YAML through asset URLs without a runtime manifest', async () => {
		const fetchMock = mockFetchByUrl(cardResponsesByUrl());
		const { errors, restore } = collectConsoleError();

		const { loadAbilityCards } = await import('./cards-source-loader');
		const cards = await loadAbilityCards();

		restore();
		expect(fetchMock).not.toHaveBeenCalledWith(expect.stringContaining('index.json'));
		expect(fetchMock).toHaveBeenCalledTimes(TEST_CARD_URLS.length);
		for (const url of TEST_CARD_URLS) {
			expect(fetchMock).toHaveBeenCalledWith(url);
		}
		expect(mockAsset).toHaveBeenCalledWith('/docs/cards/z-last.yml');
		expect(mockAsset).toHaveBeenCalledWith('/docs/cards/broken.yml');
		expect(mockAsset).toHaveBeenCalledWith('/docs/cards/a-first.yml');
		expect(cards.map((card) => card.name)).toEqual(['Zeta', 'Alfa']);
		expect(errors).toHaveLength(1);
	});

	it('should start every YAML fetch before any response resolves', async () => {
		const deferredByUrl = new Map<string, Deferred<Response>>();
		const fetchMock = vi.fn((input: RequestInfo | URL) => {
			const url = String(input);
			const deferred = createDeferred<Response>();
			deferredByUrl.set(url, deferred);
			return deferred.promise;
		});
		vi.stubGlobal('fetch', fetchMock);

		const { loadAbilityCards } = await import('./cards-source-loader');
		const loadPromise = loadAbilityCards();

		expect(fetchMock).toHaveBeenCalledTimes(TEST_CARD_URLS.length);
		for (const url of TEST_CARD_URLS) {
			expect(deferredByUrl.has(url)).toBe(true);
		}

		deferredByUrl
			.get('/base/docs/cards/z-last.yml')!
			.resolve(okResponse(cardYaml(rawCard('Zeta', 'Mago'))));
		deferredByUrl.get('/base/docs/cards/broken.yml')!.resolve(okResponse(': : :\n- not: [valid'));
		deferredByUrl
			.get('/base/docs/cards/a-first.yml')!
			.resolve(okResponse(cardYaml(rawCard('Alfa', 'Bardo'))));

		const cards = await loadPromise;
		expect(cards.map((card) => card.name)).toEqual(['Zeta', 'Alfa']);
	});

	it('should reuse the resolved result on a second sequential call', async () => {
		const fetchMock = mockFetchByUrl(cardResponsesByUrl());

		const { loadAbilityCards } = await import('./cards-source-loader');
		const first = await loadAbilityCards();
		const second = await loadAbilityCards();

		expect(second).toBe(first);
		expect(fetchMock).toHaveBeenCalledTimes(TEST_CARD_URLS.length);
	});

	it('should share a single in-flight load between concurrent calls', async () => {
		const fetchMock = mockFetchByUrl(cardResponsesByUrl());

		const { loadAbilityCards } = await import('./cards-source-loader');
		const firstCall = loadAbilityCards();
		const secondCall = loadAbilityCards();

		expect(secondCall).toBe(firstCall);
		await expect(secondCall).resolves.toHaveLength(2);
		expect(fetchMock).toHaveBeenCalledTimes(TEST_CARD_URLS.length);
	});

	it('should share the load between the cards service and the markdown loader', async () => {
		const fetchMock = mockFetchByUrl(cardResponsesByUrl());

		const [cardsModule, markdownModule] = await Promise.all([
			import('$lib/services/cards-service'),
			import('$lib/utils/agent-content-loaders/cards-loader'),
		]);

		const cardsService = cardsModule.useCardsService();
		await Promise.all([cardsService.loadAbilityCards(), markdownModule.loadAbilityCardsAsMD()]);

		expect(fetchMock).toHaveBeenCalledTimes(TEST_CARD_URLS.length);
		expect(get(cardsService.abilityCards)).toHaveLength(2);
	});

	it('should not cache a rejected load and should retry on the next call', async () => {
		mockAsset.mockImplementationOnce(() => {
			throw new Error('asset resolution failed');
		});
		const fetchMock = mockFetchByUrl(cardResponsesByUrl());

		const { loadAbilityCards } = await import('./cards-source-loader');
		await expect(loadAbilityCards()).rejects.toThrow('asset resolution failed');
		expect(fetchMock).not.toHaveBeenCalled();

		const cards = await loadAbilityCards();
		expect(cards.map((card) => card.name)).toEqual(['Zeta', 'Alfa']);
		expect(fetchMock).toHaveBeenCalledTimes(TEST_CARD_URLS.length);
	});

	it('should isolate an invalid YAML and cache the valid partial result', async () => {
		const fetchMock = mockFetchByUrl(cardResponsesByUrl());
		const { errors, restore } = collectConsoleError();

		const { loadAbilityCards } = await import('./cards-source-loader');
		const cards = await loadAbilityCards();

		restore();
		expect(cards.map((card) => card.name)).toEqual(['Zeta', 'Alfa']);
		expect(errors.some((args) => String(args[0]).includes('/docs/cards/broken.yml'))).toBe(true);

		await loadAbilityCards();
		expect(fetchMock).toHaveBeenCalledTimes(TEST_CARD_URLS.length);
	});

	it('should start a fresh load after module reset, simulating a page reload', async () => {
		const fetchMock = mockFetchByUrl(cardResponsesByUrl());

		const firstLoad = await import('./cards-source-loader');
		await firstLoad.loadAbilityCards();
		expect(fetchMock).toHaveBeenCalledTimes(TEST_CARD_URLS.length);

		vi.resetModules();
		const { loadAbilityCards } = await import('./cards-source-loader');
		const reloadedCards = await loadAbilityCards();
		expect(reloadedCards.map((card) => card.name)).toEqual(['Zeta', 'Alfa']);
		expect(fetchMock).toHaveBeenCalledTimes(TEST_CARD_URLS.length * 2);
	});

	it('should map cards preserving ids, fields and registry order', async () => {
		mockFetchByUrl(cardResponsesByUrl());

		const { loadAbilityCards } = await import('./cards-source-loader');
		const cards = await loadAbilityCards();

		const [zeta, alfa] = cards;
		expect(zeta.id).toMatch(/^[0-9a-f]{40}$/);
		expect(zeta.name).toBe('Zeta');
		expect(zeta.level).toBe(1);
		expect(zeta.type).toBe('activable');
		expect(zeta.tags).toEqual(['Mago']);
		expect(zeta.requirements).toBeNull();
		expect(zeta.description).toContain('Zeta');
		expect(zeta.uses).toEqual({ type: 'RELOAD', qty: 3 });
		expect(zeta.cardType).toBe('ability');
		expect(alfa.name).toBe('Alfa');
		expect(alfa.id).toMatch(/^[0-9a-f]{40}$/);
	});
});
