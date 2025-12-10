import { ArcanaSheet } from '../sheets/arcana-sheet';

export function init(): void {
	console.log('ARCANA SYSTEM | Inicializando...');
	// @ts-ignore - Actors.registerSheet is available at runtime
	Actors.registerSheet('core', ArcanaSheet, {
		label: 'Arcana Web',
		makeDefault: true,
	});
}
