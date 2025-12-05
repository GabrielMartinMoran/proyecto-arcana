import pluginJs from '@eslint/js';
import globals from 'globals';

export default [
	{
		languageOptions: {
			globals: {
				...globals.browser,
				...globals.jquery,

				// --- CORE ---
				game: 'readonly',
				canvas: 'readonly',
				ui: 'readonly',
				foundry: 'readonly',
				Hooks: 'readonly',
				CONFIG: 'readonly',
				CONST: 'readonly',

				// --- DADOS & TIRADAS (Aquí faltaba Die) ---
				Roll: 'readonly',
				Die: 'readonly',
				FateDie: 'readonly',
				Coin: 'readonly',
				RollTerm: 'readonly',
				PoolTerm: 'readonly',
				MathTerm: 'readonly',
				NumericTerm: 'readonly',
				StringTerm: 'readonly',
				ParentheticalTerm: 'readonly',

				// --- DOCUMENTS & DATA ---
				Actor: 'readonly',
				ActorSheet: 'readonly',
				Item: 'readonly',
				ItemSheet: 'readonly',
				TokenDocument: 'readonly',
				Scene: 'readonly',
				JournalEntry: 'readonly',
				Macro: 'readonly',
				User: 'readonly',
				Folder: 'readonly',
				ChatMessage: 'readonly',
				Combat: 'readonly',
				Combatant: 'readonly',
				ActiveEffect: 'readonly',

				// --- CANVAS & PLACEABLES ---
				Token: 'readonly',
				Drawing: 'readonly',
				Wall: 'readonly',
				AmbientLight: 'readonly',
				AmbientSound: 'readonly',
				MeasuredTemplate: 'readonly',
				Tile: 'readonly',
				Note: 'readonly',

				// --- INTERFAZ (UI) ---
				Application: 'readonly',
				FormApplication: 'readonly',
				DocumentSheet: 'readonly',
				Dialog: 'readonly',
				TextEditor: 'readonly',
				FilePicker: 'readonly',
				Notifications: 'readonly',

				// --- COLLECTIONS ---
				Actors: 'readonly',
				Items: 'readonly',
				Scenes: 'readonly',
				Journals: 'readonly',
				Macros: 'readonly',
				Users: 'readonly',

				// --- LIBRERÍAS EXTERNAS INTEGRADAS ---
				PIXI: 'readonly',
				Handlebars: 'readonly',

				// --- UTILS ---
				mergeObject: 'readonly',
				duplicate: 'readonly',
				renderTemplate: 'readonly',
				fromUuid: 'readonly',
				fromUuidSync: 'readonly',
				AudioHelper: 'readonly',
				expandObject: 'readonly',
				flattenObject: 'readonly',
				getProperty: 'readonly',
				setProperty: 'readonly',
				randomID: 'readonly',
			},
		},
	},
	pluginJs.configs.recommended,
	{
		rules: {
			'no-unused-vars': 'warn',
			'no-undef': 'error',
		},
	},
];
