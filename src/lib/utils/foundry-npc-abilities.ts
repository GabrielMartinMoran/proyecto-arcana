import type { Creature, CreatureAction } from '$lib/types/creature';
import type { Uses } from '$lib/types/uses';

export type NpcAbilityUseType = NonNullable<Uses['type']>;
export type NpcAbilitySource = 'actions' | 'reactions' | 'interactions';

export interface NpcAbilityDefinition {
	id: string;
	name: string;
	source: NpcAbilitySource;
	type: NpcAbilityUseType;
	max: number;
	rechargeTarget?: number;
	order: number;
}

const ABILITY_SOURCES: NpcAbilitySource[] = ['actions', 'reactions', 'interactions'];

export function buildNpcAbilityDefinitions(creature: Creature): NpcAbilityDefinition[] {
	const occurrenceByKey = new Map<string, number>();
	const creatureSlug = slugify(creature.id || creature.name);

	return ABILITY_SOURCES.flatMap((source) =>
		creature[source].flatMap((ability, order) => {
			const definition = buildDefinition(creatureSlug, source, ability, order, occurrenceByKey);
			return definition ? [definition] : [];
		}),
	);
}

function buildDefinition(
	creatureSlug: string,
	source: NpcAbilitySource,
	ability: CreatureAction,
	order: number,
	occurrenceByKey: Map<string, number>,
): NpcAbilityDefinition | null {
	const uses = ability.uses;
	if (!uses?.type || !isValidQuantity(uses.qty)) return null;

	const nameSlug = slugify(ability.name);
	const occurrenceKey = `${creatureSlug}:${source}:${nameSlug}`;
	const occurrence = (occurrenceByKey.get(occurrenceKey) ?? 0) + 1;
	occurrenceByKey.set(occurrenceKey, occurrence);

	if (uses.type === 'RELOAD') {
		return {
			id: `${occurrenceKey}:${occurrence}`,
			name: ability.name,
			source,
			type: uses.type,
			max: 1,
			rechargeTarget: uses.qty,
			order,
		};
	}

	return {
		id: `${occurrenceKey}:${occurrence}`,
		name: ability.name,
		source,
		type: uses.type,
		max: uses.qty,
		order,
	};
}

function isValidQuantity(qty: number | null): qty is number {
	return qty !== null && Number.isInteger(qty) && qty > 0;
}

function slugify(value: string): string {
	return value
		.normalize('NFD')
		.replace(/[\u0300-\u036f]/g, '')
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '');
}
