import { build as esbuild } from 'esbuild';
import fs from 'fs/promises';
import { load as yamlLoad } from 'js-yaml';
import path from 'path';
import { fileURLToPath } from 'url';
import { buildBestiaryGroups } from './builders/bestiary-builder.js';
import { buildCardGroups, buildItemGroups } from './builders/cards-builder.js';
import { buildManual } from './builders/manual-builder.js';

import { CONFIG } from './config.js';
import { generateSummary } from './llm/summarizer.js';
import { loadDocFile } from './loaders/file-loader.js';
import { mapAbilityCard, mapItemCard } from './mappers/card-mapper.js';
import { mapCreature } from './mappers/creature-mapper.js';
import { groupCreaturesByTier } from './processors/bestiary-processor.js';
import {
	flattenCardGroups,
	groupCardsByTagAndLevel,
	groupItemsByLevel,
} from './processors/cards-processor.js';
import { splitGMManual, splitPlayerManual } from './processors/manual-processor.js';
import { writeResourceManifest } from './scripts/build/resource-manifest.js';
import { isCardsCliCommand, printCliUsage, runCardsCliCommand } from './scripts/cli/index.js';
import { ensureDir, writeJson, writeMarkdown } from './writers/file-writer.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const BUILDER_ROOT = path.resolve(__dirname, '..');
const SKILL_TEMPLATE_PATH = path.join(BUILDER_ROOT, 'skill-template.md');
const TEMPLATE_PLACEHOLDER = '<!-- BUILD:INSERT-GENERATED-CONTENT -->';

interface HubSection {
	heading: string;
	links: { title: string; relPath: string }[];
}

export const buildAll = async (): Promise<void> => {
	console.log('arcana-skill-builder starting...');
	console.log(`Output: ${CONFIG.OUT_PATH}`);
	console.log(
		`AI summaries: ${CONFIG.SKIP_AI ? 'disabled (SKIP_AI=true)' : `enabled (${CONFIG.OPENAI_MODEL})`}`,
	);
	ensureDir(CONFIG.OUT_PATH);

	// Prepare all data synchronously before firing parallel requests
	const playerChapters = splitPlayerManual(loadDocFile(CONFIG.PLAYER_MANUAL_FILE));
	const gmChapters = splitGMManual(loadDocFile(CONFIG.GM_MANUAL_FILE));
	const abilityCards = ((yamlLoad(loadDocFile(CONFIG.CARDS_FILE)) as any).cards ?? []).map(
		mapAbilityCard,
	);
	const magicalItems = ((yamlLoad(loadDocFile(CONFIG.MAGICAL_ITEMS_FILE)) as any).items ?? []).map(
		mapItemCard,
	);
	const creatures = ((yamlLoad(loadDocFile(CONFIG.BESTIARY_FILE)) as any).creatures ?? []).map(
		mapCreature,
	);

	console.log('\nBuilding all sections in parallel...');

	const resourcesPath = path.join(CONFIG.OUT_PATH, CONFIG.RESOURCES_DIR);

	const [playerLinks, gmLinks, cardLinks, itemLinks, bestiaryLinks] = await Promise.all([
		buildManual(playerChapters, path.join(resourcesPath, CONFIG.PLAYER_DIR), 'Manual del Jugador'),
		buildManual(gmChapters, path.join(resourcesPath, CONFIG.GM_DIR), 'Manual del Director'),
		buildCardGroups(
			flattenCardGroups(groupCardsByTagAndLevel(abilityCards)),
			path.join(resourcesPath, CONFIG.CARDS_DIR),
		),
		buildItemGroups(groupItemsByLevel(magicalItems), path.join(resourcesPath, CONFIG.ITEMS_DIR)),
		buildBestiaryGroups(
			groupCreaturesByTier(creatures),
			path.join(resourcesPath, CONFIG.BESTIARY_DIR),
		),
	]);

	const sections: HubSection[] = [
		{ heading: 'Manual del Jugador', links: playerLinks },
		{ heading: 'Manual del Director', links: gmLinks },
		{ heading: 'Cartas de Habilidades', links: cardLinks },
		{ heading: 'Objetos Mágicos', links: itemLinks },
		{ heading: 'Bestiario', links: bestiaryLinks },
	];

	console.log('\nCopying dataset YAMLs...');
	await copyDatasetFiles();

	console.log('\nAssembling SKILL.md from template...');
	await buildSkillDocumentation(sections);

	console.log('\nCopying arcana-content-searcher CLI...');
	await copyCliTool();

	console.log('\nGenerating resource manifest...');
	await writeResourceManifest(
		resourcesPath,
		path.join(CONFIG.OUT_PATH, 'resources-manifest.json'),
		{
			relativeTo: CONFIG.OUT_PATH,
			includeDirectories: true,
		},
	);

	console.log('\nDone. Output at:', CONFIG.OUT_PATH);
};

