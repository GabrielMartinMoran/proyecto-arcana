import { beforeEach, describe, expect, it, vi } from 'vitest';
import { get } from 'svelte/store';

const mockedAsset = vi.fn((path: string) => `/base${path}`);

vi.mock('$app/paths', () => ({
	asset: mockedAsset,
	resolve: vi.fn((path: string) => `/route${path}`),
}));

const mockFirebase = {
	isEnabled: vi.fn(() => false),
	initFirebase: vi.fn(async () => {}),
	onAuthState: vi.fn(async () => () => {}),
	listenCharactersForUser: vi.fn(() => () => {}),
	deleteCharacterForUser: vi.fn(async () => {}),
	saveCharactersForUser: vi.fn(async () => {}),
	user: { subscribe: vi.fn(() => () => {}) },
};

vi.mock('$lib/services/firebase-service', () => ({
	useFirebaseService: () => mockFirebase,
}));

describe('static content paths', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockedAsset.mockImplementation((path: string) => `/base${path}`);
		global.fetch = vi.fn();
		localStorage.clear();
	});

	it('loads card and creature compendiums through asset paths', async () => {
		vi.mocked(fetch)
			.mockResolvedValueOnce({
				text: async () =>
					'cards:\n  - name: Arc Flash\n    level: 1\n    tags: [Arcana]\n    uses: 1\n    range: Personal\n    duration: Instant\n    effects: []\n    upgrades: []\n    action: Main\n    skill: Mente\n    threshold: 10\n    test: 1d20\n    damage: 1d4\n    damageType: Arcano\n    note: null\n    requirements: []\n    source: Test\n    img: null\n',
			} as Response)
			.mockResolvedValueOnce({
				text: async () =>
					'creatures:\n  - name: Goblin\n    lineage: Goblinoide\n    tier: 1\n    size: Mediano\n    attributes:\n      body: 2\n      reflexes: 3\n      mind: 1\n      instinct: 2\n      presence: 1\n    stats:\n      maxHealth: 8\n      evasion: { value: 1, note: null }\n      physicalMitigation: { value: 0, note: null }\n      magicalMitigation: { value: 0, note: null }\n      speed: { value: 6, note: null }\n    languages: []\n    attacks: []\n    traits: []\n    actions: []\n    reactions: []\n    interactions: []\n    behavior: Test\n    img: null\n',
			} as Response);

		const [{ useCardsService }, { useCreaturesService }] = await Promise.all([
			import('./cards-service'),
			import('./creatures-service'),
		]);

		const cardsService = useCardsService();
		const creaturesService = useCreaturesService();

		await cardsService.loadAbilityCards();
		await creaturesService.loadCreatures();

		expect(fetch).toHaveBeenNthCalledWith(1, '/base/docs/cards.yml');
		expect(fetch).toHaveBeenNthCalledWith(2, '/base/docs/bestiary.yml');
		expect(get(cardsService.abilityCards)).toHaveLength(1);
		expect(get(creaturesService.creatures)).toHaveLength(1);
	});

	it('loads markdown, agent files, items, modifiers, and example characters through asset paths', async () => {
		vi.mocked(fetch)
			.mockResolvedValueOnce({ text: async () => '# Arcana' } as Response)
			.mockResolvedValueOnce({ text: async () => 'agent-content' } as Response)
			.mockResolvedValueOnce({
				ok: true,
				json: async () => ({ weapons: [], armors: [], 'adventure-gear': [] }),
			} as Response)
			.mockResolvedValueOnce({
				ok: true,
				json: async () => [],
			} as Response)
			.mockResolvedValueOnce({
				json: async () => [{ id: 'example', name: 'Example Hero' }],
			} as Response);

		const [docService, agentLoader, itemsModule, modifiersModule, charactersModule] =
			await Promise.all([
				import('./doc-service'),
				import('../utils/agent-content-loaders/agent-content-loader'),
				import('./items-service'),
				import('./modifiers-service'),
				import('./characters-service'),
			]);

		const itemsServiceState = itemsModule.itemsService as unknown as {
			loaded: boolean;
			items: unknown[];
		};
		itemsServiceState.loaded = false;
		itemsServiceState.items = [];

		const modifiersServiceState = modifiersModule.modifiersService as unknown as {
			loaded: boolean;
			modifiers: unknown[];
		};
		modifiersServiceState.loaded = false;
		modifiersServiceState.modifiers = [];

		const charactersService = charactersModule.useCharactersService();

		await docService.loadMarkdownDocument('docs/guide.md');
		await agentLoader.loadAgentFile('/docs/agents/reference.md');
		await itemsModule.itemsService.loadItems();
		await modifiersModule.modifiersService.loadModifiers();
		await charactersService.loadExampleCharacters();

		expect(fetch).toHaveBeenNthCalledWith(1, '/base/docs/guide.md');
		expect(fetch).toHaveBeenNthCalledWith(2, '/base/docs/agents/reference.md');
		expect(fetch).toHaveBeenNthCalledWith(3, '/base/docs/items.json');
		expect(fetch).toHaveBeenNthCalledWith(4, '/base/docs/modifiers.json');
		expect(fetch).toHaveBeenNthCalledWith(5, '/base/docs/example-characters.json');
		expect(get(charactersService.exampleCharacters)).toHaveLength(1);
	});
});
