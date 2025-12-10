/**
 * Actor-related Types
 */

export interface HealthData {
	value: number;
	max: number;
}

export interface ActorSystemData {
	health?: HealthData;
}

export interface ArcanaFlags {
	sheetUrl?: string;
	localNotes?: string;
	imgSource?: string;
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
		sight: { enabled: boolean };
		name: string;
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
	element: JQuery;
	render(force: boolean, options?: { forceReload?: boolean }): void;
}

export interface TokenDocumentData {
	actorLink: boolean;
	baseActor: ArcanaActor;
}

export interface SpeakerData {
	token?: string;
	actor?: string;
}

export interface UpdatePayload {
	name?: string;
	imageUrl?: string;
	imageSource?: string;
	hp?: {
		value: number;
		max: number;
	};
}
