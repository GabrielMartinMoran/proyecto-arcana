import type { ArcanaActor } from '../types/actor';

export type NpcAbilityUseType = 'RELOAD' | 'USES' | 'LONG_REST' | 'DAY';
export type NpcAbilitySource = 'actions' | 'reactions' | 'interactions' | 'traits';

export interface NpcAbilityDefinition {
	id: string;
	name: string;
	source: NpcAbilitySource;
	type: NpcAbilityUseType;
	max: number;
	rechargeTarget?: number;
	order: number;
}

export interface NpcAbilityUsageCounter {
	current: number;
	max: number;
}

export type NpcAbilityUsage = Record<string, NpcAbilityUsageCounter>;

export interface NpcAbilityUsageView extends NpcAbilityDefinition, NpcAbilityUsageCounter {
	isRecharge: boolean;
}

export interface NpcAbilityUsageGroup {
	source: NpcAbilitySource;
	label: string;
	abilities: NpcAbilityUsageView[];
}

export type NpcAbilityUsageOwner =
	| Pick<ArcanaActor, 'getFlag' | 'setFlag'>
	| {
			getFlag(scope: string, key: string): unknown;
			setFlag(scope: string, key: string, value: unknown): Promise<void>;
	  };

const USAGE_FLAG = 'npcAbilityUsage';

const GROUPS: Array<{ source: NpcAbilitySource; label: string }> = [
	{ source: 'actions', label: 'Acciones' },
	{ source: 'reactions', label: 'Reacciones' },
	{ source: 'interactions', label: 'Interacciones' },
	{ source: 'traits', label: 'Rasgos defensivos' },
];

export function resolveNpcAbilityUsageOwner(actor: ArcanaActor): NpcAbilityUsageOwner {
	const tokenDocument = actor.token;
	const isLinkedToken = Boolean(tokenDocument?.actorLink || actor.prototypeToken?.actorLink);

	if (actor.isToken && !isLinkedToken && hasFlagApi(tokenDocument)) {
		return tokenDocument;
	}

	return (actor.baseActor as ArcanaActor | undefined) ?? actor;
}

export function mergeNpcAbilityUsage(
	definitions: NpcAbilityDefinition[],
	existing: NpcAbilityUsage | undefined,
): NpcAbilityUsage {
	return Object.fromEntries(
		definitions.map((definition) => {
			const current = clampNpcAbilityCurrent(
				existing?.[definition.id]?.current ?? definition.max,
				definition.max,
			);
			return [definition.id, { current, max: definition.max }];
		}),
	);
}

export function buildNpcAbilityUsageGroups(
	definitions: NpcAbilityDefinition[] = [],
	usage: NpcAbilityUsage = {},
): NpcAbilityUsageGroup[] {
	const views = definitions
		.map((definition) => {
			const counter = usage[definition.id] ?? { current: definition.max, max: definition.max };
			return {
				...definition,
				current: clampNpcAbilityCurrent(counter.current, definition.max),
				max: definition.max,
				isRecharge: definition.type === 'RELOAD',
			};
		})
		.sort((a, b) => a.order - b.order);

	return GROUPS.map((group) => ({
		...group,
		abilities: views.filter((ability) => ability.source === group.source),
	})).filter((group) => group.abilities.length > 0);
}

export function clampNpcAbilityCurrent(value: number, max: number): number {
	const numericValue = Number.isFinite(value) ? Math.trunc(value) : 0;
	return Math.min(Math.max(numericValue, 0), max);
}

export async function updateNpcAbilityCurrent(
	actor: ArcanaActor,
	abilityId: string,
	current: number,
	definitions: NpcAbilityDefinition[],
): Promise<NpcAbilityUsage> {
	const owner = resolveNpcAbilityUsageOwner(actor);
	const usage = mergeNpcAbilityUsage(definitions, readUsage(owner));
	const definition = definitions.find((ability) => ability.id === abilityId);
	if (!definition) return usage;

	usage[abilityId] = {
		current: clampNpcAbilityCurrent(current, definition.max),
		max: definition.max,
	};
	await owner.setFlag('arcana', USAGE_FLAG, usage);
	return usage;
}

export async function rollNpcAbilityRecharge(
	actor: ArcanaActor,
	abilityId: string,
	definitions: NpcAbilityDefinition[],
): Promise<{ result: number; success: boolean; usage: NpcAbilityUsage }> {
	const definition = definitions.find((ability) => ability.id === abilityId);
	if (!definition || definition.type !== 'RELOAD' || !definition.rechargeTarget) {
		throw new Error(`NPC recharge ability not found: ${abilityId}`);
	}

	const roll = await rollOneD8();
	const result = Number(roll.total ?? 0);
	const success = result >= definition.rechargeTarget;
	const usage = await updateNpcAbilityCurrent(
		actor,
		abilityId,
		success ? definition.max : 0,
		definitions,
	);
	await sendRechargeRollMessage(actor, definition, roll, success);
	return { result, success, usage };
}

export function readUsage(owner: NpcAbilityUsageOwner): NpcAbilityUsage | undefined {
	const value = owner.getFlag('arcana', USAGE_FLAG);
	return isUsageRecord(value) ? value : undefined;
}

interface RechargeRoll {
	total: number | null;
	evaluate(): Promise<unknown>;
	toMessage(message: { speaker: unknown; flavor: string }): Promise<unknown>;
}

async function rollOneD8(): Promise<RechargeRoll> {
	const roll = new Roll('1d8') as RechargeRoll;
	await roll.evaluate();
	return roll;
}

async function sendRechargeRollMessage(
	actor: ArcanaActor,
	definition: NpcAbilityDefinition,
	roll: RechargeRoll,
	success: boolean,
): Promise<void> {
	await roll.toMessage({
		flavor: `${definition.name}: recarga — ${success ? 'éxito' : 'fallo'}`,
		speaker: ChatMessage.getSpeaker({ actor: actor as unknown as Actor }),
	});
}

function hasFlagApi(value: unknown): value is NpcAbilityUsageOwner {
	return Boolean(
		value &&
			typeof (value as NpcAbilityUsageOwner).getFlag === 'function' &&
			typeof (value as NpcAbilityUsageOwner).setFlag === 'function',
	);
}

function isUsageRecord(value: unknown): value is NpcAbilityUsage {
	return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}
