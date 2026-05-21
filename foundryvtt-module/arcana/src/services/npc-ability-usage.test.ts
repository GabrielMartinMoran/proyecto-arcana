import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
	buildNpcAbilityUsageGroups,
	clampNpcAbilityCurrent,
	resolveNpcAbilityUsageOwner,
	rollNpcAbilityRecharge,
	updateNpcAbilityCurrent,
} from './npc-ability-usage';

const definitions = [
	{
		id: 'npc:actions:aliento:1',
		name: 'Aliento',
		source: 'actions' as const,
		type: 'RELOAD' as const,
		max: 1,
		rechargeTarget: 6,
		order: 0,
	},
	{
		id: 'npc:reactions:parada:1',
		name: 'Parada',
		source: 'reactions' as const,
		type: 'USES' as const,
		max: 2,
		order: 0,
	},
	{
		id: 'npc:interactions:intimidar:1',
		name: 'Intimidar',
		source: 'interactions' as const,
		type: 'DAY' as const,
		max: 1,
		order: 0,
	},
];

describe('npc ability usage service', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('FEAT npc-ability-controls-grouped-on-bestiary-sheet — abilities are grouped by source category in source order', () => {
		const groups = buildNpcAbilityUsageGroups(definitions, {
			'npc:actions:aliento:1': { current: 1, max: 1 },
			'npc:reactions:parada:1': { current: 2, max: 2 },
			'npc:interactions:intimidar:1': { current: 1, max: 1 },
		});

		expect(groups.map((group) => group.label)).toEqual(['Acciones', 'Reacciones', 'Interacciones']);
		expect(groups[0].abilities.map((ability) => ability.name)).toEqual(['Aliento']);
		expect(groups[1].abilities.map((ability) => ability.name)).toEqual(['Parada']);
		expect(groups[2].abilities.map((ability) => ability.name)).toEqual(['Intimidar']);
	});

	it('FEAT npc-ability-controls-grouped-on-bestiary-sheet — no ability section data appears when no valid uses exist', () => {
		expect(buildNpcAbilityUsageGroups([], {})).toEqual([]);
	});

	it('FEAT manual-npc-ability-use-tracking — user manually spends a reload ability', async () => {
		const actor = createOwnerWithUsage({ 'npc:actions:aliento:1': { current: 1, max: 1 } });

		await updateNpcAbilityCurrent(actor, 'npc:actions:aliento:1', 0, definitions);

		expect(actor.setFlag).toHaveBeenCalledWith('arcana', 'npcAbilityUsage', {
			'npc:actions:aliento:1': { current: 0, max: 1 },
			'npc:reactions:parada:1': { current: 2, max: 2 },
			'npc:interactions:intimidar:1': { current: 1, max: 1 },
		});
	});

	it('FEAT manual-npc-ability-use-tracking — user manually edits a bounded counter', () => {
		expect(clampNpcAbilityCurrent(5, 3)).toBe(3);
		expect(clampNpcAbilityCurrent(-2, 3)).toBe(0);
	});

	it('FEAT npc-recharge-roll-controls — successful recharge restores a reload ability', async () => {
		const actor = createOwnerWithUsage({ 'npc:actions:aliento:1': { current: 0, max: 1 } });
		const roll = stubRechargeRoll(6);
		vi.stubGlobal('ChatMessage', {
			create: vi.fn().mockResolvedValue(undefined),
			getSpeaker: vi.fn().mockReturnValue({ actor: 'actor-1' }),
		});

		await rollNpcAbilityRecharge(actor, 'npc:actions:aliento:1', definitions);

		expect(actor.setFlag).toHaveBeenCalledWith(
			'arcana',
			'npcAbilityUsage',
			expect.objectContaining({ 'npc:actions:aliento:1': { current: 1, max: 1 } }),
		);
		expect(roll.toMessage).toHaveBeenCalledWith(
			expect.objectContaining({
				flavor: expect.stringMatching(/Aliento.*éxito/i),
				speaker: { actor: 'actor-1' },
			}),
		);
		expect(ChatMessage.create).not.toHaveBeenCalled();
	});

	it('FEAT npc-recharge-roll-controls — failed recharge does not restore a reload ability', async () => {
		const actor = createOwnerWithUsage({ 'npc:actions:aliento:1': { current: 0, max: 1 } });
		const roll = stubRechargeRoll(5);
		vi.stubGlobal('ChatMessage', {
			create: vi.fn().mockResolvedValue(undefined),
			getSpeaker: vi.fn().mockReturnValue({ actor: 'actor-1' }),
		});

		await rollNpcAbilityRecharge(actor, 'npc:actions:aliento:1', definitions);

		expect(actor.setFlag).toHaveBeenCalledWith(
			'arcana',
			'npcAbilityUsage',
			expect.objectContaining({ 'npc:actions:aliento:1': { current: 0, max: 1 } }),
		);
		expect(roll.toMessage).toHaveBeenCalledWith(
			expect.objectContaining({
				flavor: expect.stringMatching(/Aliento.*fallo/i),
				speaker: { actor: 'actor-1' },
			}),
		);
		expect(ChatMessage.create).not.toHaveBeenCalled();
	});

	it('FEAT npc-ability-usage-state-ownership — linked unique NPC state is shared on the actor', () => {
		const actor = { isToken: false, prototypeToken: { actorLink: true } };

		expect(resolveNpcAbilityUsageOwner(actor as any)).toBe(actor);
	});

	it('FEAT npc-ability-usage-state-ownership — unlinked token NPC state is token-local', () => {
		const tokenDocument = { getFlag: vi.fn(), setFlag: vi.fn() };
		const actor = { isToken: true, token: tokenDocument, prototypeToken: { actorLink: false } };

		expect(resolveNpcAbilityUsageOwner(actor as any)).toBe(tokenDocument);
	});
});

function createOwnerWithUsage(usage: Record<string, { current: number; max: number }>): any {
	return {
		isToken: false,
		getFlag: vi.fn((scope: string, key: string) => {
			if (scope !== 'arcana') return undefined;
			if (key === 'npcAbilityUsage') return usage;
			return undefined;
		}),
		setFlag: vi.fn().mockResolvedValue(undefined),
	};
}

function stubRechargeRoll(total: number): { toMessage: ReturnType<typeof vi.fn> } {
	const roll = {
		total,
		evaluate: vi.fn(),
		toMessage: vi.fn().mockResolvedValue(undefined),
	};
	roll.evaluate.mockResolvedValue(roll);
	vi.stubGlobal(
		'Roll',
		vi.fn(() => roll),
	);
	return roll;
}
