import type { Attributes } from './attributes';
import type { Uses } from './uses';

export interface Creature {
	id: string;
	name: string;
	lineage: string;
	tier: number;
	attributes: Attributes;
	stats: CreatureStats;
	languages: string[];
	attacks: CreatureAttack[];
	traits: CreatureTrait[];
	actions: CreatureAction[];
	reactions: CreatureAction[];
	interactions: CreatureAction[];
	behavior: string;
	img: string | null;
}

export interface CreatureStats {
	maxHealth: number;
	evasion: CreatureStat;
	physicalMitigation: CreatureStat;
	magicalMitigation: CreatureStat;
	speed: CreatureStat;
}

export interface CreatureStat {
	value: number;
	note: string | null;
}

export interface CreatureAttack {
	name: string;
	bonus: number;
	damage: string;
	note: string | null;
}

export interface CreatureTrait {
	name: string;
	detail: string;
}

export interface CreatureAction {
	name: string;
	detail: string;
	uses: Uses | null;
}
