import { ArcanaCombat } from '../combat/arcana-combat';
import { CharacterData, NPCData } from '../data-models/actor-data-model';
import { ArcanaSheetV2 } from '../sheets/arcana-sheet-v2';
import { ArcanaActorDirectory } from '../sidebar/actor-directory';

export function init(): void {
	console.log('ARCANA SYSTEM | Inicializando...');

	// Register modern TypeDataModels for Actor types
	CONFIG.Actor.dataModels = {
		// @ts-expect-error - v14 TypeDataModel static shape differs from v13 DataModel types
		character: CharacterData,
		// @ts-expect-error - v14 TypeDataModel static shape differs from v13 DataModel types
		npc: NPCData,
	};

	// Configure trackable attributes for tokens/bars
	CONFIG.Actor.trackableAttributes = {
		arcana: {
			bar: ['health'],
			value: ['initiative'],
		},
	};

	// Register Custom Combat Class
	// @ts-expect-error - ArcanaCombat return types differ from generic Combat<SubType>
	CONFIG.Combat.documentClass = ArcanaCombat;

	// Set default initiative formula (uses system data model)
	CONFIG.Combat.initiative = {
		formula: '1d8x + @system.initiative',
		decimals: 2,
	};

	// Register custom ActorDirectory for auto-refresh sidebar
	// @ts-expect-error - v14 ActorDirectory assignment differs from v13 types
	CONFIG.ui.actors = ArcanaActorDirectory;

	// Register ActorSheetV2 as the default sheet
	Actors.registerSheet('arcana', ArcanaSheetV2, {
		label: 'Arcana Web',
		makeDefault: true,
		types: ['character', 'npc'],
	});
}
