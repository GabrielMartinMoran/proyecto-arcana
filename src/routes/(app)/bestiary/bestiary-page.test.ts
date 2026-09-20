import { fireEvent, render, screen, waitFor, within } from '@testing-library/svelte';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Writable } from 'svelte/store';
import type { Creature } from '$lib/types/creature';

// SvelteKit exposes `page.url` as rune-backed state. A SvelteMap signal keeps
// that contract in tests, and `goto` applies its URL change on a microtask, as
// the real asynchronous navigation does.
type ReactiveUrlSource = {
	get: (key: string) => URL | undefined;
	set: (key: string, value: URL) => void;
};

type QueryNavigationOptions = {
	replaceState: boolean;
	keepFocus: boolean;
	noScroll: boolean;
};

const QUERY_NAVIGATION_OPTIONS: QueryNavigationOptions = {
	replaceState: true,
	keepFocus: true,
	noScroll: true,
};

const testState = vi.hoisted(() => ({
	urls: undefined as unknown as ReactiveUrlSource,
	goto: vi.fn<(url: string, options?: QueryNavigationOptions) => Promise<void>>(),
	loadCreatures: vi.fn<() => Promise<void>>(async () => {}),
	creatures: undefined as unknown as Writable<Creature[]>,
}));

vi.mock('$app/state', async () => {
	const { SvelteMap } = await import('svelte/reactivity');
	testState.urls = new SvelteMap<string, URL>([['url', new URL('http://localhost/bestiary')]]);

	return {
		page: {
			get url() {
				return testState.urls.get('url') as URL;
			},
		},
	};
});

vi.mock('$app/navigation', () => ({
	goto: (url: string, options?: QueryNavigationOptions) => {
		testState.goto(url, options);
		return Promise.resolve().then(() => {
			testState.urls.set('url', new URL(url, 'http://localhost'));
		});
	},
}));

vi.mock('$app/paths', () => ({
	resolve: (path: string) => path,
}));

vi.mock('$lib/services/dice-roller-service', () => ({
	useDiceRollerService: () => ({
		rollExpression: vi.fn(),
		rollModal: { openRollModal: vi.fn() },
	}),
}));

vi.mock('$lib/services/creatures-service', async () => {
	const { writable } = await import('svelte/store');
	const creatures = writable<Creature[]>([]);
	testState.creatures = creatures;

	return {
		useCreaturesService: () => ({
			loadCreatures: testState.loadCreatures,
			creatures,
		}),
	};
});

import BestiaryPage from './+page.svelte';

const createCreature = (
	overrides: Partial<Creature> & Pick<Creature, 'id' | 'name'>,
): Creature => ({
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
	...overrides,
});

const goblin = createCreature({ id: 'goblin', name: 'Goblin', lineage: 'Goblinoide', tier: 1 });
const hobgoblin = createCreature({
	id: 'hobgoblin',
	name: 'Hobgoblin',
	lineage: 'Goblinoide',
	tier: 2,
});
const wolf = createCreature({ id: 'wolf', name: 'Lobo', lineage: 'Bestia', tier: 2 });
const dragon = createCreature({ id: 'dragon', name: 'Dragón', lineage: 'Dragón', tier: 3 });

// Sorted by tier then name, as the creatures service delivers the catalogue
const catalogue = [goblin, hobgoblin, wolf, dragon];

const setPageUrl = (path: string) => {
	testState.urls.set('url', new URL(path, 'http://localhost'));
};

const createDeferred = () => {
	let resolve!: () => void;
	const promise = new Promise<void>((res) => {
		resolve = res;
	});
	return { promise, resolve };
};

const lastNavigationUrl = () => {
	const calls = testState.goto.mock.calls;
	expect(calls.length).toBeGreaterThan(0);
	return new URL(calls[calls.length - 1][0], 'http://localhost');
};

const listedCreatureNames = () =>
	screen.queryAllByRole('listitem').map((row) => row.querySelector('.creature-name')?.textContent);

const statblocksIn = (container: HTMLElement) => container.querySelectorAll('.statblock');

const BESTIARY_PAGE_SOURCE_PATH = 'src/routes/(app)/bestiary/+page.svelte';

