import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockedAsset = vi.fn((path: string) => `/base${path}`);

vi.mock('$app/paths', () => ({
	asset: mockedAsset,
}));

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

const mockFetchSequence = (responses: Response[]) => {
	const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
		const next = responses.shift();
		if (!next) throw new Error(`unexpected fetch: ${String(input)}`);
		return next;
	});
	vi.stubGlobal('fetch', fetchMock);
	return fetchMock;
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
		mockedAsset.mockImplementation((path: string) => `/base${path}`);
	});

	it('loads cards in manifest order through asset URLs', async () => {
		const fetchMock = mockFetchSequence([
			okResponse({ files: ['z-last.yml', 'a-first.yml'] }),
			okResponse(cardYaml(rawCard('Zeta', 'Mago'))),
			okResponse(cardYaml(rawCard('Alfa', 'Bardo'))),
		]);

		const { loadAbilityCards } = await import('./cards-source-loader');
		const cards = await loadAbilityCards();

		expect(fetchMock).toHaveBeenNthCalledWith(1, '/base/docs/cards/index.json');
		expect(fetchMock).toHaveBeenNthCalledWith(2, '/base/docs/cards/z-last.yml');
		expect(fetchMock).toHaveBeenNthCalledWith(3, '/base/docs/cards/a-first.yml');
		expect(cards.map((card) => card.name)).toEqual(['Zeta', 'Alfa']);
		expect(cards[0].id).toMatch(/^[0-9a-f]{40}$/);
	});

	it('returns an empty list when the manifest is missing or invalid', async () => {
		for (const manifestBody of [null, { files: 'nope' }, { wrong: [] }]) {
			mockFetchSequence([okResponse(manifestBody)]);
			const { errors, restore } = collectConsoleError();
			const { loadAbilityCards } = await import('./cards-source-loader');
			expect(await loadAbilityCards()).toEqual([]);
			restore();
			expect(errors.length).toBe(1);
		}
	});

	it('returns an empty list when the manifest fetch fails', async () => {
		mockFetchSequence([{ ok: false, status: 404 } as Response]);
		const { loadAbilityCards } = await import('./cards-source-loader');
		expect(await loadAbilityCards()).toEqual([]);
	});

	it('omits invalid files while valid ones keep loading', async () => {
		const cases: Array<[string, Response]> = [
			[
				'empty.yml',
				{
					ok: true,
					text: async () => '',
				} as Response,
			],
			['garbage.yml', okResponse(': : :\n- not: [valid')],
			['no-wrapper.yml', okResponse('unrelated: value\n')],
			['empty-array.yml', okResponse('cards: []\n')],
			['noname.yml', okResponse('cards:\n  - level: 1\n    tags: [Mago]\n')],
		];

		const fetchMock = mockFetchSequence([
			okResponse({ files: ['good.yml', ...cases.map(([name]) => name)] }),
			okResponse(cardYaml(rawCard('Bueno', 'Mago'))),
			...cases.map(([, response]) => response),
		]);
		const { errors, restore } = collectConsoleError();

		const { loadAbilityCards } = await import('./cards-source-loader');
		const cards = await loadAbilityCards();

		restore();
		expect(cards.map((card) => card.name)).toEqual(['Bueno']);
		for (const [name] of cases) {
			expect(errors.some((args) => String(args[0]).includes(name))).toBe(true);
		}
		expect(fetchMock).toHaveBeenCalledTimes(1 + cases.length + 1);
	});

	it('omits files with unsafe manifest filenames', async () => {
		mockFetchSequence([okResponse({ files: ['../escape.yml'] })]);
		const { errors, restore } = collectConsoleError();

		const { loadAbilityCards } = await import('./cards-source-loader');
		const cards = await loadAbilityCards();

		restore();
		expect(cards).toEqual([]);
		expect(errors.some((args) => String(args[0]).includes('../escape.yml'))).toBe(true);
	});
});
