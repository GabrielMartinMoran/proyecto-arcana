import { beforeEach, describe, expect, it, vi } from 'vitest';

describe('FEAT foundry-v14-health-sync — init token resources', () => {
	beforeEach(() => {
		vi.resetModules();
		vi.stubGlobal('foundry', {
			applications: {
				sheets: { ActorSheetV2: class {} },
				api: { HandlebarsApplicationMixin: (Base: any) => Base },
			},
		});
		vi.stubGlobal('CONFIG', {
			Actor: {},
			Combat: {},
			ui: {},
		});
		vi.stubGlobal('Actors', {
			registerSheet: vi.fn(),
		});
		vi.stubGlobal('Combat', class {});
		vi.doMock('../combat/arcana-combat', () => ({ ArcanaCombat: class {} }));
		vi.doMock('../data-models/actor-data-model', () => ({
			CharacterData: class {},
			NPCData: class {},
		}));
		vi.doMock('../sheets/arcana-sheet-v2', () => ({ ArcanaSheetV2: class {} }));
		vi.doMock('../sidebar/actor-directory', () => ({ ArcanaActorDirectory: class {} }));
	});

	it('FEAT foundry-v14-health-sync — token resources expose health for Foundry v14 actor types', async () => {
		const { init } = await import('./init');

		init();

		expect(CONFIG.Actor.trackableAttributes).toMatchObject({
			character: { bar: ['health'] },
			npc: { bar: ['health'] },
		});
	});
});
