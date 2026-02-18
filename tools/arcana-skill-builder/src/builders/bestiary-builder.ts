import path from 'path';
import { generateSummary } from '../llm/summarizer.js';
import type { TierGroup } from '../processors/bestiary-processor.js';
import { serializeStatblockAsMD } from '../serializers/statblock-serializer.js';
import { writeMarkdown } from '../writers/file-writer.js';
import type { DocLink } from './manual-builder.js';

export const buildBestiaryGroups = async (
	groups: TierGroup[],
	outputDir: string,
): Promise<DocLink[]> => {
	const dirName = path.basename(outputDir);
	const parentDirName = path.basename(path.dirname(outputDir));

	return Promise.all(
		groups.map(async (group) => {
			const outPath = path.join(outputDir, group.filename);
			const statblocks = group.creatures.map(serializeStatblockAsMD).join('\n---\n\n');
			const title = `Bestiario — Rango ${group.tier}`;
			const summary = await generateSummary(title, statblocks, `Criaturas de Rango ${group.tier}`);
			const md = [`# ${title}`, '', summary ? `> ${summary}\n` : '', statblocks]
				.filter(Boolean)
				.join('\n');
			writeMarkdown(outPath, md);
			const relSegments =
				parentDirName && parentDirName !== '.'
					? [parentDirName, dirName, group.filename]
					: [dirName, group.filename];
			const relPath = relSegments.join('/');
			return { title, relPath };
		}),
	);
};
