import type { Creature } from '$lib/types/creature';
import { get } from 'svelte/store';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { foundryParams, useFoundryVTTService } from './foundryvtt-service';

const { mockPage } = vi.hoisted(() => {
	// eslint-disable-next-line @typescript-eslint/no-require-imports
	const { writable } = require('svelte/store');
	return {
		mockPage: writable({ url: new URL('http://localhost/') }),
	};
});

vi.mock('$app/stores', () => ({
	page: mockPage,
}));

vi.mock('$app/environment', () => ({
	browser: true,
}));

vi.mock('$lib/utils/token-cutter', () => ({
	createCircularToken: vi.fn().mockResolvedValue('mock-token-url'),
}));

describe('foundryParams', () => {
	beforeEach(() => {
		mockPage.set({ url: new URL('http://localhost/') });
	});

	describe('query string detection', () => {
		it('detects Foundry mode from query string', () => {
			mockPage.set({
				url: new URL('http://localhost/?mode=foundry&uuid=Actor.123'),
			});

			const params = get(foundryParams);

			expect(params.isFoundry).toBe(true);
			expect(params.uuid).toBe('Actor.123');
		});

		it('reads startHp and startMax from query string', () => {
			mockPage.set({
				url: new URL('http://localhost/?mode=foundry&uuid=Actor.123&startHp=8&startMax=10'),
			});

			const params = get(foundryParams);

			expect(params.startHp).toBe('8');
			expect(params.startMax).toBe('10');
		});

		it('returns isFoundry false when mode is missing', () => {
			mockPage.set({
				url: new URL('http://localhost/?uuid=Actor.123'),
			});

			const params = get(foundryParams);

			expect(params.isFoundry).toBe(false);
			expect(params.uuid).toBe('Actor.123');
		});

		it('falls back to actorId when uuid is missing', () => {
			mockPage.set({
				url: new URL('http://localhost/?mode=foundry&actorId=Actor.456'),
			});

			const params = get(foundryParams);

			expect(params.uuid).toBe('Actor.456');
		});
	});

	describe('hash params fallback', () => {
		it('detects Foundry mode from hash params when query string is empty', () => {
			mockPage.set({
				url: new URL('http://localhost/#mode=foundry&uuid=Actor.123'),
			});

			const params = get(foundryParams);

			expect(params.isFoundry).toBe(true);
			expect(params.uuid).toBe('Actor.123');
		});

		it('reads startHp and startMax from hash params fallback', () => {
			mockPage.set({
				url: new URL('http://localhost/#mode=foundry&uuid=Actor.123&startHp=8&startMax=10'),
			});

			const params = get(foundryParams);

			expect(params.startHp).toBe('8');
			expect(params.startMax).toBe('10');
		});

		it('prefers query string over hash params', () => {
			mockPage.set({
				url: new URL('http://localhost/?mode=foundry&uuid=Actor.query#mode=web&uuid=Actor.hash'),
			});

			const params = get(foundryParams);

			expect(params.isFoundry).toBe(true);
			expect(params.uuid).toBe('Actor.query');
		});

		it('falls back to hash params when query param is missing', () => {
			mockPage.set({
				url: new URL('http://localhost/?mode=foundry#uuid=Actor.hash'),
			});

			const params = get(foundryParams);

			expect(params.isFoundry).toBe(true);
			expect(params.uuid).toBe('Actor.hash');
		});
	});
});

describe('useFoundryVTTService', () => {
	let postMessageSpy: ReturnType<typeof vi.fn>;

	beforeEach(() => {
		postMessageSpy = vi.fn();
		vi.stubGlobal('parent', { postMessage: postMessageSpy });
		mockPage.set({ url: new URL('http://localhost/') });
	});

	describe('syncCreatureState', () => {
		const createTestCreature = (overrides: Partial<Creature> = {}): Creature => ({
			id: 'goblin-1',
			name: 'Goblin',
			lineage: 'Goblinoide',
			tier: 1,
			size: 'Mediano',
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
			behavior: 'Actúa en pequeños grupos.',
			img: null,
			...overrides,
		});

		it('sends UPDATE_ACTOR message with creature name and hp when in Foundry mode', async () => {
			mockPage.set({
				url: new URL('http://localhost/?mode=foundry&uuid=Actor.123'),
			});

			const creature = createTestCreature();
			const { syncCreatureState } = useFoundryVTTService();
			await syncCreatureState(creature);

			expect(postMessageSpy).toHaveBeenCalledTimes(1);
			const payload = postMessageSpy.mock.calls[0][0];
			expect(payload.type).toBe('UPDATE_ACTOR');
			expect(payload.uuid).toBe('Actor.123');
			expect(payload.actorId).toBe('Actor.123');
			expect(payload.payload.name).toBe('Goblin');
			expect(payload.payload.hp.value).toBe(8);
			expect(payload.payload.hp.max).toBe(8);
		});

		it('does not send message when not in Foundry mode', async () => {
			mockPage.set({
				url: new URL('http://localhost/'),
			});

			const creature = createTestCreature();
			const { syncCreatureState } = useFoundryVTTService();
			await syncCreatureState(creature);

			expect(postMessageSpy).not.toHaveBeenCalled();
		});

		it('does not send message when uuid is missing', async () => {
			mockPage.set({
				url: new URL('http://localhost/?mode=foundry'),
			});

			const creature = createTestCreature();
			const { syncCreatureState } = useFoundryVTTService();
			await syncCreatureState(creature);

			expect(postMessageSpy).not.toHaveBeenCalled();
		});
	});
});
