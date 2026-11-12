import { bossUpgradeTier, normalizeBossUpgrades } from '../constants/boss-upgrades';

export const BOSS_UPGRADES_FLAG = 'bossUpgrades';
export const BOSS_RESOURCES_FLAG = 'bossResources';
export type BossResourceKey = 'reactions' | 'determination';
export interface BossResourceCounter {
	current: number;
	max: number;
}
export interface BossResources {
	reactions: BossResourceCounter;
	determination: BossResourceCounter;
}
export interface BossResourceOwner {
	getFlag(scope: string, key: string): unknown;
	setFlag(scope: string, key: string, value: unknown): Promise<void>;
}

export function readBossUpgrades(actor: BossResourceOwner): number {
	return normalizeBossUpgrades(actor.getFlag('arcana', BOSS_UPGRADES_FLAG));
}

export function resolveBossResourceOwner(actor: any): BossResourceOwner {
	const token = actor.token;
	const linked = Boolean(token?.actorLink || actor.prototypeToken?.actorLink);
	if (actor.isToken && !linked && hasFlagApi(token)) return token;
	return actor.baseActor ?? actor;
}

export function mergeBossResources(stored: unknown, upgrades: unknown): BossResources {
	const record = isRecord(stored) ? stored : {};
	const tier = bossUpgradeTier(upgrades);
	return {
		reactions: mergeCounter(record.reactions, tier.reactions),
		determination: mergeCounter(record.determination, tier.determinations),
	};
}

export function readBossResources(actor: BossResourceOwner): BossResources {
	const owner = resolveBossResourceOwner(actor as any);
	return mergeBossResources(owner.getFlag('arcana', BOSS_RESOURCES_FLAG), readBossUpgrades(actor));
}

export async function updateBossResourceCurrent(
	actor: BossResourceOwner,
	key: BossResourceKey,
	value: number,
): Promise<BossResources> {
	const owner = resolveBossResourceOwner(actor as any);
	const resources = mergeBossResources(
		owner.getFlag('arcana', BOSS_RESOURCES_FLAG),
		readBossUpgrades(actor),
	);
	resources[key].current = clamp(value, resources[key].max);
	await owner.setFlag('arcana', BOSS_RESOURCES_FLAG, resources);
	return resources;
}

export async function resetBossReactions(actor: BossResourceOwner): Promise<BossResources> {
	return resetResource(actor, 'reactions');
}

export async function resetBossDetermination(actor: BossResourceOwner): Promise<BossResources> {
	return resetResource(actor, 'determination');
}

async function resetResource(
	actor: BossResourceOwner,
	key: BossResourceKey,
): Promise<BossResources> {
	const resources = readBossResources(actor);
	return updateBossResourceCurrent(actor, key, resources[key].max);
}

function mergeCounter(value: unknown, max: number): BossResourceCounter {
	const current = isRecord(value) && typeof value.current === 'number' ? value.current : max;
	return { current: clamp(current, max), max };
}

function clamp(value: number, max: number): number {
	return Math.min(max, Math.max(0, Number.isFinite(value) ? Math.trunc(value) : 0));
}

function isRecord(value: unknown): value is Record<string, any> {
	return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

function hasFlagApi(value: unknown): value is BossResourceOwner {
	return Boolean(
		value &&
		typeof (value as BossResourceOwner).getFlag === 'function' &&
		typeof (value as BossResourceOwner).setFlag === 'function',
	);
}
