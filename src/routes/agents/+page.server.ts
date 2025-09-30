import { marked } from 'marked';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { PageServerLoad } from './$types';

export const prerender = true;
export const ssr = true;

export const load: PageServerLoad = async ({ request }) => {
	const filePath = join(process.cwd(), 'static', 'docs', 'ai-gm-prompt.md');
	let doc = readFileSync(filePath, 'utf-8');

	const replacement_variables = [
		{
			variable: 'player_manual_url',
			value: `${request.url}/player`,
		},
		{
			variable: 'game_master_url',
			value: `${request.url}/gm`,
		},
		{
			variable: 'bestiary_url',
			value: `${request.url}/bestiary`,
		},
		{
			variable: 'card_list_url',
			value: `${request.url}/cards`,
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
