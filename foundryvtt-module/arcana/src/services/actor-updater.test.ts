/**
 * Unit tests for ActorUpdater service
 * Tests actor update handling scenarios from Gherkin specs
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MESSAGE_TYPES } from '../types/messages';
import { ActorUpdater } from './actor-updater';

describe('ActorUpdater', () => {
	let actorUpdater: ActorUpdater;

	const createMockActor = (overrides: any = {}): any => ({
		id: 'actor-123',
		uuid: 'Actor.abc123',
		name: overrides.name || 'Test Actor',
		img: 'old-image.jpg',
		system: {
			health: overrides.health || {
				value: 50,
				max: 100,
			},
			speed: overrides.speed ?? 0,
		},
		isToken: false,
		prototypeToken: {
			actorLink: false,
			displayBars: 40,
			bar1: { attribute: 'health' },
			bar2: { attribute: null },
			sight: { enabled: true },
			name: overrides.name || 'Test Actor',
			texture: { src: 'old-image.jpg' },
		},
		token: null,
		sheet: null,
		baseActor: null,
		getFlag: vi.fn((scope: string, key: string) => {
			if (scope === 'arcana') {
				if (key === 'sheetUrl') return overrides.sheetUrl || '';
				if (key === 'imgSource') return overrides.imgSource;
				if (key === 'initiative') return overrides.initiative;
				if (key === 'tokenOffsetX') return overrides.tokenOffsetX;
				if (key === 'tokenOffsetY') return overrides.tokenOffsetY;
			}
			return undefined;
		}),
		setFlag: vi.fn().mockResolvedValue(undefined),
		update: vi.fn().mockResolvedValue(undefined),
		getActiveTokens: vi.fn().mockReturnValue([]),
		render: vi.fn(),
	});

	beforeEach(() => {
		actorUpdater = new ActorUpdater();
		vi.clearAllMocks();
		vi.stubGlobal('game', {
			actors: {
				get: vi.fn().mockReturnValue(undefined),
			},
		});
		vi.stubGlobal('canvas', { scene: null });
		vi.stubGlobal('ui', { actors: { render: vi.fn() } });
		vi.stubGlobal('fromUuid', vi.fn().mockResolvedValue(undefined));
	});

	describe('handleUpdateActor', () => {
		it('FEAT foundry-actor-token-updates-tolerate-v14-token-shapes — regular actor updates TokenDocuments requested from active tokens', async () => {
			const tokenDocument = {
				update: vi.fn().mockResolvedValue(undefined),
			};
			const tokenPlaceable = { document: tokenDocument };
			const mockActor = createMockActor({
				sheetUrl: 'https://app.arcana.com/embedded/characters/123',
				name: 'Old Name',
				imgSource: 'old-source',
			});
			mockActor.img = 'old-image.jpg';
			mockActor.getActiveTokens = vi.fn((_linked?: boolean, document?: boolean) =>
				document ? [tokenDocument] : [tokenPlaceable],
			);

			vi.mocked(game.actors.get).mockReturnValue(mockActor);

			await expect(
				actorUpdater.handleUpdateActor({
					type: MESSAGE_TYPES.UPDATE_ACTOR,
					actorId: 'actor-123',
					payload: {
						name: 'New Name',
						imageUrl: 'new-image.jpg',
						imageSource: 'new-source',
					},
				}),
			).resolves.not.toThrow();

			expect(mockActor.getActiveTokens).toHaveBeenCalledWith(false, true);
			expect(tokenDocument.update).toHaveBeenCalledWith({
				name: 'New Name',
				'texture.src': 'new-image.jpg',
			});
		});

		it('FEAT foundry-actor-token-updates-tolerate-v14-token-shapes — synthetic actor updates owning token document', async () => {
			const drawBars = vi.fn();
			const tokenDocument = {
				object: { drawBars },
				update: vi.fn().mockResolvedValue(undefined),
			};
			const mockActor = createMockActor({
				sheetUrl: 'https://app.arcana.com/embedded/characters/123',
				name: 'Old Synthetic',
				health: { value: 2, max: 5 },
				imgSource: 'old-source',
			});
			mockActor.isToken = true;
			mockActor.token = tokenDocument;
			mockActor.img = 'old-image.jpg';
			vi.mocked(game.actors.get).mockReturnValue(mockActor);
			vi.stubGlobal('foundry', {
				utils: {
					getProperty: vi.fn((obj: any, path: string) => {
						if (path === 'system.health.value') return obj.system?.health?.value;
						if (path === 'system.health.max') return obj.system?.health?.max;
						return undefined;
					}),
				},
			});

			await expect(
				actorUpdater.handleUpdateActor({
					type: MESSAGE_TYPES.UPDATE_ACTOR,
					actorId: 'actor-123',
					payload: {
						name: 'Synthetic Updated',
						imageUrl: 'synthetic-image.jpg',
						imageSource: 'new-source',
						hp: { value: 3, max: 5 },
					},
				}),
			).resolves.not.toThrow();

			expect(mockActor.getActiveTokens).not.toHaveBeenCalled();
			expect(tokenDocument.update).toHaveBeenCalledWith({
				name: 'Synthetic Updated',
				'texture.src': 'synthetic-image.jpg',
			});
			expect(drawBars).toHaveBeenCalledOnce();
		});

		it('FEAT foundry-actor-speed-synchronization — Foundry stores synchronized speed on the actor', async () => {
			const mockActor = createMockActor({ speed: 0 });
			vi.mocked(game.actors.get).mockReturnValue(mockActor);

			await actorUpdater.handleUpdateActor({
				type: MESSAGE_TYPES.UPDATE_ACTOR,
				actorId: 'actor-123',
				payload: { speed: 7 },
			});

			expect(mockActor.update).toHaveBeenCalledWith(
				expect.objectContaining({ 'system.speed': 7 }),
				{ render: false },
			);
		});

		it('FEAT npc-ability-counter-initialization — new counters start available from synchronized definitions', async () => {
			const mockActor = createMockActor({
				sheetUrl: 'https://app.arcana.com/bestiary/goblin',
				npcAbilityDefinitions: undefined,
				npcAbilityUsage: undefined,
			});
			mockActor.getFlag = vi.fn((scope: string, key: string) => {
				if (scope !== 'arcana') return undefined;
				if (key === 'sheetUrl') return 'https://app.arcana.com/bestiary/goblin';
				if (key === 'npcAbilityUsage') return undefined;
				return undefined;
			});
			vi.mocked(game.actors.get).mockReturnValue(mockActor);

			await actorUpdater.handleUpdateActor({
				type: MESSAGE_TYPES.UPDATE_ACTOR,
				actorId: 'actor-123',
				payload: {
					npcAbilityDefinitions: [
						{
							id: 'goblin:actions:aliento:1',
							name: 'Aliento',
							source: 'actions',
							type: 'RELOAD',
							max: 1,
							rechargeTarget: 6,
							order: 0,
						},
						{
							id: 'goblin:actions:golpe:1',
							name: 'Golpe',
							source: 'actions',
							type: 'USES',
							max: 3,
							order: 1,
						},
					],
				},
			});

			expect(mockActor.update).toHaveBeenCalledWith(
				expect.objectContaining({
					'flags.arcana.npcAbilityDefinitions': expect.any(Array),
					'flags.arcana.npcAbilityUsage': {
						'goblin:actions:aliento:1': { current: 1, max: 1 },
						'goblin:actions:golpe:1': { current: 3, max: 3 },
					},
				}),
				{ render: false },
			);
		});

		it('FEAT npc-ability-counter-initialization — existing counters survive a metadata refresh', async () => {
			const mockActor = createMockActor({ sheetUrl: 'https://app.arcana.com/bestiary/goblin' });
			mockActor.getFlag = vi.fn((scope: string, key: string) => {
				if (scope !== 'arcana') return undefined;
				if (key === 'sheetUrl') return 'https://app.arcana.com/bestiary/goblin';
				if (key === 'npcAbilityUsage') {
					return { 'goblin:actions:aliento:1': { current: 0, max: 1 } };
				}
				return undefined;
			});
			vi.mocked(game.actors.get).mockReturnValue(mockActor);

			await actorUpdater.handleUpdateActor({
				type: MESSAGE_TYPES.UPDATE_ACTOR,
				actorId: 'actor-123',
				payload: {
					npcAbilityDefinitions: [
						{
							id: 'goblin:actions:aliento:1',
							name: 'Aliento',
							source: 'actions',
							type: 'RELOAD',
							max: 1,
							rechargeTarget: 6,
							order: 0,
						},
					],
				},
			});

			expect(mockActor.update).toHaveBeenCalledWith(
				expect.objectContaining({
					'flags.arcana.npcAbilityUsage': {
						'goblin:actions:aliento:1': { current: 0, max: 1 },
					},
				}),
				{ render: false },
			);
		});

		it('FEAT npc-ability-usage-state-ownership — unlinked token NPC counters are initialized on token flags', async () => {
			const tokenDocument = {
				actorLink: false,
				getFlag: vi.fn().mockReturnValue(undefined),
				setFlag: vi.fn().mockResolvedValue(undefined),
			};
			const mockActor = createMockActor({ sheetUrl: 'https://app.arcana.com/bestiary/goblin' });
			mockActor.isToken = true;
			mockActor.token = tokenDocument;
			mockActor.getFlag = vi.fn((scope: string, key: string) => {
				if (scope === 'arcana' && key === 'sheetUrl')
					return 'https://app.arcana.com/bestiary/goblin';
				return undefined;
			});
			vi.mocked(game.actors.get).mockReturnValue(mockActor);

			await actorUpdater.handleUpdateActor({
				type: MESSAGE_TYPES.UPDATE_ACTOR,
				actorId: 'actor-123',
				payload: {
					npcAbilityDefinitions: [
						{
							id: 'goblin:actions:aliento:1',
							name: 'Aliento',
							source: 'actions',
							type: 'RELOAD',
							max: 1,
							rechargeTarget: 6,
							order: 0,
						},
					],
				},
			});

			expect(mockActor.update).toHaveBeenCalledWith(
				expect.not.objectContaining({ 'flags.arcana.npcAbilityUsage': expect.anything() }),
				{ render: false },
			);
			expect(tokenDocument.setFlag).toHaveBeenCalledWith('arcana', 'npcAbilityUsage', {
				'goblin:actions:aliento:1': { current: 1, max: 1 },
			});
		});

		it('should call ui.actors.render() without arguments after update', async () => {
			const mockActor = createMockActor({
				sheetUrl: 'https://app.arcana.com/embedded/characters/123',
				name: 'Old Name',
			});
			vi.mocked(game.actors.get).mockReturnValue(mockActor);

			const updateData = {
				type: MESSAGE_TYPES.UPDATE_ACTOR,
				actorId: 'actor-123',
				payload: { name: 'New Name' },
			};

			await actorUpdater.handleUpdateActor(updateData);

			expect(ui.actors.render).toHaveBeenCalledWith();
		});

		it('should update actor name with [DEV] prefix for localhost URL', async () => {
			// GIVEN a develop URL actor
			const mockActor = createMockActor({
				sheetUrl: 'http://localhost:3000/sheets/character/123',
				name: 'Old Name',
			});

			vi.mocked(game.actors.get).mockReturnValue(mockActor);

			// WHEN handling name update
			const updateData = {
				type: MESSAGE_TYPES.UPDATE_ACTOR,
				actorId: 'actor-123',
				payload: { name: 'Test Character' },
			};

			await actorUpdater.handleUpdateActor(updateData);

			// THEN name should have [DEV] prefix
			expect(mockActor.update).toHaveBeenCalledWith(
				expect.objectContaining({
					name: '[DEV] Test Character',
					'prototypeToken.name': '[DEV] Test Character',
				}),
				{ render: false },
			);
		});

		it('should update actor name without prefix for production URL', async () => {
			// GIVEN a production URL actor
			const mockActor = createMockActor({
				sheetUrl: 'https://app.arcana.com/embedded/characters/123',
				name: 'Old Name',
			});

			vi.mocked(game.actors.get).mockReturnValue(mockActor);

			// WHEN handling name update
			const updateData = {
				type: MESSAGE_TYPES.UPDATE_ACTOR,
				actorId: 'actor-123',
				payload: { name: 'Production Char' },
			};

			await actorUpdater.handleUpdateActor(updateData);

			// THEN name should NOT have [DEV] prefix
			expect(mockActor.update).toHaveBeenCalledWith(
				expect.objectContaining({
					name: 'Production Char',
					'prototypeToken.name': 'Production Char',
				}),
				{ render: false },
			);
		});

		it('should skip update when name is unchanged', async () => {
			// GIVEN an actor with same name
			const mockActor = createMockActor({
				sheetUrl: 'https://app.arcana.com/embedded/characters/123',
				name: 'Unchanged Actor',
			});

			vi.mocked(game.actors.get).mockReturnValue(mockActor);

			// WHEN handling name update with same name
			const updateData = {
				type: MESSAGE_TYPES.UPDATE_ACTOR,
				actorId: 'actor-123',
				payload: { name: 'Unchanged Actor' },
			};

			await actorUpdater.handleUpdateActor(updateData);

			// THEN update should NOT be called
			expect(mockActor.update).not.toHaveBeenCalled();
		});
	});

	describe('HP updates', () => {
		it('FEAT foundry-actor-token-updates-tolerate-v14-token-shapes — health updates redraw active TokenDocument bars', async () => {
			const drawBars = vi.fn();
			const tokenDocument = { object: { drawBars } };
			const mockActor = createMockActor({
				sheetUrl: 'https://app.arcana.com/embedded/characters/char1',
				health: { value: 3, max: 10 },
			});
			mockActor.getActiveTokens = vi.fn((_linked?: boolean, document?: boolean) =>
				document ? [tokenDocument] : [{ document: tokenDocument }],
			);

			vi.mocked(game.actors.get).mockReturnValue(mockActor);
			vi.stubGlobal('foundry', {
				utils: {
					getProperty: vi.fn((obj: any, path: string) => {
						if (path === 'system.health.value') return obj.system?.health?.value;
						if (path === 'system.health.max') return obj.system?.health?.max;
						return undefined;
					}),
				},
			});

			await actorUpdater.handleUpdateActor({
				type: MESSAGE_TYPES.UPDATE_ACTOR,
				actorId: 'actor-123',
				payload: { hp: { value: 5, max: 10 } },
			});

			expect(mockActor.getActiveTokens).toHaveBeenCalledWith(false, true);
			expect(drawBars).toHaveBeenCalledOnce();
			expect(ui.actors.render).toHaveBeenCalledWith();
		});

		it.each([
			'https://app.arcana.com/characters/shared/user-1/char-1',
			'https://app.arcana.com/embedded/characters/user-1/char-1',
			'http://localhost:5173/characters/shared/user-1/char-1',
			'http://localhost:5173/embedded/characters/user-1/char-1',
		])(
			'FEAT foundry-v14-health-sync — stored character sheet URL %s is classified as a character sheet',
			async (sheetUrl) => {
				const mockActor = createMockActor({
					sheetUrl,
					health: { value: 3, max: 8 },
				});

				vi.mocked(game.actors.get).mockReturnValue(mockActor);
				vi.stubGlobal('foundry', {
					utils: {
						getProperty: vi.fn((obj: any, path: string) => {
							if (path === 'system.health.value') return obj.system?.health?.value;
							if (path === 'system.health.max') return obj.system?.health?.max;
							return undefined;
						}),
					},
				});

				await actorUpdater.handleUpdateActor({
					type: MESSAGE_TYPES.UPDATE_ACTOR,
					actorId: 'actor-123',
					payload: { hp: { value: 5, max: 9 } },
				});

				expect(mockActor.update).toHaveBeenCalledWith(
					expect.objectContaining({
						'system.health.value': 5,
						'system.health.max': 9,
					}),
					{ render: false },
				);
			},
		);

		it('FEAT foundry-v14-health-sync — zero current health synchronizes and redraws token bars', async () => {
			const drawBars = vi.fn();
			const mockToken = { object: { drawBars } };
			const mockActor = createMockActor({
				sheetUrl: 'https://app.arcana.com/embedded/characters/char1',
				health: { value: 3, max: 10 },
			});
			mockActor.getActiveTokens = vi.fn().mockReturnValue([mockToken]);

			vi.mocked(game.actors.get).mockReturnValue(mockActor);
			vi.stubGlobal('foundry', {
				utils: {
					getProperty: vi.fn((obj: any, path: string) => {
						if (path === 'system.health.value') return obj.system?.health?.value;
						if (path === 'system.health.max') return obj.system?.health?.max;
						return undefined;
					}),
				},
			});

			await actorUpdater.handleUpdateActor({
				type: MESSAGE_TYPES.UPDATE_ACTOR,
				actorId: 'actor-123',
				payload: { hp: { value: 0, max: 10 } },
			});

			expect(mockActor.update).toHaveBeenCalledWith(
				expect.objectContaining({ 'system.health.value': 0 }),
				{ render: false },
			);
			expect(drawBars).toHaveBeenCalledOnce();
		});

		it('should clamp NPC HP value when it exceeds new max', async () => {
			// GIVEN an NPC with HP value 80 and max 100
			const mockActor = createMockActor({
				sheetUrl: 'https://app.arcana.com/embedded/bestiary/npc1',
				health: { value: 80, max: 100 },
			});

			vi.mocked(game.actors.get).mockReturnValue(mockActor);
			vi.stubGlobal('foundry', {
				utils: {
					getProperty: vi.fn((obj: any, path: string) => {
						if (path === 'system.health.value') return obj.system?.health?.value;
						if (path === 'system.health.max') return obj.system?.health?.max;
						return undefined;
					}),
				},
			});

			// WHEN updating HP with max 60 (less than current value 80)
			const updateData = {
				type: MESSAGE_TYPES.UPDATE_ACTOR,
				actorId: 'actor-123',
				payload: { hp: { value: 50, max: 60 } },
			};

			await actorUpdater.handleUpdateActor(updateData);

			// THEN value should be clamped to max
			expect(mockActor.update).toHaveBeenCalledWith(
				expect.objectContaining({
					'system.health.max': 60,
					'system.health.value': 60,
				}),
				{ render: false },
			);
		});

		it('should update both HP value and max for characters', async () => {
			// GIVEN a character with HP value 30 and max 50
			const mockActor = createMockActor({
				sheetUrl: 'https://app.arcana.com/embedded/characters/char1',
				health: { value: 30, max: 50 },
			});

			vi.mocked(game.actors.get).mockReturnValue(mockActor);
			vi.stubGlobal('foundry', {
				utils: {
					getProperty: vi.fn((obj: any, path: string) => {
						if (path === 'system.health.value') return obj.system?.health?.value;
						if (path === 'system.health.max') return obj.system?.health?.max;
						return undefined;
					}),
				},
			});

			// WHEN updating HP with value 40 and max 60
			const updateData = {
				type: MESSAGE_TYPES.UPDATE_ACTOR,
				actorId: 'actor-123',
				payload: { hp: { value: 40, max: 60 } },
			};

			await actorUpdater.handleUpdateActor(updateData);

			// THEN both value and max should be updated
			expect(mockActor.update).toHaveBeenCalledWith(
				expect.objectContaining({
					'system.health.value': 40,
					'system.health.max': 60,
				}),
				{ render: false },
			);
		});

		it('should only update NPC max HP (not value)', async () => {
			// GIVEN an NPC with HP value 50 and max 100
			const mockActor = createMockActor({
				sheetUrl: 'https://app.arcana.com/embedded/bestiary/npc1',
				health: { value: 50, max: 100 },
			});

			vi.mocked(game.actors.get).mockReturnValue(mockActor);
			vi.stubGlobal('foundry', {
				utils: {
					getProperty: vi.fn((obj: any, path: string) => {
						if (path === 'system.health.value') return obj.system?.health?.value;
						if (path === 'system.health.max') return obj.system?.health?.max;
						return undefined;
					}),
				},
			});

			// WHEN updating HP with max 150 (value stays same since 50 < 150)
			const updateData = {
				type: MESSAGE_TYPES.UPDATE_ACTOR,
				actorId: 'actor-123',
				payload: { hp: { value: 80, max: 150 } },
			};

			await actorUpdater.handleUpdateActor(updateData);

			// THEN only max should be updated (value stays at 50)
			const updateCall = vi.mocked(mockActor.update).mock.calls[0][0] as Record<string, any>;
			expect(updateCall).toMatchObject({
				'system.health.max': 150,
			});
			expect(updateCall).not.toHaveProperty('system.health.value');
		});
	});

	describe('image updates', () => {
		it('should update actor image when source differs', async () => {
			// GIVEN an actor with image and source
			const mockActor = createMockActor({
				sheetUrl: 'https://app.arcana.com/embedded/characters/char1',
				imgSource: 'old-source',
			});
			mockActor.img = 'old-image.jpg';

			vi.mocked(game.actors.get).mockReturnValue(mockActor);

			// WHEN updating image with new source
			const updateData = {
				type: MESSAGE_TYPES.UPDATE_ACTOR,
				actorId: 'actor-123',
				payload: { imageUrl: 'new-image.jpg', imageSource: 'new-source' },
			};

			await actorUpdater.handleUpdateActor(updateData);

			// THEN image should be updated
			expect(mockActor.update).toHaveBeenCalledWith(
				expect.objectContaining({
					img: 'new-image.jpg',
					'prototypeToken.texture.src': 'new-image.jpg',
				}),
				{ render: false },
			);
			expect(mockActor.setFlag).toHaveBeenCalledWith('arcana', 'imgSource', 'new-source');
		});

		it('should update actor image when source is unchanged but generated image URL differs', async () => {
			// GIVEN an actor whose original image source is already tracked
			const mockActor = createMockActor({
				sheetUrl: 'https://app.arcana.com/embedded/characters/char1',
				imgSource: 'same-source.jpg',
			});
			mockActor.img = 'old-crop.webp';

			vi.mocked(game.actors.get).mockReturnValue(mockActor);

			// WHEN the web app sends a regenerated crop for the same source
			const updateData = {
				type: MESSAGE_TYPES.UPDATE_ACTOR,
				actorId: 'actor-123',
				payload: { imageUrl: 'offset-crop.webp', imageSource: 'same-source.jpg' },
			};

			await actorUpdater.handleUpdateActor(updateData);

			// THEN the new generated crop should still be applied
			expect(mockActor.update).toHaveBeenCalledWith(
				expect.objectContaining({
					img: 'offset-crop.webp',
					'prototypeToken.texture.src': 'offset-crop.webp',
				}),
				{ render: false },
			);
			expect(mockActor.setFlag).not.toHaveBeenCalledWith('arcana', 'imgSource', 'same-source.jpg');
		});

		it('should skip actor image update when source and generated image URL are unchanged', async () => {
			// GIVEN an actor whose tracked source and generated image are current
			const mockActor = createMockActor({
				sheetUrl: 'https://app.arcana.com/embedded/characters/char1',
				imgSource: 'same-source.jpg',
			});
			mockActor.img = 'current-crop.webp';

			vi.mocked(game.actors.get).mockReturnValue(mockActor);

			// WHEN the same image payload is received again
			const updateData = {
				type: MESSAGE_TYPES.UPDATE_ACTOR,
				actorId: 'actor-123',
				payload: { imageUrl: 'current-crop.webp', imageSource: 'same-source.jpg' },
			};

			await actorUpdater.handleUpdateActor(updateData);

			// THEN no update should be persisted
			expect(mockActor.update).not.toHaveBeenCalled();
			expect(mockActor.setFlag).not.toHaveBeenCalled();
		});

		it('should NOT include anchors when offset flags exist', async () => {
			// GIVEN an actor with offset flags
			const mockActor = createMockActor({
				sheetUrl: 'https://app.arcana.com/embedded/characters/char1',
				imgSource: 'old-source',
				tokenOffsetX: -25,
				tokenOffsetY: 15,
			});
			mockActor.img = 'old-image.jpg';

			vi.mocked(game.actors.get).mockReturnValue(mockActor);

			// WHEN updating image
			const updateData = {
				type: MESSAGE_TYPES.UPDATE_ACTOR,
				actorId: 'actor-123',
				payload: { imageUrl: 'new-image.jpg', imageSource: 'new-source' },
			};

			await actorUpdater.handleUpdateActor(updateData);

			// THEN anchors should NOT be included
			const updateCall = vi.mocked(mockActor.update).mock.calls[0][0] as Record<string, any>;
			expect(updateCall).toHaveProperty('img', 'new-image.jpg');
			expect(updateCall).toHaveProperty('prototypeToken.texture.src', 'new-image.jpg');
			expect(updateCall).not.toHaveProperty('prototypeToken.texture.anchorX');
			expect(updateCall).not.toHaveProperty('prototypeToken.texture.anchorY');
		});

		it('should NOT include anchors when no offset flags exist', async () => {
			// GIVEN an actor without offset flags
			const mockActor = createMockActor({
				sheetUrl: 'https://app.arcana.com/embedded/characters/char1',
				imgSource: 'old-source',
			});
			mockActor.img = 'old-image.jpg';

			vi.mocked(game.actors.get).mockReturnValue(mockActor);

			// WHEN updating image
			const updateData = {
				type: MESSAGE_TYPES.UPDATE_ACTOR,
				actorId: 'actor-123',
				payload: { imageUrl: 'new-image.jpg', imageSource: 'new-source' },
			};

			await actorUpdater.handleUpdateActor(updateData);

			// THEN anchors should NOT be included
			const updateCall = vi.mocked(mockActor.update).mock.calls[0][0] as Record<string, any>;
			expect(updateCall).not.toHaveProperty('prototypeToken.texture.anchorX');
			expect(updateCall).not.toHaveProperty('prototypeToken.texture.anchorY');
		});

		it('should NOT update active tokens with anchor values', async () => {
			// GIVEN an actor with offset flags and active tokens
			const mockToken = { update: vi.fn().mockResolvedValue(undefined) };
			const mockActor = createMockActor({
				sheetUrl: 'https://app.arcana.com/embedded/characters/char1',
				imgSource: 'old-source',
				tokenOffsetX: 50,
				tokenOffsetY: -50,
			});
			mockActor.img = 'old-image.jpg';
			mockActor.getActiveTokens = vi.fn().mockReturnValue([mockToken]);

			vi.mocked(game.actors.get).mockReturnValue(mockActor);

			// WHEN updating image
			const updateData = {
				type: MESSAGE_TYPES.UPDATE_ACTOR,
				actorId: 'actor-123',
				payload: { imageUrl: 'new-image.jpg', imageSource: 'new-source' },
			};

			await actorUpdater.handleUpdateActor(updateData);

			// THEN active token should NOT receive anchor updates
			const tokenUpdateCall = vi.mocked(mockToken.update).mock.calls[0][0] as Record<string, any>;
			expect(tokenUpdateCall).toHaveProperty('texture.src', 'new-image.jpg');
			expect(tokenUpdateCall).not.toHaveProperty('texture.anchorX');
			expect(tokenUpdateCall).not.toHaveProperty('texture.anchorY');
		});
	});

	describe('initiative updates', () => {
		it('should update system initiative', async () => {
			// GIVEN an actor with system initiative
			const mockActor = createMockActor({
				sheetUrl: 'https://app.arcana.com/embedded/characters/char1',
				initiative: 5,
			});

			vi.mocked(game.actors.get).mockReturnValue(mockActor);

			// WHEN updating initiative
			const updateData = {
				type: MESSAGE_TYPES.UPDATE_ACTOR,
				actorId: 'actor-123',
				payload: { initiative: 8 },
			};

			await actorUpdater.handleUpdateActor(updateData);

			// THEN system initiative should be updated
			expect(mockActor.update).toHaveBeenCalledWith(
				expect.objectContaining({
					'system.initiative': 8,
				}),
				{ render: false },
			);
		});
	});

	describe('hasChanges detection', () => {
		it('should not call update when no actual changes', async () => {
			// GIVEN an actor with unchanged values
			const mockActor = createMockActor({
				sheetUrl: 'https://app.arcana.com/embedded/characters/char1',
				name: 'Unchanged Actor',
				health: { value: 50, max: 100 },
			});
			mockActor.img = 'same-image.jpg';

			vi.mocked(game.actors.get).mockReturnValue(mockActor);
			vi.stubGlobal('foundry', {
				utils: {
					getProperty: vi.fn((obj: any, path: string) => {
						if (path === 'system.health.value') return obj.system?.health?.value;
						if (path === 'system.health.max') return obj.system?.health?.max;
						return undefined;
					}),
				},
			});

			// WHEN sending same values
			const updateData = {
				type: MESSAGE_TYPES.UPDATE_ACTOR,
				actorId: 'actor-123',
				payload: {
					name: 'Unchanged Actor',
					imageUrl: 'same-image.jpg',
					hp: { value: 50, max: 100 },
				},
			};

			await actorUpdater.handleUpdateActor(updateData);

			// THEN update should NOT be called
			expect(mockActor.update).not.toHaveBeenCalled();
		});
	});

	describe('updateSheet DOM updates', () => {
		it('FEAT foundry-v14-health-sync — rendered NPC health controls show clamped zero health', async () => {
			const maxInput = document.createElement('input');
			maxInput.name = 'system.health.max';
			const valueInput = document.createElement('input');
			valueInput.name = 'system.health.value';
			const container = document.createElement('div');
			container.appendChild(maxInput);
			container.appendChild(valueInput);

			const mockActor = createMockActor({
				sheetUrl: 'https://app.arcana.com/embedded/bestiary/npc1',
				health: { value: 3, max: 10 },
			});
			mockActor.sheet = { rendered: true, element: container, render: vi.fn() };

			vi.mocked(game.actors.get).mockReturnValue(mockActor);
			vi.stubGlobal('foundry', {
				utils: {
					getProperty: vi.fn((obj: any, path: string) => {
						if (path === 'system.health.value') return obj.system?.health?.value;
						if (path === 'system.health.max') return obj.system?.health?.max;
						return undefined;
					}),
				},
			});

			await actorUpdater.handleUpdateActor({
				type: MESSAGE_TYPES.UPDATE_ACTOR,
				actorId: 'actor-123',
				payload: { hp: { value: 0, max: 0 } },
			});

			expect(maxInput.value).toBe('0');
			expect(valueInput.value).toBe('0');
		});

		it('should update HP inputs via DOM for rendered NPC sheet', async () => {
			// GIVEN an NPC with a rendered sheet and HTMLElement
			const maxInput = document.createElement('input');
			maxInput.name = 'system.health.max';
			const valueInput = document.createElement('input');
			valueInput.name = 'system.health.value';
			const container = document.createElement('div');
			container.appendChild(maxInput);
			container.appendChild(valueInput);

			const mockActor = createMockActor({
				sheetUrl: 'https://app.arcana.com/embedded/bestiary/npc1',
				health: { value: 50, max: 100 },
			});
			mockActor.sheet = {
				rendered: true,
				element: container,
				render: vi.fn(),
			};

			vi.mocked(game.actors.get).mockReturnValue(mockActor);
			vi.stubGlobal('foundry', {
				utils: {
					getProperty: vi.fn((obj: any, path: string) => {
						if (path === 'system.health.value') return obj.system?.health?.value;
						if (path === 'system.health.max') return obj.system?.health?.max;
						return undefined;
					}),
				},
			});

			// WHEN updating HP (NPC only updates max when current value <= new max)
			const updateData = {
				type: MESSAGE_TYPES.UPDATE_ACTOR,
				actorId: 'actor-123',
				payload: { hp: { value: 40, max: 80 } },
			};

			await actorUpdater.handleUpdateActor(updateData);

			// THEN max DOM input should be updated (NPC does not update value unless clamped)
			expect(maxInput.value).toBe('80');
			expect(valueInput.value).toBe('');
			expect(mockActor.render).toHaveBeenCalled();
		});

		it('should not break update flow when updateSheet throws', async () => {
			// GIVEN an NPC with a broken sheet element
			const mockActor = createMockActor({
				sheetUrl: 'https://app.arcana.com/embedded/bestiary/npc1',
				health: { value: 50, max: 100 },
			});
			mockActor.sheet = {
				rendered: true,
				get element() {
					throw new Error('DOM access error');
				},
				render: vi.fn(),
			};

			vi.mocked(game.actors.get).mockReturnValue(mockActor);
			vi.stubGlobal('foundry', {
				utils: {
					getProperty: vi.fn((obj: any, path: string) => {
						if (path === 'system.health.value') return obj.system?.health?.value;
						if (path === 'system.health.max') return obj.system?.health?.max;
						return undefined;
					}),
				},
			});

			// WHEN updating HP
			const updateData = {
				type: MESSAGE_TYPES.UPDATE_ACTOR,
				actorId: 'actor-123',
				payload: { hp: { value: 40, max: 80 } },
			};

			// THEN should not throw and ui.actors.render should still be called
			await expect(actorUpdater.handleUpdateActor(updateData)).resolves.not.toThrow();
			expect(mockActor.update).toHaveBeenCalled();
			expect(ui.actors.render).toHaveBeenCalledWith();
		});
	});
});