const readBestiaryPageSource = () =>
	readFileSync(join(process.cwd(), BESTIARY_PAGE_SOURCE_PATH), 'utf8');

type CssRule = {
	selectors: string[];
	declarations: string;
};

// The route stylesheet only contains flat rules. Parsing selector/declaration
// pairs keeps the CSS contract behavior-oriented instead of matching raw text.
const parseCssRules = (css: string): CssRule[] => {
	const rules: CssRule[] = [];
	for (const match of css.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
		rules.push({
			selectors: match[1].split(',').map((selector) => selector.trim()),
			declarations: match[2],
		});
	}
	return rules;
};

// Braces are balanced because a non-greedy regex would stop at the first inner
// closing brace of a media block that contains rules.
const cssMediaBlock = (source: string, query: string): string => {
	const start = source.indexOf(query);
	if (start === -1) return '';

	const openBrace = source.indexOf('{', start);
	let depth = 0;
	for (let index = openBrace; index < source.length; index += 1) {
		if (source[index] === '{') depth += 1;
		else if (source[index] === '}') depth -= 1;
		if (depth === 0) return source.slice(start, index + 1);
	}
	return source.slice(start);
};

// Reads only the component stylesheet so base rules stay separate from markup
// and script content.
const styleContent = (source: string): string => {
	const match = source.match(/<style[^>]*>([\s\S]*?)<\/style>/);
	return match?.[1] ?? '';
};

// Removes media blocks so the remaining rules are the unconditional base rules
// shared by every breakpoint.
const stripMediaBlocks = (css: string): string => {
	let result = '';
	let index = 0;

	while (index < css.length) {
		const mediaStart = css.indexOf('@media', index);
		if (mediaStart === -1) {
			result += css.slice(index);
			break;
		}

		result += css.slice(index, mediaStart);
		const openBrace = css.indexOf('{', mediaStart);
		let depth = 0;
		let cursor = openBrace;
		for (; cursor < css.length; cursor += 1) {
			if (css[cursor] === '{') depth += 1;
			else if (css[cursor] === '}') {
				depth -= 1;
				if (depth === 0) break;
			}
		}
		index = cursor + 1;
	}

	return result;
};

const declarationsFor = (rules: CssRule[], selector: string): string =>
	rules
		.filter((rule) => rule.selectors.includes(selector))
		.map((rule) => rule.declarations)
		.join('\n');

const typeNameFilter = async (value: string) => {
	await fireEvent.input(screen.getByPlaceholderText('Buscar por nombre'), {
		target: { value },
	});
};

const changeTierFilter = async (tier: string) => {
	const tierOption = screen.getByRole('option', { name: `Rango ${tier}` });
	await fireEvent.change(tierOption.closest('select') as HTMLSelectElement, {
		target: { value: tier },
	});
};

const changeLineageFilter = async (lineage: string) => {
	await fireEvent.change(screen.getByRole('combobox', { name: 'Linaje' }), {
		target: { value: lineage },
	});
};

beforeEach(() => {
	testState.goto.mockClear();
	testState.loadCreatures.mockReset();
	testState.loadCreatures.mockImplementation(async () => {});
	testState.creatures.set(catalogue);
	setPageUrl('/bestiary');
});

describe('BestiaryPage catalogue and empty selection', () => {
	it('@browse @master-detail lists every creature with its name, lineage and tier', () => {
		render(BestiaryPage);

		expect(testState.loadCreatures).toHaveBeenCalledTimes(1);
		expect(listedCreatureNames()).toEqual(['Goblin', 'Hobgoblin', 'Lobo', 'Dragón']);

		const goblinRow = screen.getByRole('button', { name: /^Goblin Linaje Goblinoide Rango 1$/ });
		expect(goblinRow).toHaveTextContent('Linaje Goblinoide');
		expect(goblinRow).toHaveTextContent('Rango 1');

		const dragonRow = screen.getByRole('button', { name: /^Dragón Linaje Dragón Rango 3$/ });
		expect(dragonRow).toHaveTextContent('Linaje Dragón');
		expect(dragonRow).toHaveTextContent('Rango 3');
	});

	it('@browse @master-detail prompts to select a creature and mounts no statblock before selection', () => {
		const { container } = render(BestiaryPage);

		expect(screen.getByText(/Selecciona una criatura/)).toBeInTheDocument();
		expect(statblocksIn(container)).toHaveLength(0);
		expect(screen.queryByRole('heading', { level: 2 })).not.toBeInTheDocument();
		expect(testState.goto).not.toHaveBeenCalled();
	});
});

