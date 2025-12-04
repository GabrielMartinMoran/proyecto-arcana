// src/lib/foundry.ts
import { browser } from '$app/environment';
import { page } from '$app/stores';
import type { DiceRoll } from '$lib/types/dice-roll';
import { derived } from 'svelte/store';

// NOTA: Asumo que importas tus tipos aquí.
// Si están en otro archivo, ajusta la ruta.
// import type { DiceRoll, DiceResult } from './types';

// --- 1. TYPES PARA FOUNDRY ---
// Esto es lo que Foundry espera recibir (no lo cambies)
export interface FoundryPrecalculatedRoll {
	type: 'PRECALCULATED_ROLL';
	formula: string; // Ej: "1d8 + 2"
	results: number[]; // Ej: [5]
	flavor: string; // Ej: "Ataque de Espada"
}

// --- 2. STORES ---
export const isFoundryMode = derived(page, ($page) => {
	return $page.url.searchParams.get('mode') === 'foundry';
});

// --- 3. HOOK ---
export const useFoundryVTTService = () => {
	const _postMessage = (payload: FoundryPrecalculatedRoll) => {
		if (typeof window !== 'undefined' && window.parent) {
			window.parent.postMessage(payload, '*');
		} else {
			console.warn('[Foundry Service] No se detectó la ventana padre (Foundry).');
		}
	};

	/**
	 * Convierte tu array de DiceRoll[] en el formato que Foundry necesita.
	 */
	const broadcastRollResult = (rolls: DiceRoll[], label: string) => {
		const formulaParts: string[] = [];
		const diceResults: number[] = [];

		rolls.forEach((roll) => {
			const { type, value } = roll.expressionMember;
			const result = roll.result;

			// LÓGICA DE PARSEO
			if (type === 'dice') {
				// CASO DADO (type: 'dice')
				// value suele ser el string del dado, ej: "1d8"
				formulaParts.push(String(value));

				// Extraemos los resultados físicos para el 3D
				// TypeScript: Verificamos que 'result' sea un array de DiceResult
				if (Array.isArray(result)) {
					result.forEach((die) => {
						diceResults.push(die.value);
					});
				}
			} else {
				// CASO CONSTANTE O VARIABLE (type: 'constant' | 'variable')
				// Aquí Foundry necesita el número final sumado.
				// Preferimos usar 'result' si es número, sino el 'value'.
				if (typeof result === 'number') {
					formulaParts.push(String(result));
				} else {
					formulaParts.push(String(value));
				}

				// No agregamos nada a diceResults porque las constantes no ruedan en 3D.
			}
		});

		// Unimos todo para la fórmula final: "1d8 + 2 + 1d4"
		const cleanFormula = formulaParts.join(' + ');

		const payload: FoundryPrecalculatedRoll = {
			type: 'PRECALCULATED_ROLL',
			formula: cleanFormula,
			results: diceResults,
			flavor: label,
		};

		// Debug (opcional)
		console.log(`[Foundry] Enviando: ${cleanFormula} -> [${diceResults}]`);

		_postMessage(payload);
	};

	const isInsideFoundry = () => browser && window.self !== window.top;

	return {
		broadcastRollResult,
		isInsideFoundry,
	};
};
