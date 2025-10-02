import { loadAgentFile } from './agent-content-loader';

const PLAYER_MANUAL_FILE_PATH = '/docs/player.md';

export const loadPlayerManual = async () => {
	return await loadAgentFile(PLAYER_MANUAL_FILE_PATH);
};
