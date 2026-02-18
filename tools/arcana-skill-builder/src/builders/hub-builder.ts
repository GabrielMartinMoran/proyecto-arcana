import path from 'path';
import { generateSummary } from '../llm/summarizer.js';
import { writeJson, writeMarkdown } from '../writers/file-writer.js';
import type { DocLink } from './manual-builder.js';

interface LinkSection {
	heading: string;
	links: DocLink[];
}

export const buildHub = async (outputDir: string, sections: LinkSection[]): Promise<void> => {
	const allTitles = sections.flatMap((s) => s.links.map((l) => l.title)).join('\n');
	const intro = await generateSummary(
		'ARCANA — Referencia del Sistema',
		allTitles,
		'Documento hub que enlaza toda la documentación del sistema de rol ARCANA para consulta por un LLM',
	);

	const lines = ['# ARCANA — Referencia del Sistema', ''];

	if (intro) {
		lines.push(`> ${intro}`, '');
	}

	lines.push('---', '');

	for (const section of sections) {
		lines.push(`## ${section.heading}`, '');
		for (const link of section.links) {
			lines.push(`- [${link.title}](${link.relPath})`);
		}
		lines.push('');
	}

	writeMarkdown(path.join(outputDir, 'SKILL.md'), lines.join('\n'));

	const jsonData = {
		title: 'ARCANA — Referencia del Sistema',
		intro: intro ?? null,
		sections: sections.map((section) => ({
			heading: section.heading,
			links: section.links.map((link) => ({
				title: link.title,
				path: link.relPath,
			})),
		})),
	};

	writeJson(path.join(outputDir, 'references-index.json'), jsonData);
};
