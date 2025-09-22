import type { Attributes } from './attributes';
import type { Uses } from './uses';

export interface Creature {
	id: string;
	name: string;
	na: number;
	attributes: Attributes;
	stats: CreatureStats;
	languages: string[];
	attacks: CreatureAttack[];
	traits: CreatureTrait[];
	actions: CreatureAction[];
	reactions: CreatureAction[];
	behavior: string;
	img: string | null;
}

export interface CreatureStats {
	salud: number;
	esquiva: CreatureStat;
	mitigacion: CreatureStat;
	velocidad: CreatureStat;
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
