import type { AttackDraft } from '../types/character';
import type { LibraryItem } from '../types/item';

const BODY_ATTACK_FORMULA = '1d8e+cuerpo';
const REFLEXES_ATTACK_FORMULA = '1d8e+reflejos';
const REFLEXES_WEAPON_PROPERTY_PATTERN = /precisa|rango/i;
const VERSATILE_DAMAGE_SEPARATOR = '/';
const ONE_HANDED_SUFFIX = ' (1 mano)';
const TWO_HANDED_SUFFIX = ' (2 manos)';
const NOTE_SEPARATOR = ' · ';

/**
 * Turns a weapon from the catalog into the editable attack drafts of the
 * attack library. Versátil weapons ("1d4/1d6") yield one draft per damage die
 * so the dice roller never sums both formulas at once.
 */
export function weaponToAttackDrafts(item: LibraryItem): AttackDraft[] {
	if (item.category !== 'weapons' || !item.damage) {
		return [];
	}

	const damageFormulas = splitDamageFormulas(item.damage);

	return damageFormulas.map((dmgFormula, index) =>
		buildAttackDraft(item, dmgFormula, index, damageFormulas.length),
	);
}

function buildAttackDraft(
	item: LibraryItem,
	dmgFormula: string,
	index: number,
	damageFormulaCount: number,
): AttackDraft {
	return {
		name: buildAttackName(item.name, index, damageFormulaCount),
		atkFormula: buildAttackFormula(item.properties),
		dmgFormula,
		notes: buildAttackNotes(item),
	};
}

function splitDamageFormulas(damage: string): string[] {
	return damage.split(VERSATILE_DAMAGE_SEPARATOR).map((formula) => formula.trim());
}

function buildAttackName(weaponName: string, index: number, damageFormulaCount: number): string {
	if (damageFormulaCount === 1) {
		return weaponName;
	}

	return `${weaponName}${index === 0 ? ONE_HANDED_SUFFIX : TWO_HANDED_SUFFIX}`;
}

function buildAttackFormula(properties: string | undefined): string {
	return REFLEXES_WEAPON_PROPERTY_PATTERN.test(properties ?? '')
		? REFLEXES_ATTACK_FORMULA
		: BODY_ATTACK_FORMULA;
}

function buildAttackNotes(item: LibraryItem): string {
	return [item.type, item.properties, buildRequirementNote(item)]
		.filter(Boolean)
		.join(NOTE_SEPARATOR);
}

function buildRequirementNote(item: LibraryItem): string {
	return item.requirement ? `Requisito: ${item.requirement}` : '';
}
