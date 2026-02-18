import fs from 'fs';
import path from 'path';
import { CONFIG } from '../config.js';

export const loadDocFile = (filename: string): string => {
	const fullPath = path.join(CONFIG.DOCS_PATH, filename);
	return fs.readFileSync(fullPath, 'utf-8');
};
