const BASE_EMBEDDED_PATH = 'embedded';
const DEVELOP_URL_PREFIX = 'http://localhost:';

const URL_IDENTIFIERS = {
	CHARACTER: 'characters',
	BESTIARY: 'bestiary',
	NPC: 'npc',
};

const isEmbeddedURLFor = (url, identifier) => {
	return url.includes(`/${BASE_EMBEDDED_PATH}/${identifier}`);
};

export const isCharacter = (actor) => {
	const sheetUrl = actor.getFlag('arcana', 'sheetUrl') || '';
	return isEmbeddedURLFor(sheetUrl, URL_IDENTIFIERS.CHARACTER);
};

export const isCharacterURL = (url) => {
	return isEmbeddedURLFor(url, URL_IDENTIFIERS.CHARACTER);
};

export const isDevelopURL = (url) => {
	return url.startsWith(DEVELOP_URL_PREFIX);
};
