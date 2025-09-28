import type { Creature } from '$lib/types/creature';
import { generateId } from '$lib/utils/id-generator';

export const mapCreature = (data: any): Creature => {
	if (!data.name) throw new Error('Creature name is required');
	return {
		id: generateId(data.name),
		...data,
		attributes: {
			body: data.attributes.body ?? data.attributes.cuerpo ?? 0,
			reflexes: data.attributes.reflexes ?? data.attributes.reflejos ?? 0,
			mind: data.attributes.mind ?? data.attributes.mente ?? 0,
			instinct: data.attributes.instinct ?? data.attributes.instinto ?? 0,
			presence: data.attributes.presencia ?? data.attributes.presencia ?? 0,
		},
		stats: {
			maxHealth: data.stats.maxHealth ?? data.stats.salud ?? 0,
			evasion: data.stats.evasion ?? data.stats.esquiva ?? { value: 0, note: null },
			physicalMitigation: data.stats.physicalMitigation ??
				data.stats.mitigacion ??
				data.stats.mitigacionFisica ?? { value: 0, note: null },
			magicalMitigation: data.stats.magicalMitigation ??
				data.stats.mitigacionMagica ?? { value: 0, note: null },
			speed: data.stats.speed ?? data.stats.velocidad ?? { value: 0, note: null },
		},
	};
};
