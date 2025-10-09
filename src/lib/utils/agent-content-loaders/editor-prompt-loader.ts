import { loadAgentFile } from './agent-content-loader';

const PROMPT_FILE_PATH = '/docs/ai-editor-prompt.md';

export const loadEditorBasePrompt = async () => {
	return await loadAgentFile(PROMPT_FILE_PATH);
};
