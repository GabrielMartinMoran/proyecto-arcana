import { ArcanaCombat } from '../combat/arcana-combat';
import {
	ARCANA_SPECIAL_STATUS_EFFECTS,
	registerArcanaStatusEffects,
	type StatusEffectRegistry,
} from '../constants/status-effects';
import { CharacterData, NPCData } from '../data-models/actor-data-model';
import { ArcanaActor } from '../documents/arcana-actor';
import { ArcanaToken } from '../documents/arcana-token';
import { ArcanaTokenDocument } from '../documents/arcana-token-document';
import { ArcanaTokenRuler } from '../ruler/arcana-token-ruler';
import { ArcanaSheetV2 } from '../sheets/arcana-sheet-v2';
import { ArcanaActorDirectory } from '../sidebar/actor-directory';

export function init(): void {
	console.log('ARCANA SYSTEM | Inicializando...');

	// Register the Arcana Actor document class so token damage consumes temp HP first
	// @ts-expect-error - v14 documentClass assignment differs from v13 types
	CONFIG.Actor.documentClass = ArcanaActor;

	// Register modern TypeDataModels for Actor types
	CONFIG.Actor.dataModels = {
		// @ts-expect-error - v14 TypeDataModel static shape differs from v13 DataModel types
		character: CharacterData,
		// @ts-expect-error - v14 TypeDataModel static shape differs from v13 DataModel types
		npc: NPCData,
	};

	// Configure trackable attributes for tokens/bars
	CONFIG.Actor.trackableAttributes = {
		character: {
			bar: ['health'],
			value: ['initiative'],
		},
		npc: {
			bar: ['health'],
			value: ['initiative'],
		},
	};

	// Register Custom Combat Class
	// @ts-expect-error - ArcanaCombat return types differ from generic Combat<SubType>
	CONFIG.Combat.documentClass = ArcanaCombat;

	(CONFIG.Token as any).rulerClass = ArcanaTokenRuler;

	// Register the Arcana Token classes: the placeable draws the temporary HP
	// overlay on the health bar and the document refreshes it on temp-only changes.
	CONFIG.Token.objectClass = ArcanaToken;
	CONFIG.Token.documentClass = ArcanaTokenDocument;

	// Set default initiative formula (uses system data model)
	CONFIG.Combat.initiative = {
		formula: '1d8x + @system.initiative',
		decimals: 2,
	};

	// Register Arcana status effects by id. v14 CONFIG.statusEffects is a Proxy
	// (array + id map): append to it, never replace it. The cast bridges the
	// v13 beta types (plain array) and the v14 runtime behavior.
	registerArcanaStatusEffects(CONFIG.statusEffects as unknown as StatusEffectRegistry);

	// Integrate Arcana ids with Foundry special status mechanics: `cegado`
	// blinds vision, `concentracion` is exposed for other packages to consume.
	Object.assign(CONFIG.specialStatusEffects, ARCANA_SPECIAL_STATUS_EFFECTS);

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
