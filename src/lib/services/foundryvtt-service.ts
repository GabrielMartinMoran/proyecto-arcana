import { browser } from '$app/environment';
import { page } from '$app/stores';
import type { Character } from '$lib/types/character';
import type { Creature } from '$lib/types/creature';
import type { DiceRoll } from '$lib/types/dice-roll';
import { createCircularToken } from '$lib/utils/token-cutter';
import { derived, get } from 'svelte/store';

// --- 1. TYPES PARA FOUNDRY ---

export interface CharacterState {
	name?: string;
	imageUrl?: string;
	imageSource?: string; // Clave para evitar bucles de recarga infinitos
	hp?: {
		value: number;
		max: number;
	};
	initiative?: number;
}

export interface FoundryUpdateMessage {
	type: 'UPDATE_ACTOR';
	uuid: string; // Identificador principal (Scene.x.Token.y o Actor.z)
	actorId: string; // Fallback
	payload: CharacterState;
}

export interface FoundryPrecalculatedRoll {
	type: 'PRECALCULATED_ROLL';
	formula: string;
	results: number[];
	flavor: string;
}

// --- 2. STORES (Lectura de URL) ---

// Unificamos la lectura de parámetros para ser más eficientes y robustos
export const foundryParams = derived(page, ($page) => {
	const params = $page.url.searchParams;
	return {
		// Buscamos 'uuid' (nuevo estándar) o 'actorId' (viejo estándar)
		uuid: params.get('uuid') || params.get('actorId'),
		// Parámetros de inicialización (por si los necesitas en el UI para setear la barra inicial)
		startHp: params.get('startHp'),
		startMax: params.get('startMax'),
		// Detectamos si estamos dentro de Foundry
		isFoundry: params.get('mode') === 'foundry',
	};
});

// --- 3. HOOK PRINCIPAL ---

export const useFoundryVTTService = () => {
	const _postMessage = (payload: FoundryPrecalculatedRoll | FoundryUpdateMessage) => {
		if (typeof window === 'undefined') {
			console.warn('[Foundry Service] Window is undefined.');
			return;
		}

		if (!window.parent || window.parent === window) {
			console.warn('[Foundry Service] No parent window detected (not in iframe).');
			return;
		}

		try {
			console.log('[Foundry Service] Sending message:', payload.type, 'to parent window');
			// Using '*' as targetOrigin is acceptable here since we're sending FROM the iframe
			// The receiver (FoundryVTT module) will validate the origin
			window.parent.postMessage(payload, '*');
		} catch (error) {
			console.error('[Foundry Service] Error posting message:', error);
		}
	};

	/**
	 * Convierte tu array de DiceRoll[] en el formato que Foundry necesita.
	 */
	const broadcastRollResult = (rolls: DiceRoll[], label: string) => {
		// Si no estamos en Foundry, no hacemos nada (evita errores en consola dev)
		if (!get(foundryParams).isFoundry) return;

		const formulaParts: string[] = [];
		const diceResults: number[] = [];

		rolls.forEach((roll) => {
			const { type, value } = roll.expressionMember;
			const result = roll.result;

			if (type === 'dice') {
				formulaParts.push(String(value));
				if (Array.isArray(result)) {
					result.forEach((die) => {
						diceResults.push(die.value);
					});
				}
			} else {
				if (typeof result === 'number') {
					formulaParts.push(String(result));
				} else {
					formulaParts.push(String(value));
				}
			}
		});

		const cleanFormula = formulaParts.join(' + ');

		const payload: FoundryPrecalculatedRoll = {
			type: 'PRECALCULATED_ROLL',
			formula: cleanFormula,
			results: diceResults,
			flavor: label,
		};

		console.log(`[Foundry] Broadcasting dice roll: ${cleanFormula} -> [${diceResults}]`);
		_postMessage(payload);
	};

	const isInsideFoundry = () => {
		if (!browser) return false;
		return window.self !== window.top || get(foundryParams).isFoundry;
	};

	// --- SINCRONIZACIÓN DE PERSONAJE ---
	const syncCharacterState = async (character: Character) => {
		const params = get(foundryParams);

		// 1. Si NO estamos en Foundry, abortamos silenciosamente (Fix para tus errores de consola)
		if (!params.isFoundry) return;

		// 2. Si estamos en Foundry pero no hay UUID, es un error real
		if (!params.uuid) {
			console.warn('[Foundry] Error: Modo Foundry detectado pero falta UUID en la URL.');
			return;
		}

		let imageUrl: string | undefined;
		try {
			// Procesamos el token solo si hay imagen
			if (character.img) {
				imageUrl = await createCircularToken(character.img, 256, 8, '#000000');
			}
		} catch (e) {
			console.error('[Foundry] Error generando token circular:', e);
			imageUrl = character.img; // Fallback a la cuadrada
		}

		const state: CharacterState = {
			name: character.name,
			imageUrl: imageUrl,
			imageSource: character.img, // Importante para el anti-bucle
			hp: {
				value: character.currentHP,
				max: character.maxHP,
			},
			initiative: character.initiative,
		};

		const payload: FoundryUpdateMessage = {
			type: 'UPDATE_ACTOR',
			uuid: params.uuid,
			actorId: params.uuid, // Compatibilidad
			payload: state,
		};

		console.log(`[Foundry] Syncing Character ${params.uuid}:`, state);
		_postMessage(payload);
	};

	// --- SINCRONIZACIÓN DE CRIATURA (BESTIARIO) ---
	const syncCreatureState = async (creature: Creature) => {
		const params = get(foundryParams);

		if (!params.isFoundry) return;

		if (!params.uuid) {
			console.warn('[Foundry] Error: Falta UUID para la criatura.');
			return;
		}

		let imageUrl: string | undefined;
		try {
			if (creature.img) {
				imageUrl = await createCircularToken(creature.img, 256, 8, '#990000'); // Borde rojo para enemigos?
			}
		} catch (e) {
			console.error('[Foundry] Error generando token de criatura:', e);
			imageUrl = creature.img;
		}

		const state: CharacterState = {
			name: creature.name,
			imageUrl: imageUrl,
			imageSource: creature.img,
			hp: {
				// NOTA: Asumimos que si es criatura del bestiario, arranca full vida.
				// Si tu objeto 'creature' tuviera currentHealth, úsalo aquí.
				value: creature.stats.maxHealth,
				max: creature.stats.maxHealth,
			},
		};

		const payload: FoundryUpdateMessage = {
			type: 'UPDATE_ACTOR',
			uuid: params.uuid,
			actorId: params.uuid,
			payload: state,
		};

		// console.log(`[Foundry] Syncing Creature ${params.uuid}:`, state);
		_postMessage(payload);
	};

	return {
		broadcastRollResult,
		isInsideFoundry,
		syncCharacterState,
		syncCreatureState,
		foundryParams, // Exportamos por si necesitas leer 'startHp' en el componente
	};
};
