import { calculateModifierFormula } from '$lib/utils/modifiers-calculator';
import { CONFIG } from '../../config';
import type { Attributes } from './attributes';

export class Character {
	id: string;
	name: string;
	attributes: Attributes;
	cards: CharacterCard[];
	ppHistory: Log[];
	goldHistory: Log[];
	equipment: Equipment[];
	modifiers: Modifier[];
	currentHP: number;
	tempHP: number;
	currentLuck: number;
	img: string | null;
	story: string;
	notes: Note[];
	languages: string;
	quickInfo: string;
	attacks: Attack[];
	maxActiveCards: number;

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
		this.story = props.story;
		this.notes = props.notes;
		this.languages = props.languages;
		this.quickInfo = props.quickInfo;
		this.attacks = props.attacks;
		this.maxActiveCards = props.maxActiveCards;
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

	get currentPP() {
		const current = this.ppHistory
			.filter((x) => x.type === 'add')
			.reduce((acc, x) => acc + x.value, 0);
		const spent = this.spentPP;
		if (spent > 0) return current - spent;
		return current;
	}

	get spentPP() {
		return this.ppHistory.filter((x) => x.type === 'subtract').reduce((acc, x) => acc + x.value, 0);
	}

	get pjPower() {
		// Get the level of the max card
		const maxCardLevel = this.cards.reduce((acc, card) => Math.max(acc, card.level), 0);
		const ppFactor = this.spentPP / CONFIG.PJ_POWER_SPENT_PP_DIVIDER;
		return Math.round(maxCardLevel + ppFactor);
	}

	get numActiveCards() {
		return this.cards.filter((card) => card.isActive).length;
	}

	get initiative() {
		return this.attributes.reflejos;
	}

	copy() {
		return new Character({ ...this });
	}
}

export interface CharacterCard {
	id: string;
	uses: number | null;
	level: number; // Just for calculations
	isActive: boolean;
}

export interface Log {
	id: string;
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
