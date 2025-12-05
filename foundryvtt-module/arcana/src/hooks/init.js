import { ArcanaSheet } from '../sheets/arcana-sheet.js';

export function init() {
	console.log('ARCANA SYSTEM | Inicializando...');
	Actors.registerSheet('core', ArcanaSheet, {
		label: 'Arcana Web',
		makeDefault: true,
	});
}
