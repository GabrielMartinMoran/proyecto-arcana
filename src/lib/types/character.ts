import { calculateModifierFormula } from '$lib/utils/modifiers-calculator';
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

	protected calculateAttrModifiers(attr: string, baseValue: number) {
		let value = baseValue;
		const modifiers = this.modifiers.filter((x) => x.attribute === attr);
		for (const modifier of modifiers) {
			const formulaResult = calculateModifierFormula(modifier.formula, this);
			if (modifier.type === 'set') return formulaResult;
			if (modifier.type === 'add') value += formulaResult;
		}
		return value;
	}

	get maxLuck() {
		const base = CONFIG.MAX_LUCK;
		return this.calculateAttrModifiers('maxLuck', base);
	}

	get maxHP() {
		const base = CONFIG.BASE_HEALTH + this.attributes.cuerpo * CONFIG.HEALTH_BODY_MULTIPIER;
		return this.calculateAttrModifiers('maxHP', base);
	}

	get speed() {
		const base = CONFIG.BASE_SPEED + this.attributes.reflejos;
		return this.calculateAttrModifiers('speed', base);
	}

	get evasion() {
		const base = CONFIG.BASE_EVASION + this.attributes.reflejos;
		return this.calculateAttrModifiers('evasion', base);
	}

	get mitigation() {
		const base = 0;
		return this.calculateAttrModifiers('mitigation', base);
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
	id: string;
	attribute: 'maxHP' | 'maxLuck' | 'evasion' | 'mitigation' | 'speed';
	type: 'add' | 'set';
	formula: string;
	reason: string;
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
