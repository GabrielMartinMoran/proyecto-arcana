/**
 * FoundryVTT Type Augmentations for Arcana System
 * Covers v14 APIs and custom system data not fully typed in v13 beta types.
 */

declare global {
	/**
	 * Tell foundry-vtt-types that the "ready" hook has run so `game`
	 * resolves to `ReadyGame` instead of `never`.
	 */
	interface AssumeHookRan {
		ready: true;
	}

	/**
	 * Augment Actor system data with Arcana-specific fields.
	 */
	interface ActorSystemData {
		health?: {
			value: number;
			max: number;
		};
		initiative?: number;
	}

	/**
	 * Custom flags stored on Actor documents.
	 */
	interface FlagConfig {
		Actor: {
			arcana?: {
				sheetUrl?: string;
				localNotes?: string;
				imgSource?: string;
			};
		};
	}

	/**
	 * Augment ChatMessage create data to allow `flavor`.
	 */
	interface _MessageData {
		flavor?: string;
	}

	/**
	 * v14 APIs not fully covered by v13 types.
	 */
	namespace foundry {
		namespace abstract {
			class TypeDataModel {
				static defineSchema(): Record<string, any>;
			}
		}

		namespace applications {
			namespace sheets {
				class ActorSheetV2 {
					declare actor: Actor;
					static PARTS: Record<string, { template: string }>;
					_prepareContext(options: any): Promise<any>;
					_preRender(context: any, options: any): Promise<void>;
					_onRender(context: any, options: any): void;
				}
			}

			namespace api {
				class ApplicationV2 {}
				function HandlebarsApplicationMixin<T extends new (...args: any[]) => any>(Base: T): T;
			}
		}
	}

	/**
	 * Actors.registerSheet signature (used for V1/V2 sheet registration).
	 */
	const Actors: {
		registerSheet(
			scope: string,
			sheetClass: any,
			options: { label?: string; makeDefault?: boolean; types?: string[] },
		): void;
	};
}

export {};
