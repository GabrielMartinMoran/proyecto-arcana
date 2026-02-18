import { slugify } from '../utils/formatting.js';

export interface Chapter {
	index: number;
	title: string;
	slug: string;
	content: string;
	filename: string;
}

export const splitPlayerManual = (raw: string): Chapter[] => {
	const parts = raw.split(/(?=^# \d+\.)/m).filter((p) => /^# \d+\./.test(p.trim()));
	return parts.map((part) => {
		const firstLine = part.split('\n')[0].replace(/^# /, '').trim();
		const match = firstLine.match(/^(\d+)\.\s+(.+)/);
		const num = match ? parseInt(match[1]) : 0;
		const title = match ? match[2] : firstLine;
		const slug = `${String(num).padStart(2, '0')}-${slugify(title)}`;
		return { index: num, title: firstLine, slug, content: part.trim(), filename: `${slug}.md` };
	});
};

export const splitGMManual = (raw: string): Chapter[] => {
	const parts = raw.split(/(?=^# )/m).filter((p) => /^# [^\s]/.test(p.trim()));
	return parts.map((part, i) => {
		const firstLine = part.split('\n')[0].replace(/^# /, '').trim();
		const slug = `${String(i + 1).padStart(2, '0')}-${slugify(firstLine)}`;
		return { index: i + 1, title: firstLine, slug, content: part.trim(), filename: `${slug}.md` };
	});
};
