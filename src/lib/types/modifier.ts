export interface SubModifier {
	attribute: 'maxHP' | 'maxLuck' | 'evasion' | 'physicalMitigation' | 'magicalMitigation' | 'speed';
	type: 'add' | 'set';
	formula: string;
	reason: string;
}

export interface LibraryModifier {
	id: string;
	category: string;
	name: string;
	description: string;
	subModifiers: SubModifier[];
}
