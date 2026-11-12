export const BOSS_UPGRADE_MIN = 0;
export const BOSS_UPGRADE_MAX = 3;

export interface BossUpgradeTier {
	upgrades: number;
	reactions: number;
	determinations: number;
	paMultiplier: number;
}

export const BOSS_UPGRADE_TIERS: readonly BossUpgradeTier[] = [0, 1, 2, 3].map((upgrades) => ({
	upgrades,
	reactions: upgrades + 1,
	determinations: upgrades,
	paMultiplier: (4 + upgrades) / 4,
}));

export interface BossReactionOption {
	id: string;
	label: string;
	effect: string;
}

export const BOSS_REACTION_COST = 1;

export const BOSS_REACTION_OPTIONS: readonly BossReactionOption[] = [
	{
		id: 'reposicionarse',
		label: 'Reposicionarse',
		effect: 'Al final del turno de otra criatura, se mueve hasta la mitad de su Velocidad.',
	},
	{
		id: 'ataque-rapido',
		label: 'Ataque Rápido',
		effect:
			'Al final del turno de otra criatura, realiza un ataque sin Recarga. Si es su ataque único, inflige la mitad del daño.',
	},
	{
		id: 'guardia-reactiva',
		label: 'Guardia Reactiva',
		effect: 'Cuando le atacan, tras conocer el resultado: +2 a la Esquiva contra ese ataque.',
	},
];

export function normalizeBossUpgrades(value: unknown): number {
	const parsed =
		typeof value === 'number' || (typeof value === 'string' && value.trim() !== '')
			? Number(value)
			: 0;
	if (!Number.isFinite(parsed)) return BOSS_UPGRADE_MIN;
	return Math.min(BOSS_UPGRADE_MAX, Math.max(BOSS_UPGRADE_MIN, Math.trunc(parsed)));
}

export function bossUpgradeTier(value: unknown): BossUpgradeTier {
	return BOSS_UPGRADE_TIERS[normalizeBossUpgrades(value)];
}
