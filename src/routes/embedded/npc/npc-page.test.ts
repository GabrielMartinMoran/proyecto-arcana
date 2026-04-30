import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render } from '@testing-library/svelte';
import { tick } from 'svelte';
import NpcPage from './+page.svelte';

vi.mock('$app/navigation', () => ({
	replaceState: vi.fn(),
}));

vi.mock('$app/stores', () => ({
	page: {
		subscribe(fn: (v: any) => void) {
			fn({ url: new URL('http://localhost/embedded/npc') });
			return () => {};
		},
	},
}));

vi.mock('$app/environment', () => ({
	browser: true,
}));

describe('NpcPage regression: hash race condition', () => {
	const originalHash = window.location.hash;
	let fetchMock: ReturnType<typeof vi.fn>;

	beforeEach(() => {
		window.location.hash =
			'#yaml=' +
			encodeURIComponent(
				'name: Goblin\ntier: 1\nlineage: Goblinoide\nsize: Mediano\nattributes:\n  body: 2\n  reflexes: 3\n  mind: 1\n  instinct: 2\n  presence: 1\nstats:\n  maxHealth: 8\n  evasion:\n    value: 1\n    note: null\n  physicalMitigation:\n    value: 0\n    note: null\n  magicalMitigation:\n    value: 0\n    note: null\n  speed:\n    value: 6\n    note: null\nlanguages: []\nattacks: []\ntraits: []\nactions: []\nreactions: []\ninteractions: []\nbehavior: test\nimg: null',
			);
		window.dispatchEvent(new HashChangeEvent('hashchange'));
		fetchMock = vi.fn(() => Promise.resolve(new Response('')));
		globalThis.fetch = fetchMock;
	});

	afterEach(() => {
		window.location.hash = originalHash;
		window.dispatchEvent(new HashChangeEvent('hashchange'));
		vi.restoreAllMocks();
	});

	it('should initialize yamlText from hash and not overwrite URL with empty hash', async () => {
		const { replaceState } = await import('$app/navigation');
		const { container } = render(NpcPage);
		await tick();
		await new Promise((r) => setTimeout(r, 500));

		// The bug: $effect overwrites hash to #yaml= before onMount reads it.
		// We must NOT see replaceState called with an empty yaml hash.
		const calls = (replaceState as ReturnType<typeof vi.fn>).mock.calls;
		const emptyYamlCall = calls.find((call) => {
			const url = call[0] as string;
			return typeof url === 'string' && url.includes('#yaml=') && !url.includes('#yaml=name');
		});
		expect(emptyYamlCall).toBeUndefined();

		// Verify the creature was parsed from the initial hash yaml
		expect(container.textContent).toContain('Criatura válida: Goblin');
	});
});

describe('NpcPage hash reactivity', () => {
	const originalHash = window.location.hash;

	beforeEach(() => {
		window.location.hash = '';
		window.dispatchEvent(new HashChangeEvent('hashchange'));
		const fetchMock = vi.fn(() => Promise.resolve(new Response('')));
		globalThis.fetch = fetchMock;
	});

	afterEach(() => {
		window.location.hash = originalHash;
		window.dispatchEvent(new HashChangeEvent('hashchange'));
		vi.restoreAllMocks();
	});

	it('should update yamlText when hash changes via hashchange', async () => {
		const { container } = render(NpcPage);
		await tick();
		await new Promise((r) => setTimeout(r, 100));

		// Change hash to a new creature
		window.location.hash =
			'#yaml=' +
			encodeURIComponent(
				'name: Dragon\ntier: 2\nlineage: Dragón\nsize: Grande\nattributes:\n  body: 4\n  reflexes: 2\n  mind: 3\n  instinct: 3\n  presence: 5\nstats:\n  maxHealth: 40\n  evasion:\n    value: 2\n    note: null\n  physicalMitigation:\n    value: 2\n    note: null\n  magicalMitigation:\n    value: 2\n    note: null\n  speed:\n    value: 5\n    note: null\nlanguages: []\nattacks: []\ntraits: []\nactions: []\nreactions: []\ninteractions: []\nbehavior: test\nimg: null',
			);
		window.dispatchEvent(new HashChangeEvent('hashchange'));

		await tick();
		await new Promise((r) => setTimeout(r, 500));

		expect(container.textContent).toContain('Criatura válida: Dragon');
	});
});
