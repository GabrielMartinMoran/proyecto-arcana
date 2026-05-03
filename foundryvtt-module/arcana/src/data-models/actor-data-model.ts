/**
 * TypeDataModel definitions for Arcana actors.
 * Uses Foundry VTT v14 modern data model API (no template.json).
 */

export class CharacterData extends foundry.abstract.TypeDataModel {
	static override defineSchema(): Record<string, any> {
		const fields = foundry.data.fields;
		return {
			health: new fields.SchemaField({
				value: new fields.NumberField({ initial: 0, min: 0 }),
				max: new fields.NumberField({ initial: 0, min: 0 }),
			}),
			initiative: new fields.NumberField({ initial: 0 }),
		};
	}
}

export class NPCData extends foundry.abstract.TypeDataModel {
	static override defineSchema(): Record<string, any> {
		const fields = foundry.data.fields;
		return {
			health: new fields.SchemaField({
				value: new fields.NumberField({ initial: 0, min: 0 }),
				max: new fields.NumberField({ initial: 0, min: 0 }),
			}),
			initiative: new fields.NumberField({ initial: 0 }),
		};
	}
}