describe('BestiaryPage selection', () => {
	it('@selection @statblock @url-state clicking a creature stores creatureId and mounts exactly one statblock', async () => {
		const { container } = render(BestiaryPage);

		await fireEvent.click(screen.getByRole('button', { name: /^Goblin Linaje/ }));

		expect(testState.goto).toHaveBeenCalledExactlyOnceWith(
			'/bestiary?creatureId=goblin',
			QUERY_NAVIGATION_OPTIONS,
		);

		await waitFor(() => expect(statblocksIn(container)).toHaveLength(1));
		expect(screen.getByRole('heading', { level: 2, name: 'Goblin' })).toBeInTheDocument();
		expect(screen.queryByRole('heading', { level: 2, name: 'Dragón' })).not.toBeInTheDocument();
		expect(screen.queryByText(/Selecciona una criatura/)).not.toBeInTheDocument();
	});

	it('@selection @url-state selecting a creature preserves the active filter parameters', async () => {
		setPageUrl('/bestiary?name=Lobo&tier=2');
		render(BestiaryPage);

		await fireEvent.click(screen.getByRole('button', { name: /^Lobo Linaje Bestia Rango 2$/ }));

		const url = lastNavigationUrl();
		expect(url.searchParams.get('name')).toBe('Lobo');
		expect(url.searchParams.get('tier')).toBe('2');
		expect(url.searchParams.get('creatureId')).toBe('wolf');
	});

	it('@selection @statblock @url-state restores a valid selection from creatureId on load', async () => {
		setPageUrl('/bestiary?creatureId=dragon');
		const { container } = render(BestiaryPage);

		await waitFor(() => expect(statblocksIn(container)).toHaveLength(1));
		expect(screen.getByRole('heading', { level: 2, name: 'Dragón' })).toBeInTheDocument();
		expect(screen.getByRole('button', { name: /Dragón/, pressed: true })).toBeInTheDocument();
	});

	it('@selection @url-state shows the instruction and no statblock when creatureId matches no creature', async () => {
		setPageUrl('/bestiary?creatureId=missing-creature');
		const { container } = render(BestiaryPage);

		await waitFor(() => expect(listedCreatureNames()).toHaveLength(4));
		expect(screen.getByText(/Selecciona una criatura/)).toBeInTheDocument();
		expect(statblocksIn(container)).toHaveLength(0);
	});
});

