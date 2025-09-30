import { marked } from 'marked';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { PageLoad } from './$types';

export const prerender = true;
export const ssr = true;

export const load: PageLoad = () => {
	const filePath = join(process.cwd(), 'static', 'docs', 'ai-gm-prompt.md');
	const doc = readFileSync(filePath, 'utf-8');

	const prompt = marked.parse(doc);
	return {
		prompt,
	};
};
