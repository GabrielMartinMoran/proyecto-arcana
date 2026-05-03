import { replaceState } from '$app/navigation';
import { fireEvent, render, screen } from '@testing-library/svelte';
import { tick } from 'svelte';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import NpcPage from './+page.svelte';

vi.mock('$app/navigation', () => ({
	replaceState: vi.fn(),
}));

const { mockPageStore } = vi.hoisted(() => {
	// eslint-disable-next-line @typescript-eslint/no-require-imports
	const { writable } = require('svelte/store');
	return {
		mockPageStore: writable({ url: new URL('http://localhost/embedded/npc') }),
	};
});

const mutableMockPage = vi.hoisted(() => ({
	url: new URL('http://localhost/embedded/npc'),
}));

vi.mock('$app/stores', () => ({
	page: mockPageStore,
}));

vi.mock('$app/state', () => ({
	page: mutableMockPage,
}));

vi.mock('$app/environment', () => ({
	browser: true,
}));

vi.mock('./CodeEditor.svelte', async () => await import('./__mocks__/CodeEditor.svelte'));
vi.mock(
	'./CreatureImportModal.svelte',
	async () => await import('./__mocks__/CreatureImportModal.svelte'),
);

describe('NpcPage single source of truth (yamlText)', () => {
	const originalHash = window.location.hash;

	beforeEach(() => {
		mockPageStore.set({ url: new URL('http://localhost/embedded/npc') });
		mutableMockPage.url = new URL('http://localhost/embedded/npc');
		window.location.hash = '';
		window.dispatchEvent(new HashChangeEvent('hashchange'));
		const fetchMock = vi.fn(() => Promise.resolve(new Response('')));
		globalThis.fetch = fetchMock;
		(replaceState as ReturnType<typeof vi.fn>).mockClear();
	});

	afterEach(() => {
		window.location.hash = originalHash;
		window.dispatchEvent(new HashChangeEvent('hashchange'));
		vi.restoreAllMocks();
	});

	it('should initialize yamlText from hash and not call replaceState immediately', async () => {
		window.location.hash =
			'#yaml=' +
			encodeURIComponent(
				'name: Goblin\ntier: 1\nlineage: Goblinoide\nsize: Mediano\nattributes:\n  body: 2\n  reflexes: 3\n  mind: 1\n  instinct: 2\n  presence: 1\nstats:\n  maxHealth: 8\n  evasion:\n    value: 1\n    note: null\n  physicalMitigation:\n    value: 0\n    note: null\n  magicalMitigation:\n    value: 0\n    note: null\n  speed:\n    value: 6\n    note: null\nlanguages: []\nattacks: []\ntraits: []\nactions: []\nreactions: []\ninteractions: []\nbehavior: test\nimg: null',
			);
		window.dispatchEvent(new HashChangeEvent('hashchange'));

		render(NpcPage);
		await tick();
		await new Promise((r) => setTimeout(r, 100));

		const calls = (replaceState as ReturnType<typeof vi.fn>).mock.calls;
		// Should not have written back an empty or mismatched hash immediately
		const badCall = calls.find((call) => {
			const url = call[0] as string;
			return typeof url === 'string' && url.includes('#yaml=') && !url.includes('name%3A+Goblin');
		});
		expect(badCall).toBeUndefined();

		expect(document.body.textContent).toContain('Criatura válida: Goblin');
	});

	it('should update hash when yamlText changes via editor input', async () => {
		window.location.hash =
			'#yaml=' +
			encodeURIComponent(
				'name: Goblin\ntier: 1\nlineage: Goblinoide\nsize: Mediano\nattributes:\n  body: 2\n  reflexes: 3\n  mind: 1\n  instinct: 2\n  presence: 1\nstats:\n  maxHealth: 8\n  evasion:\n    value: 1\n    note: null\n  physicalMitigation:\n    value: 0\n    note: null\n  magicalMitigation:\n    value: 0\n    note: null\n  speed:\n    value: 6\n    note: null\nlanguages: []\nattacks: []\ntraits: []\nactions: []\nreactions: []\ninteractions: []\nbehavior: test\nimg: null',
			);
		window.dispatchEvent(new HashChangeEvent('hashchange'));

		render(NpcPage);
		await tick();
		await new Promise((r) => setTimeout(r, 100));

		(replaceState as ReturnType<typeof vi.fn>).mockClear();

		const editor = screen.getByTestId('code-editor') as HTMLTextAreaElement;
		const newYaml =
			'name: Dragon\ntier: 2\nlineage: Dragón\nsize: Grande\nattributes:\n  body: 4\n  reflexes: 2\n  mind: 3\n  instinct: 3\n  presence: 5\nstats:\n  maxHealth: 40\n  evasion:\n    value: 2\n    note: null\n  physicalMitigation:\n    value: 2\n    note: null\n  magicalMitigation:\n    value: 2\n    note: null\n  speed:\n    value: 5\n    note: null\nlanguages: []\nattacks: []\ntraits: []\nactions: []\nreactions: []\ninteractions: []\nbehavior: test\nimg: null';
		await fireEvent.input(editor, { target: { value: newYaml } });

		await tick();
		await new Promise((r) => setTimeout(r, 800));

		// Editor should keep the new value (not be overwritten by a read-effect)
		expect(editor.value).toBe(newYaml);

		// replaceState should eventually be called with the new yaml
		const calls = (replaceState as ReturnType<typeof vi.fn>).mock.calls;
		const matchingCall = calls.find((call) => {
			const url = call[0] as string;
			return typeof url === 'string' && url.includes('name%3A+Dragon');
		});
		expect(matchingCall).toBeDefined();
	});

	it('should update yamlText when hash changes via external hashchange', async () => {
		window.location.hash =
			'#yaml=' +
			encodeURIComponent(
				'name: Goblin\ntier: 1\nlineage: Goblinoide\nsize: Mediano\nattributes:\n  body: 2\n  reflexes: 3\n  mind: 1\n  instinct: 2\n  presence: 1\nstats:\n  maxHealth: 8\n  evasion:\n    value: 1\n    note: null\n  physicalMitigation:\n    value: 0\n    note: null\n  magicalMitigation:\n    value: 0\n    note: null\n  speed:\n    value: 6\n    note: null\nlanguages: []\nattacks: []\ntraits: []\nactions: []\nreactions: []\ninteractions: []\nbehavior: test\nimg: null',
			);
		window.dispatchEvent(new HashChangeEvent('hashchange'));

		render(NpcPage);
		await tick();
		await new Promise((r) => setTimeout(r, 100));

		expect(document.body.textContent).toContain('Criatura válida: Goblin');

		window.location.hash =
			'#yaml=' +
			encodeURIComponent(
				'name: Dragon\ntier: 2\nlineage: Dragón\nsize: Grande\nattributes:\n  body: 4\n  reflexes: 2\n  mind: 3\n  instinct: 3\n  presence: 5\nstats:\n  maxHealth: 40\n  evasion:\n    value: 2\n    note: null\n  physicalMitigation:\n    value: 2\n    note: null\n  magicalMitigation:\n    value: 2\n    note: null\n  speed:\n    value: 5\n    note: null\nlanguages: []\nattacks: []\ntraits: []\nactions: []\nreactions: []\ninteractions: []\nbehavior: test\nimg: null',
			);
		window.dispatchEvent(new HashChangeEvent('hashchange'));

		await tick();
		await new Promise((r) => setTimeout(r, 600));

		expect(document.body.textContent).toContain('Criatura válida: Dragon');
	});

	it('should update hash when importing from bestiary', async () => {
		render(NpcPage);
		await tick();
		await new Promise((r) => setTimeout(r, 100));

		(replaceState as ReturnType<typeof vi.fn>).mockClear();

		// Open import modal
		const importBtn = screen.getByTitle('Importar del Bestiario');
		await fireEvent.click(importBtn);
		await tick();

		const selectBtn = screen.getByTestId('import-select');
		await fireEvent.click(selectBtn);
		await tick();
		await new Promise((r) => setTimeout(r, 800));

		// The imported creature should be reflected in the DOM
		expect(document.body.textContent).toContain('Criatura válida: ImportedDragon');

		const calls = (replaceState as ReturnType<typeof vi.fn>).mock.calls;
		const matchingCall = calls.find((call) => {
			const url = call[0] as string;
			return typeof url === 'string' && url.includes('ImportedDragon');
		});
		expect(matchingCall).toBeDefined();
	});

	it('should handle rapid edits without race conditions', async () => {
		window.location.hash =
			'#yaml=' +
			encodeURIComponent(
				'name: Goblin\ntier: 1\nlineage: Goblinoide\nsize: Mediano\nattributes:\n  body: 2\n  reflexes: 3\n  mind: 1\n  instinct: 2\n  presence: 1\nstats:\n  maxHealth: 8\n  evasion:\n    value: 1\n    note: null\n  physicalMitigation:\n    value: 0\n    note: null\n  magicalMitigation:\n    value: 0\n    note: null\n  speed:\n    value: 6\n    note: null\nlanguages: []\nattacks: []\ntraits: []\nactions: []\nreactions: []\ninteractions: []\nbehavior: test\nimg: null',
			);
		window.dispatchEvent(new HashChangeEvent('hashchange'));

		render(NpcPage);
		await tick();
		await new Promise((r) => setTimeout(r, 100));

		(replaceState as ReturnType<typeof vi.fn>).mockClear();

		const editor = screen.getByTestId('code-editor') as HTMLTextAreaElement;

		// Rapid edits
		for (let i = 1; i <= 3; i++) {
			await fireEvent.input(editor, {
				target: {
					value: `name: Rapid${i}\ntier: 1\nlineage: Test\nsize: Mediano\nattributes:\n  body: 1\n  reflexes: 1\n  mind: 1\n  instinct: 1\n  presence: 1\nstats:\n  maxHealth: 1\n  evasion:\n    value: 0\n    note: null\n  physicalMitigation:\n    value: 0\n    note: null\n  magicalMitigation:\n    value: 0\n    note: null\n  speed:\n    value: 1\n    note: null\nlanguages: []\nattacks: []\ntraits: []\nactions: []\nreactions: []\ninteractions: []\nbehavior: test\nimg: null`,
				},
			});
			await tick();
		}

		await new Promise((r) => setTimeout(r, 2500));

		// The final hash should reflect the last edit
		const calls = (replaceState as ReturnType<typeof vi.fn>).mock.calls;
		expect(calls.length).toBeGreaterThan(0);
		const lastCall = calls[calls.length - 1];
		expect(lastCall[0]).toContain('name%3A+Rapid3');
	});

	it('should not cause an infinite replaceState loop', async () => {
		window.location.hash =
			'#yaml=' +
			encodeURIComponent(
				'name: Goblin\ntier: 1\nlineage: Goblinoide\nsize: Mediano\nattributes:\n  body: 2\n  reflexes: 3\n  mind: 1\n  instinct: 2\n  presence: 1\nstats:\n  maxHealth: 8\n  evasion:\n    value: 1\n    note: null\n  physicalMitigation:\n    value: 0\n    note: null\n  magicalMitigation:\n    value: 0\n    note: null\n  speed:\n    value: 6\n    note: null\nlanguages: []\nattacks: []\ntraits: []\nactions: []\nreactions: []\ninteractions: []\nbehavior: test\nimg: null',
			);
		window.dispatchEvent(new HashChangeEvent('hashchange'));

		render(NpcPage);
		await tick();
		await new Promise((r) => setTimeout(r, 100));

		(replaceState as ReturnType<typeof vi.fn>).mockClear();

		// Trigger a change
		const editor = screen.getByTestId('code-editor') as HTMLTextAreaElement;
		await fireEvent.input(editor, {
			target: {
				value:
					'name: LoopTest\ntier: 1\nlineage: Test\nsize: Mediano\nattributes:\n  body: 1\n  reflexes: 1\n  mind: 1\n  instinct: 1\n  presence: 1\nstats:\n  maxHealth: 1\n  evasion:\n    value: 0\n    note: null\n  physicalMitigation:\n    value: 0\n    note: null\n  magicalMitigation:\n    value: 0\n    note: null\n  speed:\n    value: 1\n    note: null\nlanguages: []\nattacks: []\ntraits: []\nactions: []\nreactions: []\ninteractions: []\nbehavior: test\nimg: null',
			},
		});

		await tick();
		await new Promise((r) => setTimeout(r, 1200));

		// In a healthy implementation replaceState should be called only a handful of times
		const callCount = (replaceState as ReturnType<typeof vi.fn>).mock.calls.length;
		expect(callCount).toBeLessThanOrEqual(3);
	});

	it('should initialize readonlyMode from hash', async () => {
		window.location.hash =
			'#yaml=' +
			encodeURIComponent(
				'name: Goblin\ntier: 1\nlineage: Goblinoide\nsize: Mediano\nattributes:\n  body: 2\n  reflexes: 3\n  mind: 1\n  instinct: 2\n  presence: 1\nstats:\n  maxHealth: 8\n  evasion:\n    value: 1\n    note: null\n  physicalMitigation:\n    value: 0\n    note: null\n  magicalMitigation:\n    value: 0\n    note: null\n  speed:\n    value: 6\n    note: null\nlanguages: []\nattacks: []\ntraits: []\nactions: []\nreactions: []\ninteractions: []\nbehavior: test\nimg: null',
			) +
			'&readonly=1';
		window.dispatchEvent(new HashChangeEvent('hashchange'));

		const { container } = render(NpcPage);
		await tick();
		await new Promise((r) => setTimeout(r, 100));

		// In readonly mode the editor should not be present
		expect(container.querySelector('[data-testid="code-editor"]')).toBeNull();
		// Statblock should be present
		expect(document.body.textContent).toContain('Goblin');
	});

	it('should initialize readonlyMode from query params', async () => {
		mutableMockPage.url = new URL('http://localhost/embedded/npc?readonly=1');
		window.location.hash =
			'#yaml=' +
			encodeURIComponent(
				'name: Goblin\ntier: 1\nlineage: Goblinoide\nsize: Mediano\nattributes:\n  body: 2\n  reflexes: 3\n  mind: 1\n  instinct: 2\n  presence: 1\nstats:\n  maxHealth: 8\n  evasion:\n    value: 1\n    note: null\n  physicalMitigation:\n    value: 0\n    note: null\n  magicalMitigation:\n    value: 0\n    note: null\n  speed:\n    value: 6\n    note: null\nlanguages: []\nattacks: []\ntraits: []\nactions: []\nreactions: []\ninteractions: []\nbehavior: test\nimg: null',
			);
		window.dispatchEvent(new HashChangeEvent('hashchange'));

		const { container } = render(NpcPage);
		await tick();
		await new Promise((r) => setTimeout(r, 100));

		// In readonly mode the editor should not be present
		expect(container.querySelector('[data-testid="code-editor"]')).toBeNull();
		// Statblock should be present
		expect(document.body.textContent).toContain('Goblin');
	});

	it('should show the editor when neither query string nor hash contain readonly=1', async () => {
		window.location.hash = '';
		window.dispatchEvent(new HashChangeEvent('hashchange'));

		const { container } = render(NpcPage);
		await tick();
		await new Promise((r) => setTimeout(r, 100));

		// Editor should be present
		expect(container.querySelector('[data-testid="code-editor"]')).not.toBeNull();
		// Should show sample YAML creature
		expect(document.body.textContent).toContain('Criatura válida: Goblin');
	});

	it('should keep readonly mode when hash changes and query string has readonly=1', async () => {
		mutableMockPage.url = new URL('http://localhost/embedded/npc?readonly=1');
		window.location.hash =
			'#yaml=' +
			encodeURIComponent(
				'name: Goblin\ntier: 1\nlineage: Goblinoide\nsize: Mediano\nattributes:\n  body: 2\n  reflexes: 3\n  mind: 1\n  instinct: 2\n  presence: 1\nstats:\n  maxHealth: 8\n  evasion:\n    value: 1\n    note: null\n  physicalMitigation:\n    value: 0\n    note: null\n  magicalMitigation:\n    value: 0\n    note: null\n  speed:\n    value: 6\n    note: null\nlanguages: []\nattacks: []\ntraits: []\nactions: []\nreactions: []\ninteractions: []\nbehavior: test\nimg: null',
			);
		window.dispatchEvent(new HashChangeEvent('hashchange'));

		const { container } = render(NpcPage);
		await tick();
		await new Promise((r) => setTimeout(r, 100));

		// In readonly mode the editor should not be present
		expect(container.querySelector('[data-testid="code-editor"]')).toBeNull();
		expect(document.body.textContent).toContain('Goblin');

		// Now simulate an external hashchange that does not include readonly
		window.location.hash =
			'#yaml=' +
			encodeURIComponent(
				'name: Dragon\ntier: 2\nlineage: Dragón\nsize: Grande\nattributes:\n  body: 4\n  reflexes: 2\n  mind: 3\n  instinct: 3\n  presence: 5\nstats:\n  maxHealth: 40\n  evasion:\n    value: 2\n    note: null\n  physicalMitigation:\n    value: 2\n    note: null\n  magicalMitigation:\n    value: 2\n    note: null\n  speed:\n    value: 5\n    note: null\nlanguages: []\nattacks: []\ntraits: []\nactions: []\nreactions: []\ninteractions: []\nbehavior: test\nimg: null',
			);
		window.dispatchEvent(new HashChangeEvent('hashchange'));

		await tick();
		await new Promise((r) => setTimeout(r, 800));

		// Editor should still be hidden because query string still has readonly=1
		expect(container.querySelector('[data-testid="code-editor"]')).toBeNull();
		expect(document.body.textContent).toContain('Dragon');
	});

	it('should not double-decode percent signs from hash', async () => {
		// YAML containing a literal % character
		const yamlWithPercent =
			'name: Goblin\ntier: 1\nlineage: Goblinoide\nsize: Mediano\nattributes:\n  body: 2\n  reflexes: 3\n  mind: 1\n  instinct: 2\n  presence: 1\nstats:\n  maxHealth: 8\n  evasion:\n    value: 1\n    note: null\n  physicalMitigation:\n    value: 0\n    note: null\n  magicalMitigation:\n    value: 0\n    note: null\n  speed:\n    value: 6\n    note: null\nlanguages: []\nattacks: []\ntraits:\n  - name: TestTrait\n    detail: Deals 50% more damage\nactions: []\nreactions: []\ninteractions: []\nbehavior: test\nimg: null';
		window.location.hash = '#yaml=' + encodeURIComponent(yamlWithPercent);
		window.dispatchEvent(new HashChangeEvent('hashchange'));

		expect(() => {
			render(NpcPage);
		}).not.toThrow();

		await tick();
		await new Promise((r) => setTimeout(r, 600));

		expect(document.body.textContent).toContain('50% more damage');
	});
});
