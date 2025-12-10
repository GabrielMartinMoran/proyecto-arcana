/**
 * FoundryVTT Type Augmentations
 * The foundry-vtt-types package already declares all global types
 * We just add our custom flag augmentation here
 */

declare global {
	interface FlagConfig {
		Actor: {
			arcana?: {
				sheetUrl?: string;
				localNotes?: string;
				imgSource?: string;
			};
		};
	}
}

// Empty export to make this a module
export {};
