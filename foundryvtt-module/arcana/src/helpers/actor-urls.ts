import type { ArcanaActor } from '../types/actor';

const BASE_EMBEDDED_PATH = 'embedded';
const DEVELOP_URL_PREFIX = 'http://localhost:';

const URL_IDENTIFIERS = {
	CHARACTER: 'characters',
	BESTIARY: 'bestiary',
	NPC: 'npc',
} as const;

const isEmbeddedURLFor = (url: string, identifier: string): boolean => {
	return url.includes(`/${BASE_EMBEDDED_PATH}/${identifier}`);
};

export const isCharacter = (actor: ArcanaActor): boolean => {
	const sheetUrl = actor.getFlag('arcana', 'sheetUrl') || '';
	return isEmbeddedURLFor(sheetUrl, URL_IDENTIFIERS.CHARACTER);
};

export const isCharacterURL = (url: string): boolean => {
	return isEmbeddedURLFor(url, URL_IDENTIFIERS.CHARACTER);
};

export const isDevelopURL = (url: string): boolean => {
	return url.startsWith(DEVELOP_URL_PREFIX);
};
