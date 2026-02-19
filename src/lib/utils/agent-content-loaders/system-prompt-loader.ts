import { loadAgentFile } from './agent-content-loader';

const PROMPT_FILE_PATH = '/docs/system-prompt.md';

export const loadSystemBasePrompt = async () => {
  return await loadAgentFile(PROMPT_FILE_PATH);
};