const copyDatasetFiles = async (): Promise<void> => {
	const datasetDir = path.join(CONFIG.OUT_PATH, CONFIG.RESOURCES_DIR, 'datasets');
	ensureDir(datasetDir);

	const datasetFiles = [CONFIG.CARDS_FILE, CONFIG.MAGICAL_ITEMS_FILE, CONFIG.BESTIARY_FILE];

	for (const fileName of datasetFiles) {
		const content = loadDocFile(fileName);
		await fs.writeFile(path.join(datasetDir, fileName), content, 'utf-8');
	}
};

const buildSkillDocumentation = async (sections: HubSection[]): Promise<void> => {
	const allTitles = sections
		.flatMap((section) => section.links.map((link) => link.title))
		.join('\n');
	const summary = await generateSummary(
		'ARCANA — Referencia del Sistema',
		allTitles,
		'Documento hub que enlaza toda la documentación del sistema de rol ARCANA para consulta por un LLM',
	);

	const referencesIndexData = {
		title: 'ARCANA — Referencia del Sistema',
		intro: summary ?? null,
		sections: sections.map((section) => ({
			heading: section.heading,
			links: section.links.map((link) => ({
				title: link.title,
				path: link.relPath,
			})),
		})),
	};

	writeJson(path.join(CONFIG.OUT_PATH, 'references-index.json'), referencesIndexData);

	const markdown = formatSectionsMarkdown(summary, sections);
	await injectSkillTemplate(markdown);
};

const formatSectionsMarkdown = (summary: string | null, sections: HubSection[]): string => {
	const lines: string[] = [];

	if (summary) {
		lines.push(`> ${summary}`, '');
	}

	for (const section of sections) {
		lines.push(`## ${section.heading}`, '');
		for (const link of section.links) {
			lines.push(`- [${link.title}](${link.relPath})`);
		}
		lines.push('');
	}

	while (lines.length > 0 && lines[lines.length - 1] === '') {
		lines.pop();
	}

	return lines.join('\n');
};

const injectSkillTemplate = async (content: string): Promise<void> => {
	const template = await fs.readFile(SKILL_TEMPLATE_PATH, 'utf-8');

	if (!template.includes(TEMPLATE_PLACEHOLDER)) {
		throw new Error(`Placeholder ${TEMPLATE_PLACEHOLDER} not found in skill-template.md`);
	}

	const normalizedContent = content.trimEnd();
	const replacement = normalizedContent.length > 0 ? `${normalizedContent}\n` : '';

	const finalSkill = template.replace(TEMPLATE_PLACEHOLDER, replacement);
	writeMarkdown(path.join(CONFIG.OUT_PATH, 'SKILL.md'), finalSkill);
};

const copyCliTool = async (): Promise<void> => {
	const entrypoint = path.join(BUILDER_ROOT, 'src', 'scripts', 'cli', 'entrypoint.ts');
	const destinationDir = path.join(CONFIG.OUT_PATH, CONFIG.SCRIPTS_DIR, 'arcana-content-searcher');
	const distDir = path.join(destinationDir, 'dist');

	await fs.mkdir(distDir, { recursive: true });

	await esbuild({
		entryPoints: [entrypoint],
		bundle: true,
		platform: 'node',
		target: 'node18',
		format: 'esm',
		outfile: path.join(distDir, 'index.js'),
		external: ['js-yaml', 'js-sha1'],
	});

	const packageJson = JSON.stringify(
		{
			name: 'arcana-content-searcher',
			version: '1.0.0',
			private: true,
			type: 'module',
			dependencies: {
				'js-sha1': '^0.7.0',
				'js-yaml': '^4.1.0',
			},
		},
		null,
		2,
	);
	await fs.writeFile(path.join(destinationDir, 'package.json'), `${packageJson}\n`, 'utf-8');

	const relativeDestination = path.relative(CONFIG.OUT_PATH, destinationDir) || '.';
	console.log(`  CLI bundled to ${relativeDestination}/dist/index.js`);
};

const printUsage = (): void => {
	console.log('Usage: arcana-skill-builder <command>');
	console.log('');
	console.log('Commands:');
	console.log('  build                        Build the ARCANA skill documentation bundle');
	console.log(
		'  list [--type <kind> ...]     List habilidad or magical item cards using optional filters',
	);
	console.log('  detail <id|name>             Show the details of a specific card');
	console.log('  help                         Show this help message');
	console.log('');
	printCliUsage();
};

const runCli = async (): Promise<void> => {
	const [command = 'build', ...rest] = process.argv.slice(2);

	if (isCardsCliCommand(command)) {
		await runCardsCliCommand(command, rest);
		return;
	}

	switch (command) {
		case 'build': {
			if (rest.length > 0) {
				console.error(`Unexpected arguments for "build": ${rest.join(' ')}`);
				printUsage();
				process.exit(1);
			}
			await buildAll();
			break;
		}
		case 'help':
		case '--help':
		case '-h': {
			printUsage();
			break;
		}
		default: {
			console.error(`Unknown command "${command}".`);
			printUsage();
			process.exit(1);
		}
	}
};

const thisFile = fileURLToPath(import.meta.url);
const invokedDirectly = process.argv[1] ? path.resolve(process.argv[1]) === thisFile : false;

if (invokedDirectly) {
	runCli().catch((err) => {
		console.error(err);
		process.exit(1);
	});
}
