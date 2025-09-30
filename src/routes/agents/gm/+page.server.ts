import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { PageLoad } from '../$types.js';
import { CONFIG } from '../../../config.js';

export const prerender = true;
export const ssr = true;

export const load: PageLoad = () => {
	const filePath = join(process.cwd(), 'static', CONFIG.GM_MANUAL_PATH);
	const doc = readFileSync(filePath, 'utf-8');
	return {
		doc,
	};
};
