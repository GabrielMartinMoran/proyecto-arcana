/**
 * Unit tests for sheet-url-builder.ts
 * Pure functions for building sheet URLs and token settings
 */

import { describe, expect, it } from 'vitest';
import { buildSheetUrl, buildTokenSettings } from './sheet-url-builder';

describe('buildSheetUrl', () => {
	const createMockParams = (overrides: any = {}): Parameters<typeof buildSheetUrl>[0] => {
		// Use 'in' operator to check if property was explicitly passed (including undefined)
		const hasHealth = 'health' in overrides;
		const hasUuid = 'uuid' in overrides;

		return {
			sheetUrl: overrides.sheetUrl ?? null,
			baseUrl: overrides.baseUrl ?? 'https://app.arcana.com',
			actor: {
				uuid: hasUuid ? overrides.uuid : 'Actor.abc123',
				id: overrides.id ?? 'actor-123',
				name: overrides.name ?? 'Test Actor',
				system: {
					health: hasHealth ? overrides.health : { value: 50, max: 100 },
				},
			},
			localNotes: overrides.localNotes ?? null,
		};
	};

	describe('character URL with health params', () => {
		it('should build URL with correct health params for character', () => {
			const params = createMockParams({
				sheetUrl: 'https://app.arcana.com/embedded/characters/char1',
				health: { value: 30, max: 60 },
			});

			const result = buildSheetUrl(params);

			expect(result.iframeUrl).toBe(
				'https://app.arcana.com/embedded/characters/char1?mode=foundry&uuid=Actor.abc123&startHp=30&startMax=60',
			);
			expect(result.isBestiary).toBe(false);
			expect(result.health).toEqual({ value: 30, max: 60 });
		});
	});

	describe('shared character URL transformation', () => {
		it('should transform /characters/shared/ to /embedded/characters/', () => {
			const params = createMockParams({
				sheetUrl: 'https://app.arcana.com/characters/shared/char123',
			});

			const result = buildSheetUrl(params);

			expect(result.iframeUrl).toContain('/embedded/characters/');
			expect(result.iframeUrl).not.toContain('/characters/shared/');
		});

		it('should preserve existing /embedded/ URL', () => {
			const params = createMockParams({
				sheetUrl: 'https://app.arcana.com/embedded/characters/char456',
			});

			const result = buildSheetUrl(params);

			expect(result.iframeUrl).toContain('/embedded/characters/char456');
		});
	});

	describe('bestiary URL detection', () => {
		it('should detect bestiary from /bestiary/ path', () => {
			const params = createMockParams({
				sheetUrl: 'https://app.arcana.com/bestiary/goblin',
			});

			const result = buildSheetUrl(params);

			expect(result.isBestiary).toBe(true);
		});

		it('should detect bestiary from /creatures/ path', () => {
			const params = createMockParams({
				sheetUrl: 'https://app.arcana.com/creatures/dragon',
			});

			const result = buildSheetUrl(params);

			expect(result.isBestiary).toBe(true);
		});

		it('should detect bestiary from /npc path', () => {
			const params = createMockParams({
				sheetUrl: 'https://app.arcana.com/npc/goblin',
			});

			const result = buildSheetUrl(params);

			expect(result.isBestiary).toBe(true);
		});

		it('should extract localNotes for bestiary', () => {
			const params = createMockParams({
				sheetUrl: 'https://app.arcana.com/bestiary/dragon',
				localNotes: 'Fire breath: 2d6',
			});

			const result = buildSheetUrl(params);

			expect(result.localNotes).toBe('Fire breath: 2d6');
		});
	});

	describe('NPC URL with readonly=1', () => {
		it('should add readonly=1 for NPC URLs', () => {
			const params = createMockParams({
				sheetUrl: 'https://app.arcana.com/npc/goblin',
			});

			const result = buildSheetUrl(params);

			expect(result.iframeUrl).toContain('readonly=1');
		});

		it('should NOT add readonly=1 for character URLs', () => {
			const params = createMockParams({
				sheetUrl: 'https://app.arcana.com/embedded/characters/char1',
			});

			const result = buildSheetUrl(params);

			expect(result.iframeUrl).not.toContain('readonly=1');
		});
	});

	describe('missing sheetUrl fallback to baseUrl', () => {
		it('should use baseUrl when sheetUrl is null', () => {
			const params = createMockParams({
				sheetUrl: null,
				baseUrl: 'https://fallback.arcana.com',
			});

			const result = buildSheetUrl(params);

			expect(result.iframeUrl).toContain('https://fallback.arcana.com');
		});

		it('should use baseUrl when sheetUrl is empty string', () => {
			const params = createMockParams({
				sheetUrl: '',
				baseUrl: 'https://fallback.arcana.com',
			});

			const result = buildSheetUrl(params);

			expect(result.iframeUrl).toContain('https://fallback.arcana.com');
		});
	});

	describe('edge cases', () => {
		it('should use actor.id when uuid is null', () => {
			const params = createMockParams({
				sheetUrl: 'https://app.arcana.com/embedded/characters/char1',
				uuid: null,
				id: 'actor-456',
			});

			const result = buildSheetUrl(params);

			expect(result.iframeUrl).toContain('uuid=actor-456');
		});

		it('should handle missing health data', () => {
			const params = createMockParams({
				sheetUrl: 'https://app.arcana.com/embedded/characters/char1',
				health: undefined,
			});

			const result = buildSheetUrl(params);

			expect(result.health).toEqual({ value: 0, max: 0 });
			expect(result.iframeUrl).toContain('startHp=0');
			expect(result.iframeUrl).toContain('startMax=0');
		});

		it('should use correct separator when URL already has query params', () => {
			const params = createMockParams({
				sheetUrl: 'https://app.arcana.com/embedded/characters/char1?existing=param',
			});

			const result = buildSheetUrl(params);

			expect(result.iframeUrl).toContain('existing=param&mode=foundry');
		});
	});

	describe('hash fragment handling', () => {
		it('should place query params before hash for custom NPC URL', () => {
			const params = createMockParams({
				sheetUrl: 'https://app.arcana.com/npc#yaml=goblin',
				health: { value: 8, max: 8 },
				uuid: 'Actor.123',
			});

			const result = buildSheetUrl(params);
			const url = result.iframeUrl!;

			const hashIndex = url.indexOf('#');
			const queryIndex = url.indexOf('?');

			expect(queryIndex).toBeGreaterThan(-1);
			expect(hashIndex).toBeGreaterThan(-1);
			expect(queryIndex).toBeLessThan(hashIndex);
			expect(url).toContain('mode=foundry');
			expect(url).toContain('uuid=Actor.123');
			expect(url).toContain('startHp=8');
			expect(url).toContain('startMax=8');
			expect(url).toContain('readonly=1');
			expect(url.endsWith('#yaml=goblin')).toBe(true);
		});

		it('should produce correct URL for bestiary without hash fragment', () => {
			const params = createMockParams({
				sheetUrl: 'https://app.arcana.com/bestiary/goblin',
				health: { value: 8, max: 8 },
				uuid: 'Actor.123',
			});

			const result = buildSheetUrl(params);
			const url = result.iframeUrl!;

			expect(url).toBe(
				'https://app.arcana.com/bestiary/goblin?mode=foundry&uuid=Actor.123&startHp=8&startMax=8',
			);
			expect(url).not.toContain('#');
		});

		it('should preserve existing query params and hash fragment', () => {
			const params = createMockParams({
				sheetUrl: 'https://app.arcana.com/embedded/characters/char1?existing=param#section',
				health: { value: 8, max: 8 },
				uuid: 'Actor.123',
			});

			const result = buildSheetUrl(params);
			const url = result.iframeUrl!;

			expect(url).toContain('existing=param');
			expect(url).toContain('mode=foundry');
			expect(url.endsWith('#section')).toBe(true);
		});
	});
});

