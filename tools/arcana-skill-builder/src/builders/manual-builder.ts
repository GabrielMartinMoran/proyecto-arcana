import path from 'path';
import { generateSummary } from '../llm/summarizer.js';
import type { Chapter } from '../processors/manual-processor.js';
import { writeMarkdown } from '../writers/file-writer.js';

export interface DocLink {
	title: string;
	relPath: string;
}

export const buildManual = async (
	chapters: Chapter[],
	outputDir: string,
	manualName: string,
): Promise<DocLink[]> => {
	const dirName = path.basename(outputDir);
	const parentDirName = path.basename(path.dirname(outputDir));

	return Promise.all(
		chapters.map(async (chapter) => {
			const outPath = path.join(outputDir, chapter.filename);
			const summary = await generateSummary(
				chapter.title,
				chapter.content,
				`Sección del ${manualName}`,
			);
			const md = summary ? `> ${summary}\n\n${chapter.content}` : chapter.content;
			writeMarkdown(outPath, md);
			const relSegments =
				parentDirName && parentDirName !== '.'
					? [parentDirName, dirName, chapter.filename]
					: [dirName, chapter.filename];
			const relPath = relSegments.join('/');
			return { title: chapter.title, relPath };
		}),
	);
};
