import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * LLM summarization is strictly opt-in by default. It only runs when the caller
 * explicitly sets ENABLE_AI=true and does not set the SKIP_AI kill-switch to
 * "true". The API key is intentionally NOT part of the shared config object so
 * that it can never be printed or serialized into generated output.
 */
export const isAiExplicitlyEnabled = (env: Record<string, string | undefined>): boolean =>
	env.ENABLE_AI === 'true' && env.SKIP_AI !== 'true';

export const CONFIG = {
	DOCS_PATH: path.resolve(__dirname, '../../../static/docs'),
	OUT_PATH: path.resolve(__dirname, '../out/arcana-reference'),

	PLAYER_MANUAL_FILE: 'player.md',
	GM_MANUAL_FILE: 'gm.md',
	CARDS_FILE: 'cards.yml',
	MAGICAL_ITEMS_FILE: 'magical-items.yml',
	BESTIARY_FILE: 'bestiary.yml',

	AI_ENABLED: isAiExplicitlyEnabled(process.env),

	RESOURCES_DIR: 'references',
	PLAYER_DIR: 'manual-del-jugador',
	GM_DIR: 'manual-del-director',
	CARDS_DIR: 'cartas-de-habilidades',
	ITEMS_DIR: 'objetos-magicos',
	BESTIARY_DIR: 'bestiario',
	SCRIPTS_DIR: 'scripts',
} as const;
