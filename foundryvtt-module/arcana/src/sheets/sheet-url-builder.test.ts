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
				type: overrides.actorType,
				system: {
					health: hasHealth ? overrides.health : { value: 50, max: 100 },
				},
			},
			localNotes: overrides.localNotes ?? null,
			tokenBorderColor: overrides.tokenBorderColor,
			tokenOffsetX: overrides.tokenOffsetX,
			tokenOffsetY: overrides.tokenOffsetY,
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
				'https://app.arcana.com/embedded/characters/char1?mode=foundry&uuid=Actor.abc123&startHp=30&startMax=60&startTemp=0&borderColor=%23000000',
			);
			expect(result.isBestiary).toBe(false);
			expect(result.health).toEqual({ value: 30, max: 60, temp: 0 });
		});
	});

	describe('temporary HP param', () => {
		it('FEAT temp-hp-damage-absorption — includes startTemp for character URLs', () => {
			const params = createMockParams({
				sheetUrl: 'https://app.arcana.com/embedded/characters/char1',
				health: { value: 30, max: 60, temp: 4 },
			});

			const result = buildSheetUrl(params);

			expect(new URL(result.iframeUrl!).searchParams.get('startTemp')).toBe('4');
			expect(result.health.temp).toBe(4);
		});

		it('FEAT temp-hp-damage-absorption — includes startTemp for NPC and bestiary URLs', () => {
			const npc = buildSheetUrl(
				createMockParams({
					sheetUrl: 'https://app.arcana.com/npc/goblin',
					health: { value: 8, max: 10, temp: 3 },
				}),
			);
			const bestiary = buildSheetUrl(
				createMockParams({
					sheetUrl: 'https://app.arcana.com/bestiary/goblin',
					health: { value: 8, max: 10, temp: 3 },
				}),
			);

			expect(new URL(npc.iframeUrl!).searchParams.get('startTemp')).toBe('3');
			expect(new URL(bestiary.iframeUrl!).searchParams.get('startTemp')).toBe('3');
		});

		it('FEAT temp-hp-damage-absorption — defaults startTemp to 0 when the actor has no temporary HP', () => {
			const params = createMockParams({
				sheetUrl: 'https://app.arcana.com/embedded/characters/char1',
				health: { value: 30, max: 60 },
			});

			const result = buildSheetUrl(params);

			expect(new URL(result.iframeUrl!).searchParams.get('startTemp')).toBe('0');
			expect(result.health.temp).toBe(0);
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

			expect(result.health).toEqual({ value: 0, max: 0, temp: 0 });
			expect(result.iframeUrl).toContain('startHp=0');
			expect(result.iframeUrl).toContain('startMax=0');
			expect(result.iframeUrl).toContain('startTemp=0');
		});

		it('should use correct separator when URL already has query params', () => {
			const params = createMockParams({
				sheetUrl: 'https://app.arcana.com/embedded/characters/char1?existing=param',
			});

			const result = buildSheetUrl(params);

			expect(result.iframeUrl).toContain('existing=param&mode=foundry');
		});
	});

	describe('token offset params', () => {
		it('should include tokenOffsetX and tokenOffsetY in URL when provided', () => {
			const params = createMockParams({
				sheetUrl: 'https://app.arcana.com/embedded/characters/char1',
				tokenOffsetX: -25,
				tokenOffsetY: 15,
			});

			const result = buildSheetUrl(params);

			expect(result.iframeUrl).toContain('tokenOffsetX=-25');
			expect(result.iframeUrl).toContain('tokenOffsetY=15');
		});

		it('should NOT include token offset params when undefined', () => {
			const params = createMockParams({
				sheetUrl: 'https://app.arcana.com/embedded/characters/char1',
			});

			const result = buildSheetUrl(params);

			expect(result.iframeUrl).not.toContain('tokenOffsetX');
			expect(result.iframeUrl).not.toContain('tokenOffsetY');
		});
	});

	describe('token border color param', () => {
		const palette = [
			['black', '#000000'],
			['red', '#990000'],
			['green', '#27a241'],
			['yellow', '#e6b800'],
			['orange', '#d35400'],
			['gray', '#9aa0a6'],
			['lightblue', '#2b89fb'],
			['purple', '#7800ff'],
		] as const;

		it('includes the black default for character URLs when no color is configured', () => {
			const params = createMockParams({
				sheetUrl: 'https://app.arcana.com/embedded/characters/char1',
			});

			const result = buildSheetUrl(params);

			expect(new URL(result.iframeUrl!).searchParams.get('borderColor')).toBe('#000000');
		});

		it('includes the red default for NPC and bestiary URLs when no color is configured', () => {
			const npc = buildSheetUrl(
				createMockParams({ sheetUrl: 'https://app.arcana.com/npc/goblin' }),
			);
			const bestiary = buildSheetUrl(
				createMockParams({ sheetUrl: 'https://app.arcana.com/bestiary/goblin' }),
			);

			expect(new URL(npc.iframeUrl!).searchParams.get('borderColor')).toBe('#990000');
			expect(new URL(bestiary.iframeUrl!).searchParams.get('borderColor')).toBe('#990000');
		});

		it.each(palette)('encodes the configured %s color as its resolved hex', (id, hex) => {
			const params = createMockParams({
				sheetUrl: 'https://app.arcana.com/embedded/characters/char1',
				tokenBorderColor: id,
			});

			const result = buildSheetUrl(params);

			expect(new URL(result.iframeUrl!).searchParams.get('borderColor')).toBe(hex);
		});

		it('resolves the legacy silver id to the gray hex', () => {
			const params = createMockParams({
				sheetUrl: 'https://app.arcana.com/embedded/characters/char1',
				tokenBorderColor: 'silver',
			});

			const result = buildSheetUrl(params);

			expect(new URL(result.iframeUrl!).searchParams.get('borderColor')).toBe('#9aa0a6');
		});

		it('falls back to the actor default when the stored color is invalid', () => {
			const character = buildSheetUrl(
				createMockParams({
					sheetUrl: 'https://app.arcana.com/embedded/characters/char1',
					tokenBorderColor: 'magenta',
				}),
			);
			const npc = buildSheetUrl(
				createMockParams({
					sheetUrl: 'https://app.arcana.com/npc/goblin',
					tokenBorderColor: 'magenta',
				}),
			);

			expect(new URL(character.iframeUrl!).searchParams.get('borderColor')).toBe('#000000');
			expect(new URL(npc.iframeUrl!).searchParams.get('borderColor')).toBe('#990000');
		});

		it('prefers the actor type default over the bestiary route fallback', () => {
			const params = createMockParams({
				sheetUrl: 'https://app.arcana.com/bestiary/goblin',
				actorType: 'character',
			});

			const result = buildSheetUrl(params);

			expect(new URL(result.iframeUrl!).searchParams.get('borderColor')).toBe('#000000');
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
				'https://app.arcana.com/bestiary/goblin?mode=foundry&uuid=Actor.123&startHp=8&startMax=8&startTemp=0&borderColor=%23990000',
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
