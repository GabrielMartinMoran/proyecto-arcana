import { sha1 } from 'js-sha1';
import type { Creature } from '../types/creature.js';

const generateId = (seed: string): string => sha1(seed);

export const mapCreature = (data: any): Creature => {
	if (!data.name) throw new Error('Creature name is required');
	try {
		return {
			id: generateId(data.name),
			...data,
			attributes: {
				body: data.attributes.body ?? data.attributes.cuerpo ?? 0,
				reflexes: data.attributes.reflexes ?? data.attributes.reflejos ?? 0,
				mind: data.attributes.mind ?? data.attributes.mente ?? 0,
				instinct: data.attributes.instinct ?? data.attributes.instinto ?? 0,
				presence: data.attributes.presence ?? data.attributes.presencia ?? 0,
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
			interactions: data.interactions ?? [],
			traits: data.traits ?? [],
			actions: data.actions ?? [],
			reactions: data.reactions ?? [],
		};
	} catch (error) {
		console.error(error);
		throw new Error('Error parsing data for creature ' + data.name);
	}
};
