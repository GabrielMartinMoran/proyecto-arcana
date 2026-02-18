import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const CONFIG = {
	DOCS_PATH: path.resolve(__dirname, '../../../static/docs'),
	OUT_PATH: path.resolve(__dirname, '../out/arcana-system'),

	PLAYER_MANUAL_FILE: 'player.md',
	GM_MANUAL_FILE: 'gm.md',
	CARDS_FILE: 'cards.yml',
	MAGICAL_ITEMS_FILE: 'magical-items.yml',
	BESTIARY_FILE: 'bestiary.yml',

	OPENAI_MODEL: process.env.OPENAI_MODEL ?? 'gpt-4o-mini',
	OPENAI_API_KEY: process.env.OPENAI_API_KEY ?? '',
	SKIP_AI: process.env.SKIP_AI === 'true',

	RESOURCES_DIR: 'references',
	PLAYER_DIR: 'manual-del-jugador',
	GM_DIR: 'manual-del-director',
	CARDS_DIR: 'cartas-de-habilidades',
	ITEMS_DIR: 'objetos-magicos',
	BESTIARY_DIR: 'bestiario',
	SCRIPTS_DIR: 'scripts',
};
