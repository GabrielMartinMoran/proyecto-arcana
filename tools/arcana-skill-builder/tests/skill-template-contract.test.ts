import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { load as yamlLoad } from 'js-yaml';

const TEMPLATE_PATH = path.resolve(import.meta.dirname, '..', 'skill-template.md');
const template = fs.readFileSync(TEMPLATE_PATH, 'utf-8');

const fold = (value: string): string =>
	value
		.toLocaleLowerCase()
		.normalize('NFD')
		.replace(/[\u0300-\u036f]/g, '');

const parseFrontmatter = (): Record<string, unknown> => {
	const match = /^---\r?\n([\s\S]*?)\r?\n---\r?\n/.exec(template);
	assert.ok(match, 'skill-template.md must start with YAML frontmatter');
	const data = yamlLoad(match[1]);
	assert.ok(data !== null && typeof data === 'object' && !Array.isArray(data));
	return data as Record<string, unknown>;
};

describe('skill-template trigger description (T4 req 1)', () => {
	const frontmatter = parseFrontmatter();
	const description = fold(String(frontmatter.description ?? ''));

	test('frontmatter carries the skill name arcana-reference', () => {
		assert.equal(frontmatter.name, 'arcana-reference');
	});

	test('description activates on ARCANA rules, manuals, chapters and mechanics in Spanish and English', () => {
		for (const token of [
			'arcana',
			'reglas',
			'rules',
			'manual',
			'capitulo',
			'chapter',
			'mecanic',
			'mechanic',
		]) {
			assert.ok(
				description.includes(token),
				`description must trigger on "${token}" (actual: ${description})`,
			);
		}
	});

	test('description activates on cards, archetypes, lineages, feats and synergies', () => {
		for (const token of [
			'carta',
			'card',
			'arquetipo',
			'archetype',
			'linaje',
			'lineage',
			'dote',
			'feat',
			'sinergia',
			'synergie',
		]) {
			assert.ok(
				description.includes(token),
				`description must trigger on "${token}" (actual: ${description})`,
			);
		}
	});

	test('description activates on magic items, creatures, NPCs, bestiary and creature design', () => {
		for (const token of [
			'objeto',
			'magic items',
			'criatura',
			'creature',
			'npcs',
			'bestiario',
			'bestiary',
			'diseno de criaturas',
			'creature design',
		]) {
			assert.ok(
				description.includes(token),
				`description must trigger on "${token}" (actual: ${description})`,
			);
		}
	});

	test('description triggers even when the user omits "arcana-reference"', () => {
		assert.match(String(frontmatter.description ?? ''), /incluso si|even when/i);
		assert.match(String(frontmatter.description ?? ''), /arcana-reference/);
	});
});

describe('skill-template function contract (T4 reqs 2-7)', () => {
	test('keeps the build placeholder so deterministic generation still works', () => {
		assert.ok(template.includes('<!-- BUILD:INSERT-GENERATED-CONTENT -->'));
	});

	test('documents the real CLI entrypoint "node dist/index.js search"', () => {
		assert.match(template, /node dist\/index\.js search/);
	});

	test('does not document a nonexistent "npm run build" step for the CLI', () => {
		assert.ok(!template.includes('npm run build'), 'template must not mention npm run build');
	});

	test('uses one real CLI path and never duplicates the path after cd', () => {
		const duplicatedAfterCd =
			/cd scripts\/arcana-content-searcher[^\n]*\n(?:[^\n]*\n){0,2}node scripts\/arcana-content-searcher\//i;
		assert.ok(
			!duplicatedAfterCd.test(template),
			'template must not repeat the full CLI path right after cd',
		);
		assert.match(template, /node dist\/index\.js/);
	});

	test('uses the canonical slug pacto-supremo and not the obsolete one', () => {
		assert.match(template, /pacto-supremo/);
		assert.ok(
			!template.includes('arquetipo-brujo-pacto-siniestro'),
			'obsolete slug must not appear anywhere',
		);
	});

	test('documents the four agent-facing statuses', () => {
		for (const status of ['found', 'ambiguous', 'not_found', 'invalid_query']) {
			assert.ok(template.includes(status), `template must document status "${status}"`);
		}
	});

	test('documents the minimal result fields rank, confidence, kind, name, source and nextAction', () => {
		for (const field of ['rank', 'confidence', 'kind', 'name', 'source', 'nextAction']) {
			assert.ok(template.includes(field), `template must document field "${field}"`);
		}
	});

	test('instructs opening only the returned path#anchor, not full documents', () => {
		assert.match(template, /ruta#ancla|path#anchor|source.*#/i);
		assert.match(template, /no cargues|no lugares|solo.*seccion|solo.*entrada/i);
	});

	test('restricts score/match detail to --explain for debugging', () => {
		assert.ok(template.includes('--explain'));
		assert.match(template, /no incluye.*score|solo.*--explain|solo.*depur/i);
	});

	test('documents the fallback: keep original query, mark insufficient, continue with next source', () => {
		assert.match(template, /consulta original|original query/i);
		assert.match(template, /insuficiente|insufficient/i);
		assert.match(template, /siguiente|next/i);
		assert.match(
			template,
			/no la reescribas|no reescribas|sin reescribir|no improvises|sin improvisar/i,
		);
		assert.match(template, /normativa|normative/i);
	});

	test('documents the no-invention rule', () => {
		assert.match(template, /no inventes|no invente|never invent/i);
	});

	test('documents ambiguity handling with alternatives', () => {
		assert.match(template, /ambig/i);
		assert.match(template, /alternativa|elegir|elija/i);
	});

	test('caps fuzzy confidence at medium (never high)', () => {
		assert.match(template, /fuzzy/i);
		assert.match(template, /media|medium/i);
	});

	test('documents the five content families', () => {
		const folded = fold(template);
		for (const family of [
			'manual del jugador',
			'manual del director',
			'cartas',
			'objetos',
			'bestiario',
		]) {
			assert.ok(folded.includes(family), `template must document family "${family}"`);
		}
	});
});