describe('buildTokenSettings', () => {
	describe('token settings construction', () => {
		it('should build token settings for linked actor', () => {
			const result = buildTokenSettings(true, 'Gandalf');

			expect(result['prototypeToken.actorLink']).toBe(true);
			expect(result['prototypeToken.displayBars']).toBe(40);
			expect(result['prototypeToken.bar1.attribute']).toBe('health');
			expect(result['prototypeToken.bar2.attribute']).toBe(null);
			expect(result['prototypeToken.sight.enabled']).toBe(true);
		});

		it('should build token settings for unlinked actor', () => {
			const result = buildTokenSettings(false, 'Goblin');

			expect(result['prototypeToken.actorLink']).toBe(false);
			expect(result['prototypeToken.displayBars']).toBe(40);
			expect(result['prototypeToken.bar1.attribute']).toBe('health');
			expect(result['prototypeToken.bar2.attribute']).toBe(null);
			expect(result['prototypeToken.sight.enabled']).toBe(true);
		});
	});

	describe('actorName parameter', () => {
		it('should accept actorName without affecting output', () => {
			const result1 = buildTokenSettings(true, 'Gandalf');
			const result2 = buildTokenSettings(true, 'Saruman');

			// Results should be identical regardless of actor name
			expect(result1).toEqual(result2);
		});
	});
});
