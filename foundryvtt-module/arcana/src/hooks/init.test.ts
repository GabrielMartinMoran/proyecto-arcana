import { beforeEach, describe, expect, it, vi } from 'vitest';

describe('FEAT foundry-v14-health-sync — init token resources', () => {
	let statusEffects: Record<string, unknown>;
	let specialStatusEffects: Record<string, unknown>;

	beforeEach(() => {
		vi.resetModules();
		statusEffects = { dead: { id: 'dead' } };
		specialStatusEffects = {};
		vi.stubGlobal('foundry', {
			applications: {
				sheets: { ActorSheetV2: class {} },
				api: { HandlebarsApplicationMixin: (Base: any) => Base },
			},
		});
		vi.stubGlobal('CONFIG', {
			Actor: {},
			Token: {},
			Combat: {},
			ui: {},
			statusEffects,
			specialStatusEffects,
		});
		vi.stubGlobal('Actors', {
			registerSheet: vi.fn(),
		});
		vi.stubGlobal('Combat', class {});
		vi.stubGlobal('Actor', class {});
		vi.doMock('../combat/arcana-combat', () => ({ ArcanaCombat: class {} }));
		vi.doMock('../data-models/actor-data-model', () => ({
			CharacterData: class {},
			NPCData: class {},
		}));
		vi.doMock('../documents/arcana-actor', () => ({ ArcanaActor: class ArcanaActor {} }));
		vi.doMock('../documents/arcana-token', () => ({ ArcanaToken: class ArcanaToken {} }));
		vi.doMock('../documents/arcana-token-document', () => ({
			ArcanaTokenDocument: class ArcanaTokenDocument {},
		}));
		vi.doMock('../ruler/arcana-token-ruler', () => ({ ArcanaTokenRuler: class {} }));
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

	it('FEAT foundry-token-movement-ruler-speed-colors — registers the Arcana token ruler class', async () => {
		const { init } = await import('./init');
		const { ArcanaTokenRuler } = await import('../ruler/arcana-token-ruler');

		init();

		expect(CONFIG.Token.rulerClass).toBe(ArcanaTokenRuler);
	});

	it('FEAT temp-hp-damage-absorption — registers the Arcana actor document class', async () => {
		const { init } = await import('./init');
		const { ArcanaActor } = await import('../documents/arcana-actor');

		init();

		expect(CONFIG.Actor.documentClass).toBe(ArcanaActor);
	});

	it('FEAT temp-hp-token-bar-visual — registers the Arcana token object and document classes', async () => {
		const { init } = await import('./init');
		const { ArcanaToken } = await import('../documents/arcana-token');
		const { ArcanaTokenDocument } = await import('../documents/arcana-token-document');

		init();

		expect(CONFIG.Token.objectClass).toBe(ArcanaToken);
		expect(CONFIG.Token.documentClass).toBe(ArcanaTokenDocument);
	});

	it('FEAT foundry-status-effects @registry @special — registers the 27 status effects and the special mappings', async () => {
		const { init } = await import('./init');
		const { ARCANA_STATUS_EFFECTS, ARCANA_SPECIAL_STATUS_EFFECTS } =
			await import('../constants/status-effects');

		init();

		expect(statusEffects.dead).toEqual({ id: 'dead' });
		expect(Object.keys(statusEffects)).toHaveLength(1 + ARCANA_STATUS_EFFECTS.length);
		for (const effect of ARCANA_STATUS_EFFECTS) {
			expect(statusEffects[effect.id]).toEqual(effect);
		}
		expect(specialStatusEffects).toEqual(ARCANA_SPECIAL_STATUS_EFFECTS);
	});
});
