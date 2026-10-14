import { describe, expect, it } from 'vitest';
import type { AttackDraft } from '../types/character';
import type { LibraryItem } from '../types/item';
import { weaponToAttackDrafts } from './weapon-attack-mapping';

const BODY_FORMULA = '1d8e+cuerpo';
const REFLEXES_FORMULA = '1d8e+reflejos';

function draft(name: string, atkFormula: string, dmgFormula: string, notes: string): AttackDraft {
	return { name, atkFormula, dmgFormula, notes };
}

function weaponItem(overrides: Partial<LibraryItem> = {}): LibraryItem {
	return {
		id: 'weapon-test',
		name: 'Arma de prueba',
		category: 'weapons',
		price: 0,
		notes: '',
		...overrides,
	};
}

interface WeaponCatalogCase {
	name: string;
	damage: string;
	type: string;
	properties: string;
	requirement: string;
	expected: AttackDraft[];
}

/**
 * name/damage/type/properties/requirement transcribed verbatim from
 * static/docs/items.json (25 weapons). `expected` holds the 29 drafts of the
 * attack library: Versátil weapons yield one draft per damage die.
 */
const WEAPON_CATALOG: WeaponCatalogCase[] = [
	{
		name: 'Porra',
		damage: '1d4',
		type: 'Contundente',
		properties: '',
		requirement: '',
		expected: [draft('Porra', BODY_FORMULA, '1d4', 'Contundente')],
	},
	{
		name: 'Jabalina',
		damage: '1d4',
		type: 'Perforante',
		properties: 'Arrojadiza (Media)',
		requirement: 'Cuerpo 2',
		expected: [
			draft(
				'Jabalina',
				BODY_FORMULA,
				'1d4',
				'Perforante · Arrojadiza (Media) · Requisito: Cuerpo 2',
			),
		],
	},
	{
		name: 'Daga',
		damage: '1d4',
		type: 'Perforante',
		properties: 'Precisa, Arrojadiza (Cercana)',
		requirement: '',
		expected: [
			draft('Daga', REFLEXES_FORMULA, '1d4', 'Perforante · Precisa, Arrojadiza (Cercana)'),
		],
	},
	{
		name: 'Látigo',
		damage: '1d4',
		type: 'Cortante',
		properties: 'Precisa, Alcance',
		requirement: 'Reflejos 2',
		expected: [
			draft(
				'Látigo',
				REFLEXES_FORMULA,
				'1d4',
				'Cortante · Precisa, Alcance · Requisito: Reflejos 2',
			),
		],
	},
	{
		name: 'Arco corto',
		damage: '1d6',
		type: 'Perforante',
		properties: 'A dos manos, Rango (Media)',
		requirement: 'Reflejos 2',
		expected: [
			draft(
				'Arco corto',
				REFLEXES_FORMULA,
				'1d6',
				'Perforante · A dos manos, Rango (Media) · Requisito: Reflejos 2',
			),
		],
	},
	{
		name: 'Honda',
		damage: '1d4',
		type: 'Contundente',
		properties: 'A dos manos, Rango (Cercana)',
		requirement: 'Reflejos 2',
		expected: [
			draft(
				'Honda',
				REFLEXES_FORMULA,
				'1d4',
				'Contundente · A dos manos, Rango (Cercana) · Requisito: Reflejos 2',
			),
		],
	},
	{
		name: 'Bastón',
		damage: '1d4/1d6',
		type: 'Contundente',
		properties: 'Versátil',
		requirement: '',
		expected: [
			draft('Bastón (1 mano)', BODY_FORMULA, '1d4', 'Contundente · Versátil'),
			draft('Bastón (2 manos)', BODY_FORMULA, '1d6', 'Contundente · Versátil'),
		],
	},
	{
		name: 'Maza',
		damage: '1d6',
		type: 'Contundente',
		properties: '',
		requirement: 'Cuerpo 2',
		expected: [draft('Maza', BODY_FORMULA, '1d6', 'Contundente · Requisito: Cuerpo 2')],
	},
	{
		name: 'Lucero del alba',
		damage: '1d6',
		type: 'Contundente',
		properties: '',
		requirement: 'Cuerpo 2',
		expected: [draft('Lucero del alba', BODY_FORMULA, '1d6', 'Contundente · Requisito: Cuerpo 2')],
	},
	{
		name: 'Lanza',
		damage: '1d6',
		type: 'Perforante',
		properties: 'Arrojadiza (Cercana)',
		requirement: 'Cuerpo 2',
		expected: [
			draft(
				'Lanza',
				BODY_FORMULA,
				'1d6',
				'Perforante · Arrojadiza (Cercana) · Requisito: Cuerpo 2',
			),
		],
	},
	{
		name: 'Hacha de mano',
		damage: '1d6',
		type: 'Cortante',
		properties: 'Arrojadiza (Cercana)',
		requirement: 'Cuerpo 2',
		expected: [
			draft(
				'Hacha de mano',
				BODY_FORMULA,
				'1d6',
				'Cortante · Arrojadiza (Cercana) · Requisito: Cuerpo 2',
			),
		],
	},
	{
		name: 'Espada corta',
		damage: '1d6',
		type: 'Cortante',
		properties: 'Precisa',
		requirement: 'Cuerpo 2 o Reflejos 2',
		expected: [
			draft(
				'Espada corta',
				REFLEXES_FORMULA,
				'1d6',
				'Cortante · Precisa · Requisito: Cuerpo 2 o Reflejos 2',
			),
		],
	},
	{
		name: 'Cimitarra',
		damage: '1d6',
		type: 'Cortante',
		properties: 'Precisa',
		requirement: 'Cuerpo 2 o Reflejos 2',
		expected: [
			draft(
				'Cimitarra',
				REFLEXES_FORMULA,
				'1d6',
				'Cortante · Precisa · Requisito: Cuerpo 2 o Reflejos 2',
			),
		],
	},
	{
		name: 'Ballesta ligera',
		damage: '1d8',
		type: 'Perforante',
		properties: 'A dos manos, Rango (Media), Recarga',
		requirement: 'Reflejos 2',
		expected: [
			draft(
				'Ballesta ligera',
				REFLEXES_FORMULA,
				'1d8',
				'Perforante · A dos manos, Rango (Media), Recarga · Requisito: Reflejos 2',
			),
		],
	},
	{
		name: 'Espada larga',
		damage: '1d8/1d10',
		type: 'Cortante',
		properties: 'Versátil',
		requirement: 'Cuerpo 3',
		expected: [
			draft(
				'Espada larga (1 mano)',
				BODY_FORMULA,
				'1d8',
				'Cortante · Versátil · Requisito: Cuerpo 3',
			),
			draft(
				'Espada larga (2 manos)',
				BODY_FORMULA,
				'1d10',
				'Cortante · Versátil · Requisito: Cuerpo 3',
			),
		],
	},
	{
		name: 'Estoque',
		damage: '1d8',
		type: 'Perforante',
		properties: 'Precisa',
		requirement: 'Reflejos 3',
		expected: [
			draft('Estoque', REFLEXES_FORMULA, '1d8', 'Perforante · Precisa · Requisito: Reflejos 3'),
		],
	},
	{
		name: 'Arco largo',
		damage: '1d8',
		type: 'Perforante',
		properties: 'A dos manos, Rango (Larga)',
		requirement: 'Reflejos 3',
		expected: [
			draft(
				'Arco largo',
				REFLEXES_FORMULA,
				'1d8',
				'Perforante · A dos manos, Rango (Larga) · Requisito: Reflejos 3',
			),
		],
	},
	{
		name: 'Martillo de guerra',
		damage: '1d8/1d10',
		type: 'Contundente',
		properties: 'Versátil',
		requirement: 'Cuerpo 3',
		expected: [
			draft(
				'Martillo de guerra (1 mano)',
				BODY_FORMULA,
				'1d8',
				'Contundente · Versátil · Requisito: Cuerpo 3',
			),
			draft(
				'Martillo de guerra (2 manos)',
				BODY_FORMULA,
				'1d10',
				'Contundente · Versátil · Requisito: Cuerpo 3',
			),
		],
	},
	{
		name: 'Hacha de guerra',
		damage: '1d8/1d10',
		type: 'Cortante',
		properties: 'Versátil',
		requirement: 'Cuerpo 3',
		expected: [
			draft(
				'Hacha de guerra (1 mano)',
				BODY_FORMULA,
				'1d8',
				'Cortante · Versátil · Requisito: Cuerpo 3',
			),
			draft(
				'Hacha de guerra (2 manos)',
				BODY_FORMULA,
				'1d10',
				'Cortante · Versátil · Requisito: Cuerpo 3',
			),
		],
	},
	{
		name: 'Ballesta pesada',
		damage: '1d10',
		type: 'Perforante',
		properties: 'A dos manos, Rango (Larga), Recarga',
		requirement: 'Reflejos 3',
		expected: [
			draft(
				'Ballesta pesada',
				REFLEXES_FORMULA,
				'1d10',
				'Perforante · A dos manos, Rango (Larga), Recarga · Requisito: Reflejos 3',
			),
		],
	},
	{
		name: 'Alabarda',
		damage: '1d10',
		type: 'Cortante',
		properties: 'A dos manos, Alcance',
		requirement: 'Cuerpo 3',
		expected: [
			draft(
				'Alabarda',
				BODY_FORMULA,
				'1d10',
				'Cortante · A dos manos, Alcance · Requisito: Cuerpo 3',
			),
		],
	},
	{
		name: 'Guja',
		damage: '1d10',
		type: 'Cortante',
		properties: 'A dos manos, Alcance',
		requirement: 'Cuerpo 3',
		expected: [
			draft('Guja', BODY_FORMULA, '1d10', 'Cortante · A dos manos, Alcance · Requisito: Cuerpo 3'),
		],
	},
	{
		name: 'Mandoble',
		damage: '1d12',
		type: 'Cortante',
		properties: 'A dos manos',
		requirement: 'Cuerpo 3',
		expected: [
			draft('Mandoble', BODY_FORMULA, '1d12', 'Cortante · A dos manos · Requisito: Cuerpo 3'),
		],
	},
	{
		name: 'Gran hacha',
		damage: '1d12',
		type: 'Cortante',
		properties: 'A dos manos',
		requirement: 'Cuerpo 3',
		expected: [
			draft('Gran hacha', BODY_FORMULA, '1d12', 'Cortante · A dos manos · Requisito: Cuerpo 3'),
		],
	},
	{
		name: 'Mazo pesado',
		damage: '1d12',
		type: 'Contundente',
		properties: 'A dos manos',
		requirement: 'Cuerpo 3',
		expected: [
			draft('Mazo pesado', BODY_FORMULA, '1d12', 'Contundente · A dos manos · Requisito: Cuerpo 3'),
		],
	},
];

