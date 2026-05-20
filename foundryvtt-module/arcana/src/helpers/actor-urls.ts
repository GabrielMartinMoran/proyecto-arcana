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

const isSharedCharacterURL = (url: string): boolean => {
	return url.includes('/characters/shared/');
};

export const isCharacter = (actor: ArcanaActor): boolean => {
	const sheetUrl = actor.getFlag('arcana', 'sheetUrl') || '';
	return isCharacterURL(sheetUrl);
};

export const isCharacterURL = (url: string): boolean => {
	return isEmbeddedURLFor(url, URL_IDENTIFIERS.CHARACTER) || isSharedCharacterURL(url);
};

export const isDevelopURL = (url: string): boolean => {
	return url.startsWith(DEVELOP_URL_PREFIX);
};