describe('BestiaryPage filters', () => {
	it('@filter @lineage-filter combines name, tier and lineage filters and preserves every query parameter', async () => {
		render(BestiaryPage);

		await typeNameFilter('gob');

		let url = lastNavigationUrl();
		expect(url.searchParams.get('name')).toBe('gob');
		expect(listedCreatureNames()).toEqual(['Goblin', 'Hobgoblin']);

		await changeTierFilter('2');

		url = lastNavigationUrl();
		expect(url.searchParams.get('name')).toBe('gob');
		expect(url.searchParams.get('tier')).toBe('2');
		expect(listedCreatureNames()).toEqual(['Hobgoblin']);

		await changeLineageFilter('Goblinoide');

		url = lastNavigationUrl();
		expect(url.searchParams.get('name')).toBe('gob');
		expect(url.searchParams.get('tier')).toBe('2');
		expect(url.searchParams.get('lineage')).toBe('Goblinoide');
		expect(listedCreatureNames()).toEqual(['Hobgoblin']);
	});

	it('@filter matches creature names case-insensitively and ignoring diacritics', async () => {
		render(BestiaryPage);

		await typeNameFilter('dragon');

		expect(listedCreatureNames()).toEqual(['Dragón']);
		expect(lastNavigationUrl().searchParams.get('name')).toBe('dragon');
	});

	it('@filter @lineage-filter resets name, tier and lineage together', async () => {
		setPageUrl('/bestiary?name=gob&tier=2&lineage=Goblinoide');
		render(BestiaryPage);

		expect(listedCreatureNames()).toEqual(['Hobgoblin']);

		await fireEvent.click(screen.getByRole('button', { name: 'Limpiar Filtros' }));

		const url = lastNavigationUrl();
		expect(url.searchParams.has('name')).toBe(false);
		expect(url.searchParams.has('tier')).toBe(false);
		expect(url.searchParams.has('lineage')).toBe(false);
		expect(listedCreatureNames()).toEqual(['Goblin', 'Hobgoblin', 'Lobo', 'Dragón']);
	});

	it('@lineage-filter offers lineage options from the full catalogue while the list stays filtered', async () => {
		setPageUrl('/bestiary?tier=1');
		render(BestiaryPage);

		expect(listedCreatureNames()).toEqual(['Goblin']);

		const lineageOptions = within(screen.getByRole('combobox', { name: 'Linaje' }))
			.getAllByRole('option')
			.map((option) => option.textContent?.trim());

		expect(lineageOptions).toEqual(['Todos los Linajes', 'Bestia', 'Dragón', 'Goblinoide']);
	});

	it('@selection @filter removes creatureId and returns to the instruction when filters exclude the selection', async () => {
		setPageUrl('/bestiary?creatureId=goblin');
		const { container } = render(BestiaryPage);

		await waitFor(() => expect(statblocksIn(container)).toHaveLength(1));

		await changeTierFilter('2');

		expect(testState.goto).toHaveBeenCalledExactlyOnceWith(
			'/bestiary?tier=2',
			QUERY_NAVIGATION_OPTIONS,
		);
		const url = lastNavigationUrl();
		expect(url.searchParams.get('tier')).toBe('2');
		expect(url.searchParams.has('creatureId')).toBe(false);

		await waitFor(() => expect(statblocksIn(container)).toHaveLength(0));
		expect(screen.getByText(/Selecciona una criatura/)).toBeInTheDocument();
	});

	it('@selection @filter keeps creatureId while active filters still include the selection', async () => {
		setPageUrl('/bestiary?creatureId=goblin');
		const { container } = render(BestiaryPage);

		await waitFor(() => expect(statblocksIn(container)).toHaveLength(1));

		await typeNameFilter('gob');

		const url = lastNavigationUrl();
		expect(url.searchParams.get('name')).toBe('gob');
		expect(url.searchParams.get('creatureId')).toBe('goblin');

		await waitFor(() => expect(statblocksIn(container)).toHaveLength(1));
		expect(listedCreatureNames()).toEqual(['Goblin', 'Hobgoblin']);
	});
});

describe('BestiaryPage loading race', () => {
	it('@selection @url-state @filter keeps a deep-linked creatureId when an inclusive filter arrives before the catalogue loads', async () => {
		setPageUrl('/bestiary?creatureId=goblin');
		testState.creatures.set([]);
		const load = createDeferred();
		testState.loadCreatures.mockImplementationOnce(() => load.promise);
		const { container } = render(BestiaryPage);

		expect(listedCreatureNames()).toEqual([]);

		await typeNameFilter('gob');

		const pendingUrl = lastNavigationUrl();
		expect(pendingUrl.searchParams.get('creatureId')).toBe('goblin');
		expect(pendingUrl.searchParams.get('name')).toBe('gob');

		testState.creatures.set(catalogue);
		load.resolve();

		await waitFor(() => expect(statblocksIn(container)).toHaveLength(1));
		expect(screen.getByRole('heading', { level: 2, name: 'Goblin' })).toBeInTheDocument();
		expect(listedCreatureNames()).toEqual(['Goblin', 'Hobgoblin']);
		expect(lastNavigationUrl().searchParams.get('creatureId')).toBe('goblin');
	});

	it('@selection @filter removes a deep-linked creatureId once the loaded data proves it is excluded', async () => {
		setPageUrl('/bestiary?creatureId=goblin');
		testState.creatures.set([]);
		const load = createDeferred();
		testState.loadCreatures.mockImplementationOnce(() => load.promise);
		const { container } = render(BestiaryPage);

		await typeNameFilter('dragon');

		const pendingUrl = lastNavigationUrl();
		expect(pendingUrl.searchParams.get('creatureId')).toBe('goblin');
		expect(pendingUrl.searchParams.get('name')).toBe('dragon');

		testState.creatures.set(catalogue);
		load.resolve();

		await waitFor(() => expect(lastNavigationUrl().searchParams.has('creatureId')).toBe(false));
		expect(statblocksIn(container)).toHaveLength(0);
		expect(screen.getByText(/Selecciona una criatura/)).toBeInTheDocument();
		const settledUrl = lastNavigationUrl();
		expect(settledUrl.searchParams.get('name')).toBe('dragon');
	});
});