function catalogWeapon(row: WeaponCatalogCase): LibraryItem {
	return weaponItem({
		id: `weapon-${row.name}`,
		name: row.name,
		damage: row.damage,
		type: row.type,
		properties: row.properties,
		requirement: row.requirement,
	});
}

describe('weaponToAttackDrafts', () => {
	describe('catalog golden table (static/docs/items.json)', () => {
		it.each(WEAPON_CATALOG)(
			'FEAT-attack-library — maps catalog weapon $name to its expected drafts',
			({ expected, ...weapon }) => {
				expect(weaponToAttackDrafts(weaponItem(weapon))).toEqual(expected);
			},
		);

		it('FEAT-attack-library @weapon-versatile — turns the 25 catalog weapons into 29 drafts without "/" in any dmgFormula', () => {
			const drafts = WEAPON_CATALOG.flatMap((row) => weaponToAttackDrafts(catalogWeapon(row)));

			expect(drafts).toHaveLength(29);
			for (const attackDraft of drafts) {
				expect(attackDraft.dmgFormula, `${attackDraft.name} dmgFormula`).not.toContain('/');
			}
		});
	});

	describe('canonical examples', () => {
		it('FEAT-attack-library @weapon-melee — maps Maza to a body-damage melee draft', () => {
			const maza = weaponItem({
				name: 'Maza',
				damage: '1d6',
				type: 'Contundente',
				requirement: 'Cuerpo 2',
			});

			expect(weaponToAttackDrafts(maza)).toEqual([
				draft('Maza', BODY_FORMULA, '1d6', 'Contundente · Requisito: Cuerpo 2'),
			]);
		});

		it('FEAT-attack-library @weapon-finesse — maps the precise Daga to a reflexes draft', () => {
			const daga = weaponItem({
				name: 'Daga',
				damage: '1d4',
				type: 'Perforante',
				properties: 'Precisa, Arrojadiza (Cercana)',
			});

			expect(weaponToAttackDrafts(daga)).toEqual([
				draft('Daga', REFLEXES_FORMULA, '1d4', 'Perforante · Precisa, Arrojadiza (Cercana)'),
			]);
		});

		it('FEAT-attack-library @weapon-ranged — maps the ranged Arco corto to a reflexes draft', () => {
			const arcoCorto = weaponItem({
				name: 'Arco corto',
				damage: '1d6',
				type: 'Perforante',
				properties: 'A dos manos, Rango (Media)',
				requirement: 'Reflejos 2',
			});

			expect(weaponToAttackDrafts(arcoCorto)).toEqual([
				draft(
					'Arco corto',
					REFLEXES_FORMULA,
					'1d6',
					'Perforante · A dos manos, Rango (Media) · Requisito: Reflejos 2',
				),
			]);
		});

		it('FEAT-attack-library @weapon-versatile — splits Espada larga into one- and two-handed drafts', () => {
			const espadaLarga = weaponItem({
				name: 'Espada larga',
				damage: '1d8/1d10',
				type: 'Cortante',
				properties: 'Versátil',
				requirement: 'Cuerpo 3',
			});

			expect(weaponToAttackDrafts(espadaLarga)).toEqual([
				draft(
					'Espada larga (1 mano)',
					BODY_FORMULA,
					'1d8',
					'Cortante · Versátil · Requisito: Cuerpo 3',
				),
				draft(
					'Espada larga (2 manos)',
					BODY_FORMULA,
					'1d10',
					'Cortante · Versátil · Requisito: Cuerpo 3',
				),
			]);
		});
	});

	describe('negative and edge cases', () => {
		it('returns an empty list for a non-weapon category even when it carries damage', () => {
			const armor: LibraryItem = {
				id: 'armor-cuero',
				name: 'Arm. de Cuero',
				category: 'armors',
				price: 20,
				notes: 'Mitigación Física 1',
				damage: '1d4',
			};

			expect(weaponToAttackDrafts(armor)).toEqual([]);
		});

		it('returns an empty list for a weapon without damage', () => {
			expect(weaponToAttackDrafts(weaponItem({ name: 'Arma sin daño' }))).toEqual([]);
		});

		it.each([
			['PRECISA', REFLEXES_FORMULA],
			['rAnGo (Media)', REFLEXES_FORMULA],
			['Arrojadiza (Media)', BODY_FORMULA],
			['Versátil', BODY_FORMULA],
			['', BODY_FORMULA],
		])(
			'FEAT-attack-library @weapon-melee @weapon-finesse @weapon-ranged — resolves properties %j case-insensitively',
			(properties, expectedAtkFormula) => {
				const weapon = weaponItem({ name: 'Arma', damage: '1d6', properties });

				expect(weaponToAttackDrafts(weapon).at(0)?.atkFormula).toBe(expectedAtkFormula);
			},
		);
	});
});
