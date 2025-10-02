import { loadAgentFile } from './agent-content-loader';

const GM_MANUAL_FILE_PATH = '/docs/gm.md';

export const loadGMManual = async () => {
	return await loadAgentFile(GM_MANUAL_FILE_PATH);
};
