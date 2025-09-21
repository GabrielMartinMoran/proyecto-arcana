import { CONFIG } from '../../config';
import type { Attributes } from './attributes';

export class Character {
	id: string;
	name: string;
	attributes: Attributes;
	cards: CharacterCards;
	ppHistory: Log[];
	goldHistory: Log[];
	equipment: Equipment[];
	modifiers: Modifier[];
	currentHP: number;
	tempHP: number;
	currentLuck: number;
	img: string | null;
	bio: string;
	notes: Note[];
	languages: string;
	quickInfo: string;
	attacks: Attack[];

	constructor(props: any) {
		this.id = props.id;
		this.name = props.name;
		this.attributes = props.attributes;
		this.cards = props.cards;
		this.ppHistory = props.ppHistory;
		this.goldHistory = props.goldHistory;
		this.equipment = props.equipment;
		this.modifiers = props.modifiers;
		this.currentHP = props.currentHP;
		this.tempHP = props.tempHP;
		this.currentLuck = props.currentLuck;
		this.img = props.img;
		this.bio = props.bio;
		this.notes = props.notes;
		this.languages = props.languages;
		this.quickInfo = props.quickInfo;
		this.attacks = props.attacks;
	}

	get maxLuck() {
		// TODO: Refactor
		return CONFIG.MAX_LUCK;
	}

	get maxHP() {
		return CONFIG.BASE_HEALTH + this.attributes.cuerpo * CONFIG.HEALTH_BODY_MULTIPIER;
	}

	get speed() {
		return CONFIG.BASE_SPEED + this.attributes.reflejos;
	}

	get evasion() {
		return CONFIG.BASE_EVASION + this.attributes.reflejos;
	}

	get mitigation() {
		return 0;
	}

	get gold() {
		return 0;
	}

	copy() {
		return new Character({ ...this });
	}
}

export interface CharacterCards {
	active: CharacterCard[];
	owned: CharacterCard[];
}

export interface CharacterCard {
	id: string;
	uses: number | null;
}

export interface Log {
	type: 'add' | 'subtract';
	value: number;
	reason: string;
}

export interface Equipment {
	id: string;
	quantity: number;
	name: string;
	notes: string;
}

export interface Modifier {
	field: 'hp' | 'luck' | 'evasion' | 'mitigation';
	mode: 'add' | 'set';
	formula: string;
	label: string;
}

export interface Note {
	id: string;
	title: string;
	content: string;
}

export interface Attack {
	id: string;
	name: string;
	atkFormula: string;
	dmgFormula: string;
	notes: string;
}
