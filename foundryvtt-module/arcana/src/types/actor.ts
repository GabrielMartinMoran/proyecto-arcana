/**
 * Actor-related Types
 */

export interface HealthData {
	value: number;
	max: number;
	temp?: number;
}

export interface ActorSystemData {
	health?: HealthData;
	initiative?: number;
	nightVision?: string;
	speed?: number;
}

export interface ArcanaFlags {
	sheetUrl?: string;
	localNotes?: string;
	imgSource?: string;
	tokenBorderColor?: string;
	tokenOffsetX?: number;
	tokenOffsetY?: number;
	creatureSize?: string;
}

export interface ActorFlags {
	arcana?: ArcanaFlags;
}

export interface ArcanaActor {
	id: string;
	uuid: string;
	name: string;
	img: string;
	system: ActorSystemData;
	isToken: boolean;
	prototypeToken: {
		actorLink: boolean;
		displayBars: number;
		bar1: { attribute: string | null };
		bar2: { attribute: string | null };
		sight: { enabled: boolean; visionMode?: string; range?: number | null };
		name: string;
		width?: number;
		height?: number;
		texture: { src: string };
	};
	token?: any;
	sheet?: ArcanaActorSheet;
	baseActor?: ArcanaActor;

	getFlag(scope: string, key: string): any;
	setFlag(scope: string, key: string, value: any): Promise<void>;
	update(data: Record<string, any>, options?: { render?: boolean }): Promise<void>;
	getActiveTokens(): any[];
	render(): void;
}

export interface ArcanaActorSheet {
	rendered: boolean;
	element: HTMLElement;
	render(force: boolean, options?: { forceReload?: boolean }): void;
}

export interface TokenDocumentData {
	actorLink: boolean;
	baseActor: ArcanaActor;
}

export interface UpdatePayload {
	name?: string;
	imageUrl?: string;
	imageSource?: string;
	speed?: number;
	hp?: {
		value: number;
		max: number;
		temp?: number;
	};
	initiative?: number;
	npcAbilityDefinitions?: import('../services/npc-ability-usage').NpcAbilityDefinition[];
}
