import path from 'path';
import type { CardGroup, ItemGroup } from '../processors/cards-processor.js';
import { serializeCardsAsYaml } from '../serializers/card-yaml-serializer.js';
import { writeText } from '../writers/file-writer.js';
import type { DocLink } from './manual-builder.js';

export const buildCardGroups = async (
	groups: CardGroup[],
	outputDir: string,
): Promise<DocLink[]> => {
	const dirName = path.basename(outputDir);
	const referencesRoot = path.join(path.dirname(path.dirname(outputDir)), 'references', dirName);
	const linkBaseSegments = ['references', dirName];
	const arquetipoFamilySlugs = new Set(
		groups.filter((group) => group.isArquetipo).map((group) => group.tagSlug),
	);

	return Promise.all(
		groups.map(async (group) => {
			const useArquetipoFamily = arquetipoFamilySlugs.has(group.tagSlug);
			const fileName = group.isArquetipo ? `arquetipo-${group.filename}` : group.filename;
			const targetRoot = useArquetipoFamily
				? path.join(referencesRoot, 'arquetipos', group.tagSlug)
				: path.join(referencesRoot, group.tagSlug);
			const outPath = path.join(targetRoot, fileName);
			const relPathSegments = useArquetipoFamily
				? [...linkBaseSegments, 'arquetipos', group.tagSlug]
				: [...linkBaseSegments, group.tagSlug];
			const relPath = [...relPathSegments, fileName].join('/');
			const titlePrefix = group.isArquetipo ? 'Arquetipo — ' : '';
			const title = `${titlePrefix}${group.tag} — Nivel ${group.level}`;
			const yaml = serializeCardsAsYaml(group.cards, 'cards');
			writeText(outPath, yaml);
			return { title, relPath };
		}),
	);
};

export const buildItemGroups = async (
	groups: ItemGroup[],
	outputDir: string,
): Promise<DocLink[]> => {
	const dirName = path.basename(outputDir);
	const referencesRoot = path.join(path.dirname(path.dirname(outputDir)), 'references', dirName);
	const linkBaseSegments = ['references', dirName];

	return Promise.all(
		groups.map(async (group) => {
			const outPath = path.join(referencesRoot, group.filename);
			const title = `Objetos Mágicos — Nivel ${group.level}`;
			const yaml = serializeCardsAsYaml(group.cards, 'items');
			writeText(outPath, yaml);
			const relPath = [...linkBaseSegments, group.filename].join('/');
			return { title, relPath };
		}),
	);
};
