import { beforeEach, describe, expect, it, vi } from 'vitest';

describe('FEAT foundry-token-movement-ruler-fallback-styling — Arcana token ruler', () => {
	beforeEach(() => {
		vi.resetModules();
		vi.stubGlobal('foundry', {
			utils: {
				getProperty: (obj: any, path: string) =>
					path === 'system.speed' ? obj.actor?.system?.speed : undefined,
			},
		});
	});

	it.each([0, -1, undefined])(
		'invalid speed %s uses Foundry default segment styling',
		async (speed) => {
			class DefaultTokenRuler {
				token = { actor: { system: { speed } }, id: 'token-1', document: { id: 'token-1' } };
				protected _getSegmentStyle(): { color: number } {
					return { color: 0xabcdef };
				}
			}

			vi.stubGlobal('CONFIG', { Token: { rulerClass: DefaultTokenRuler } });

			const { ArcanaTokenRuler } = await import('./arcana-token-ruler');
			const ruler = new ArcanaTokenRuler() as any;

			expect(ruler._getSegmentStyle({ measurement: { distance: 10, cost: 20 } })).toEqual({
				color: 0xabcdef,
			});
		},
	);
});
