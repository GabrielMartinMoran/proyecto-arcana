import { describe, expect, it } from 'vitest';
import { groupTags } from './tag-grouping';

const ABILITY_TAG_GROUPS: Record<string, string[]> = {
	Arquetipos: [
		'Pícaro',
		'Combatiente',
		'Arcanista',
		'Sacerdote',
		'Druida',
		'Bardo',
		'Monje',
		'Mago',
		'Brujo',
		'Hechicero',
		'Coloso',
		'Céfiro',
		'Arquetipo',
	],
	Linajes: [
		'Linaje',
		'Humano',
		'Elfo',
		'Enano',
		'Gnomo',
		'Mediano',
		'Tiefling',
		'Goliath',
		'Dracónido',
	],
	Mecánicas: ['Reacción', 'Conjuro', 'Ritual', 'Concentración', 'Curación'],
	Otros: ['Dote', 'Sinergia'],
};

describe('groupTags', () => {
	it('orders groups alphabetically by group name', () => {
		const tags = ['Bardo', 'Arcanista', 'Humano', 'Curación', 'Pícaro'];
		const result = groupTags(tags, ABILITY_TAG_GROUPS);
		const groupNames = result.map((g) => g.group);
		expect(groupNames).toEqual(['Arquetipos', 'Linajes', 'Mecánicas']);
	});

	it('orders tags alphabetically by label within each group', () => {
		const tags = ['Bardo', 'Arcanista', 'Pícaro'];
		const result = groupTags(tags, ABILITY_TAG_GROUPS);
		const arquetipos = result.find((g) => g.group === 'Arquetipos')!;
		const labels = arquetipos.options.map((o) => o.label);
		expect(labels).toEqual(['Arcanista', 'Bardo', 'Pícaro']);
	});

	it('places unmapped tags in an Otros group', () => {
		const tags = ['Pícaro', 'Sinergia', 'NuevoTag'];
		const result = groupTags(tags, ABILITY_TAG_GROUPS);
		const otros = result.find((g) => g.group === 'Otros')!;
		expect(otros).toBeDefined();
		expect(otros.options.map((o) => o.label)).toEqual(['NuevoTag', 'Sinergia']);
	});

	it('does not create Otros group when all tags are mapped', () => {
		const tags = ['Arcanista', 'Curación'];
		const result = groupTags(tags, ABILITY_TAG_GROUPS);
		expect(result.find((g) => g.group === 'Otros')).toBeUndefined();
		expect(result.find((g) => g.group === 'Arquetipos')!.options.map((o) => o.label)).toEqual([
			'Arcanista',
		]);
		expect(result.find((g) => g.group === 'Mecánicas')!.options.map((o) => o.label)).toEqual([
			'Curación',
		]);
	});

	it('matches tags case-insensitively against group definitions and emits canonical values', () => {
		const tags = ['arcanista', 'HUMANO', 'CURACION'];
		const result = groupTags(tags, ABILITY_TAG_GROUPS);
		expect(result.find((g) => g.group === 'Arquetipos')!.options.map((o) => o.value)).toContain(
			'arcanista',
		);
		expect(result.find((g) => g.group === 'Linajes')!.options.map((o) => o.value)).toContain(
			'humano',
		);
		expect(result.find((g) => g.group === 'Mecánicas')!.options.map((o) => o.value)).toContain(
			'curacion',
		);
	});

	it('returns an empty array when tags list is empty', () => {
		const result = groupTags([], ABILITY_TAG_GROUPS);
		expect(result).toEqual([]);
	});

	it('uses canonical lowercase tag values and capitalized labels', () => {
		const tags = ['ARCANISTA'];
		const result = groupTags(tags, ABILITY_TAG_GROUPS);
		const option = result.find((g) => g.group === 'Arquetipos')!.options[0];
		expect(option.value).toBe('arcanista');
		expect(option.label).toBe('Arcanista');
	});

	it('uses removeDiacritics for alphabetical ordering of labels', () => {
		const tags = ['Céfiro', 'Coloso', 'Arcanista'];
		const result = groupTags(tags, ABILITY_TAG_GROUPS);
		const arquetipos = result.find((g) => g.group === 'Arquetipos')!;
		const labels = arquetipos.options.map((o) => o.label);
		expect(labels).toEqual(['Arcanista', 'Céfiro', 'Coloso']);
	});
});
