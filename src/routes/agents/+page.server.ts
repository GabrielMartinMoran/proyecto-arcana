import { loadBestiaryAsMD } from '$lib/utils/server-loaders/bestiary-loader';
import {
	loadAbilityCardsAsMD,
	loadMagicalItemsCardsAsMD,
} from '$lib/utils/server-loaders/cards-loader';
import { marked } from 'marked';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { PageServerLoad } from './$types';

export const prerender = true;
export const ssr = true;

const PROMPT_FILE_PATH = join(process.cwd(), 'static', 'docs', 'ai-gm-prompt.md');
const PLAYER_MANUAL_FILE_PATH = join(process.cwd(), 'static', 'docs', 'player.md');
const GM_MANUAL_FILE_PATH = join(process.cwd(), 'static', 'docs', 'gm.md');

const loadDocument = async (path: string) => {
	return await readFile(path, 'utf-8');
};

export const load: PageServerLoad = async () => {
	const [basePrompt, playerManual, gmManual, bestiary, cardsList, magicalItems] = await Promise.all(
		[
			loadDocument(PROMPT_FILE_PATH),
			loadDocument(PLAYER_MANUAL_FILE_PATH),
			loadDocument(GM_MANUAL_FILE_PATH),
			loadBestiaryAsMD(),
			loadAbilityCardsAsMD(),
			loadMagicalItemsCardsAsMD(),
		],
	);

	let doc = basePrompt;

	const replacement_variables = [
		{
			variable: 'player_manual',
			value: playerManual,
		},
		{
			variable: 'game_master_manual',
			value: gmManual,
		},
		{
			variable: 'bestiary',
			value: bestiary,
		},
		{
			variable: 'cards_list',
			value: cardsList,
		},
		{
			variable: 'magical_items',
			value: magicalItems,
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
