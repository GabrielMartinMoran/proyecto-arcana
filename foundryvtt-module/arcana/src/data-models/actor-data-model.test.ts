/**
 * Unit tests for actor-data-model.ts
 * Tests CharacterData and NPCData TypeDataModel schemas
 */

import { beforeAll, describe, expect, it, vi } from 'vitest';

describe('CharacterData', () => {
	let CharacterData: typeof import('./actor-data-model').CharacterData;
	let NPCData: typeof import('./actor-data-model').NPCData;

	beforeAll(async () => {
		// Mock foundry globals before importing module
		vi.stubGlobal('foundry', {
			data: {
				fields: {
					SchemaField: class SchemaField {
						fields: Record<string, any>;
						constructor(fields: Record<string, any>) {
							this.fields = fields;
						}
					},
					NumberField: class NumberField {
						options: Record<string, any>;
						constructor(options: Record<string, any> = {}) {
							this.options = options;
						}
					},
				},
			},
			abstract: {
				TypeDataModel: class TypeDataModel {
					static defineSchema(): Record<string, any> {
						return {};
					}
				},
			},
		});

		const module = await import('./actor-data-model');
		CharacterData = module.CharacterData;
		NPCData = module.NPCData;
	});

	describe('schema', () => {
		it('should define health schema field with value and max', () => {
			const schema = CharacterData.defineSchema();

			expect(schema).toHaveProperty('health');
			expect(schema.health.fields).toHaveProperty('value');
			expect(schema.health.fields).toHaveProperty('max');
		});

		it('should define initiative number field with initial 0', () => {
			const schema = CharacterData.defineSchema();

			expect(schema).toHaveProperty('initiative');
			expect(schema.initiative.options.initial).toBe(0);
		});

		it('should set health value initial to 0', () => {
			const schema = CharacterData.defineSchema();

			expect(schema.health.fields.value.options.initial).toBe(0);
		});

		it('should set health max initial to 0', () => {
			const schema = CharacterData.defineSchema();

			expect(schema.health.fields.max.options.initial).toBe(0);
		});

		it('should enforce min 0 on health value', () => {
			const schema = CharacterData.defineSchema();

			expect(schema.health.fields.value.options.min).toBe(0);
		});

		it('should enforce min 0 on health max', () => {
			const schema = CharacterData.defineSchema();

			expect(schema.health.fields.max.options.min).toBe(0);
		});
	});

	describe('NPCData schema', () => {
		it('should define health schema field with value and max', () => {
			const schema = NPCData.defineSchema();

			expect(schema).toHaveProperty('health');
			expect(schema.health.fields).toHaveProperty('value');
			expect(schema.health.fields).toHaveProperty('max');
		});

		it('should define initiative number field with initial 0', () => {
			const schema = NPCData.defineSchema();

			expect(schema).toHaveProperty('initiative');
			expect(schema.initiative.options.initial).toBe(0);
		});
	});
});
