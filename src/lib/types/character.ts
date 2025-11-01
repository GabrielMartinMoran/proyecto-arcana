import { calculateModifierFormula } from '$lib/utils/modifiers-calculator';
import { CONFIG } from '../../config';
import type { Attributes } from './attributes';
import type { PartyReference } from './party-reference';

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
	version: number;
	party: PartyReference;

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
		this.party = props.party ?? {
			partyId: null,
			ownerId: null,
		};
		this.story = props.story;
		this.notes = props.notes;
		this.languages = props.languages;
		this.quickInfo = props.quickInfo;
		this.attacks = props.attacks;
		this.maxActiveCards = props.maxActiveCards;
		this.version = props.version;
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
		const progressFactor = Math.round(this.spentPP / CONFIG.PP_TO_HP_FACTOR);
		const base =
			CONFIG.BASE_HEALTH + this.attributes.body * CONFIG.HEALTH_BODY_MULTIPIER + progressFactor;
		return this.calculateAttrModifiers('maxHP', base);
	}

	get speed() {
		const base = CONFIG.BASE_SPEED + this.attributes.reflexes;
		return this.calculateAttrModifiers('speed', base);
	}

	get evasion() {
		const base = CONFIG.BASE_EVASION + this.attributes.reflexes;
		return this.calculateAttrModifiers('evasion', base);
	}

	get physicalMitigation() {
		const base = 0;
		return this.calculateAttrModifiers('physicalMitigation', base);
	}

	get magicalMitigation() {
		const base = 0;
		return this.calculateAttrModifiers('magicalMitigation', base);
	}

	get currentGold() {
		const current = this.goldHistory
			.filter((x) => x.type === 'add')
			.reduce((acc, x) => acc + x.value, 0);
		const spent = this.spentGold;
		if (spent > 0) return current - spent;
		return current;
	}

	get spentGold() {
		return this.goldHistory
			.filter((x) => x.type === 'subtract')
			.reduce((acc, x) => acc + x.value, 0);
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
		const topCardLevels = this.cards
			.map((card) => card.level)
			.sort((a, b) => b - a)
			.slice(0, CONFIG.TOP_N_CARDS_TO_CALCULATE_PJ_POWER);
		console.log(topCardLevels);
		const averageCardLevel =
			topCardLevels.reduce((acc, level) => acc + level, 0) / topCardLevels.length;
		const ppFactor = this.spentPP / CONFIG.PJ_POWER_SPENT_PP_DIVIDER;
		return Math.round(averageCardLevel + ppFactor);
	}

	get tier() {
		for (const tier of CONFIG.CHARACTER_TIERS) {
			if (this.spentPP >= tier.minPP && this.spentPP <= tier.maxPP) {
				return tier.tier;
			}
		}
		return 0;
	}

	get numActiveCards() {
		return this.cards.filter((card) => card.isActive).length;
	}

	get initiative() {
		return this.attributes.reflexes;
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
	cardType: 'ability' | 'item';
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
	attribute: 'maxHP' | 'maxLuck' | 'evasion' | 'physicalMitigation' | 'magicalMitigation' | 'speed';
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