describe('BestiaryPage responsive master-detail layout', () => {
	it('@master-detail @responsive places the catalogue panel before the detail panel', () => {
		setPageUrl('/bestiary?creatureId=goblin');
		const { container } = render(BestiaryPage);

		const layout = container.querySelector('.bestiary-layout');
		expect(layout).not.toBeNull();

		const panels = Array.from(layout?.children ?? []);
		expect(panels).toHaveLength(2);
		expect(panels[0]).toHaveClass('catalogue-panel');
		expect(panels[1]).toHaveClass('detail-panel');
	});

	it('@responsive scopes a two-column grid that stacks at 899px or less', () => {
		// jsdom cannot evaluate media queries, so the CSS contract is read from
		// the component source; visual geometry is verified manually.
		const source = readBestiaryPageSource();

		expect(source).toMatch(/\.bestiary-layout\s*\{[^}]*display:\s*grid/);
		expect(source).toMatch(/\.bestiary-layout\s*\{[^}]*grid-template-columns:/);
		expect(source).toMatch(
			/@media\s*\(max-width:\s*899px\)\s*\{[\s\S]*?grid-template-columns:\s*minmax\(\s*0,\s*1fr\s*\)/,
		);
		expect(source).not.toMatch(/:global\s*\(/);
	});

	it('@responsive @panel-scroll keeps the 899px stack and the 900px desktop boundaries complementary', () => {
		const pageStyleContent = styleContent(readBestiaryPageSource());
		const stackedBlock = cssMediaBlock(pageStyleContent, '@media (max-width: 899px)');
		const desktopBlock = cssMediaBlock(pageStyleContent, '@media (min-width: 900px)');

		expect(stackedBlock).not.toBe('');
		expect(desktopBlock).not.toBe('');

		const stackedBoundary = Number(stackedBlock.match(/max-width:\s*(\d+)px/)?.[1]);
		const desktopBoundary = Number(desktopBlock.match(/min-width:\s*(\d+)px/)?.[1]);
		expect(desktopBoundary).toBe(stackedBoundary + 1);
	});

	it('@responsive @panel-scroll leaves no stale 768px/769px bestiary breakpoint behind', () => {
		expect(styleContent(readBestiaryPageSource())).not.toMatch(/@media[^{]*\b(768|769)px/);
	});
});

describe('BestiaryPage desktop panel scroll contract', () => {
	// jsdom cannot evaluate media queries or measure scroll regions, so the
	// desktop CSS contract is read from the source and real geometry is
	// verified in a browser.
	const pageSource = readBestiaryPageSource();
	const desktopCss = cssMediaBlock(pageSource, '@media (min-width: 900px)');
	const desktopRules = parseCssRules(desktopCss);
	const baseRules = parseCssRules(stripMediaBlocks(styleContent(pageSource)));

	it('@panel-scroll @responsive bounds the desktop layout with a local, documented viewport budget', () => {
		expect(desktopCss).not.toBe('');

		const layoutDeclarations = declarationsFor(desktopRules, '.bestiary-layout');
		expect(layoutDeclarations).toMatch(/--bestiary-chrome-budget:\s*24rem/);
		expect(layoutDeclarations).toMatch(
			/height:\s*calc\(\s*100dvh\s*-\s*var\(\s*--bestiary-chrome-budget\s*\)\s*\)/,
		);
	});

	it('@panel-scroll @responsive keeps a shrinkable layout path so the panels can scroll', () => {
		const layoutDeclarations = declarationsFor(desktopRules, '.bestiary-layout');
		expect(layoutDeclarations).toMatch(/grid-template-rows:\s*minmax\(\s*0,\s*1fr\s*\)/);
		expect(layoutDeclarations).toMatch(/min-height:\s*0/);
		expect(layoutDeclarations).toMatch(/align-items:\s*stretch/);

		for (const panel of ['.catalogue-panel', '.detail-panel']) {
			expect(declarationsFor(desktopRules, panel)).toMatch(/min-height:\s*0/);
		}
	});

	it('@panel-scroll @responsive contains absolutely positioned panel decorations inside the scroll region', () => {
		// The catalogue's containing block lives on the base rule so its
		// sr-only labels stay clipped at every breakpoint; the detail panel
		// keeps its desktop-only containing block.
		expect(declarationsFor(baseRules, '.catalogue-panel')).toMatch(/position:\s*relative/);
		expect(declarationsFor(desktopRules, '.detail-panel')).toMatch(/position:\s*relative/);
	});

	it('@panel-scroll scrolls the catalogue and the selected statblock independently on desktop', () => {
		for (const panel of ['.catalogue-panel', '.detail-panel']) {
			const panelDeclarations = declarationsFor(desktopRules, panel);
			expect(panelDeclarations).toMatch(/overflow-y:\s*auto/);
			expect(panelDeclarations).toMatch(/overscroll-behavior:\s*contain/);
			expect(panelDeclarations).toMatch(/scrollbar-width:\s*thin/);
		}
	});

	it('@panel-scroll @responsive keeps the desktop contract scoped to local class rules', () => {
		expect(desktopCss).not.toBe('');

		const desktopSelectors = parseCssRules(desktopCss).flatMap((rule) => rule.selectors);
		expect(desktopSelectors.length).toBeGreaterThan(0);
		expect(desktopSelectors.every((selector) => selector.startsWith('.'))).toBe(true);
		expect(pageSource).not.toMatch(/:global\s*\(/);
	});

	it('@responsive keeps the stacked policy: one column, 45vh catalogue scroll and an in-flow statblock', () => {
		const stackedRules = parseCssRules(cssMediaBlock(pageSource, '@media (max-width: 899px)'));
		const layoutDeclarations = declarationsFor(stackedRules, '.bestiary-layout');
		const catalogueDeclarations = declarationsFor(stackedRules, '.catalogue-panel');

		expect(layoutDeclarations).toMatch(/grid-template-columns:\s*minmax\(\s*0,\s*1fr\s*\)/);
		expect(layoutDeclarations).not.toMatch(/height\s*:/);
		expect(catalogueDeclarations).toMatch(/max-height:\s*45vh/);
		expect(catalogueDeclarations).toMatch(/overflow-y:\s*auto/);
		expect(declarationsFor(stackedRules, '.detail-panel')).not.toMatch(/overflow-y:\s*auto/);
	});
});

describe('BestiaryPage catalogue containment contract', () => {
	const pageSource = readBestiaryPageSource();
	const baseRules = parseCssRules(stripMediaBlocks(styleContent(pageSource)));
	const stackedRules = parseCssRules(cssMediaBlock(pageSource, '@media (max-width: 899px)'));

	it('@responsive @panel-scroll gives the base catalogue panel a containing block for its absolute hidden labels', () => {
		// Browser check at 640x900 and 768x900: without this containing block
		// the absolute sr-only lineage labels escape the panel clip and inflate
		// the document scroll height far beyond the real content.
		expect(declarationsFor(baseRules, '.catalogue-panel')).toMatch(/position:\s*relative/);
	});

	it('@responsive keeps the stacked catalogue rules from negating the base containing block', () => {
		const stackedCatalogue = declarationsFor(stackedRules, '.catalogue-panel');

		expect(stackedCatalogue).toMatch(/max-height:\s*45vh/);
		expect(stackedCatalogue).toMatch(/overflow-y:\s*auto/);
		expect(stackedCatalogue).not.toMatch(/position\s*:/);
	});

	it('@responsive keeps the containing block on the catalogue instead of the unrelated detail panel', () => {
		expect(declarationsFor(baseRules, '.detail-panel')).not.toMatch(/position:\s*relative/);
	});
});
