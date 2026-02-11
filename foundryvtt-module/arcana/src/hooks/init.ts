import { ArcanaCombat } from '../combat/arcana-combat';
import { ArcanaSheet } from '../sheets/arcana-sheet';

export function init(): void {
	console.log('ARCANA SYSTEM | Inicializando...');

	// Register Custom Combat Class
	CONFIG.Combat.documentClass = ArcanaCombat;

	// Set default initiative formula (fallback)
	// @ts-ignore - CONFIG.Combat definition might be incomplete in types
	CONFIG.Combat.initiative = {
		formula: '1d8e + @flags.arcana.initiative',
		decimals: 2,
	};

	// @ts-ignore - Actors.registerSheet is available at runtime
	Actors.registerSheet('core', ArcanaSheet, {
		label: 'Arcana Web',
		makeDefault: true,
	});
}
