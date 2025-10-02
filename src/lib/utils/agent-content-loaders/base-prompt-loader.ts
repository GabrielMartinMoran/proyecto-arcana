import { loadAgentFile } from './agent-content-loader';

const PROMPT_FILE_PATH = '/docs/ai-gm-prompt.md';

export const loadAgentBasePrompt = async () => {
	return await loadAgentFile(PROMPT_FILE_PATH);
};
