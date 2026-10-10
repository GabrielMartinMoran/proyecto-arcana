import { render } from '@testing-library/svelte';
import { tick } from 'svelte';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import BestiaryPage from './+page.svelte';

const mocks = vi.hoisted(() => {
	// eslint-disable-next-line @typescript-eslint/no-require-imports
	const { writable } = require('svelte/store');
	return {
		page: writable({
			params: { creatureId: 'goblin' },
			url: new URL('http://localhost/embedded/bestiary/goblin'),
		}),
		creatures: writable([] as any[]),
		loadCreatures: vi.fn().mockResolvedValue(undefined),
		syncCreatureState: vi.fn(),
		isInsideFoundry: vi.fn().mockReturnValue(true),
		subscribeToFoundryTokenColorUpdates: vi.fn(),
		unsubscribe: vi.fn(),
	};
});

vi.mock('$app/stores', () => ({ page: mocks.page }));

vi.mock('$app/environment', () => ({ browser: true }));

vi.mock('$lib/services/creatures-service', () => ({
	useCreaturesService: () => ({ loadCreatures: mocks.loadCreatures, creatures: mocks.creatures }),
}));

vi.mock('$lib/services/dice-roller-service', () => ({
	useDiceRollerService: () => ({}),
}));

vi.mock('$lib/services/foundryvtt-service', () => ({
	useFoundryVTTService: () => ({
		isInsideFoundry: mocks.isInsideFoundry,
		syncCreatureState: mocks.syncCreatureState,
		subscribeToFoundryTokenColorUpdates: mocks.subscribeToFoundryTokenColorUpdates,
	}),
}));

vi.mock(
	'$lib/components/statblock/Statblock.svelte',
	async () => await import('./__mocks__/Statblock.svelte'),
);

vi.mock(
	'$lib/components/RollModal.svelte',
	async () => await import('./__mocks__/RollModal.svelte'),
);

const creature = { id: 'goblin', name: 'Goblin' };

describe('Embedded bestiary Foundry token color live update', () => {
	let colorListener: ((color: string) => void) | undefined;

	beforeEach(() => {
		vi.clearAllMocks();
		colorListener = undefined;
		mocks.subscribeToFoundryTokenColorUpdates.mockImplementation(
			(listener: (color: string) => void) => {
				colorListener = listener;
				return mocks.unsubscribe;
			},
		);
		mocks.creatures.set([creature]);
		mocks.page.set({
			params: { creatureId: 'goblin' },
			url: new URL('http://localhost/embedded/bestiary/goblin'),
		});
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('FEAT token-border-color-selection — subscribes on mount and re-syncs the creature with the live color', async () => {
		render(BestiaryPage);
		await tick();
		await new Promise((resolve) => setTimeout(resolve, 0));

		expect(mocks.subscribeToFoundryTokenColorUpdates).toHaveBeenCalledTimes(1);
		expect(mocks.syncCreatureState).toHaveBeenCalledWith(creature);
		expect(colorListener).toBeTypeOf('function');

		mocks.syncCreatureState.mockClear();
		colorListener?.('#d35400');

		expect(mocks.syncCreatureState).toHaveBeenCalledWith(creature, '#d35400');
	});

	it('FEAT token-border-color-selection — unsubscribes from the color channel when destroyed', async () => {
		const { unmount } = render(BestiaryPage);
		await tick();
		await new Promise((resolve) => setTimeout(resolve, 0));

		unmount();

		expect(mocks.unsubscribe).toHaveBeenCalledTimes(1);
	});
});
