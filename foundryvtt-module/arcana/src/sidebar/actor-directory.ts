/**
 * Custom ActorDirectory for Arcana system.
 * Extends Foundry VTT v14 ActorDirectory with renderUpdateKeys
 * so the sidebar auto-refreshes when tracked actor properties change.
 */

// @ts-expect-error - v14 ActorDirectory is not typed in v13 types
const ActorDirectoryBase = foundry.applications.sidebar.tabs.ActorDirectory;

export class ArcanaActorDirectory extends ActorDirectoryBase {
	static DEFAULT_OPTIONS = {
		...ActorDirectoryBase.DEFAULT_OPTIONS,
		renderUpdateKeys: [
			'name',
			'img',
			'system.health.value',
			'system.health.max',
			'system.initiative',
		],
	};
}
