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
			expect(mockActor.update).toHaveBeenCalledWith(
				expect.objectContaining({
					'system.health.max': 150,
				}),
				{ render: false },
			);
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
	});

	describe('initiative updates', () => {
		it('should update initiative flag', async () => {
			// GIVEN an actor with initiative flag
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

			// THEN initiative flag should be updated
			expect(mockActor.update).toHaveBeenCalledWith(
				expect.objectContaining({
					'flags.arcana.initiative': 8,
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
});
