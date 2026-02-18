import fs from 'fs';
import { dump as yamlDump, type DumpOptions } from 'js-yaml';
import path from 'path';

export const ensureDir = (dirPath: string): void => {
	fs.mkdirSync(dirPath, { recursive: true });
};

export const writeText = (filePath: string, content: string): void => {
	ensureDir(path.dirname(filePath));
	fs.writeFileSync(filePath, content, 'utf-8');
	console.log(`  Written: ${path.relative(process.cwd(), filePath)}`);
};

export const writeMarkdown = (filePath: string, content: string): void => {
	writeText(filePath, content);
};

export const writeYaml = (filePath: string, data: unknown, options: DumpOptions = {}): void => {
	const content = yamlDump(data, { lineWidth: 120, noRefs: true, ...options });
	writeText(filePath, content);
};

export const writeJson = (filePath: string, data: unknown, space = 2): void => {
	const content = `${JSON.stringify(data, null, space)}\n`;
	writeText(filePath, content);
};
