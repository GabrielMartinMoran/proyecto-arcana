import { marked } from 'marked';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { CONFIG } from '../../config';
import type { PageServerLoad } from './$types';

export const prerender = true;
export const ssr = true;

export const load: PageServerLoad = async ({ request }) => {
	const filePath = join(process.cwd(), 'static', 'docs', 'ai-gm-prompt.md');
	let doc = readFileSync(filePath, 'utf-8');

	const basePath = request.url.includes('localhost') ? request.url : `${CONFIG.BASE_URL}/agents`;

	const replacement_variables = [
		{
			variable: 'player_manual_url',
			value: `${basePath}/player`,
		},
		{
			variable: 'game_master_url',
			value: `${basePath}/gm`,
		},
		{
			variable: 'bestiary_url',
			value: `${basePath}/bestiary`,
		},
		{
			variable: 'card_list_url',
			value: `${basePath}/cards`,
		},
	];

	for (const x of replacement_variables) {
		doc = doc.replace(`{{${x.variable}}}`, x.value);
	}

	const prompt = await marked.parse(doc);
	return {
		prompt,
	};
};
