import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import {
	generateResourceManifest,
	writeResourceManifest,
} from '../src/scripts/build/resource-manifest.js';

const makeTempTree = async (): Promise<string> => {
	const root = await fs.mkdtemp(path.join(os.tmpdir(), 'arcana-manifest-'));
	await fs.mkdir(path.join(root, 'a', 'b'), { recursive: true });
	await fs.writeFile(path.join(root, 'a', 'file.md'), '# Fichero\n', 'utf-8');
	await fs.writeFile(path.join(root, 'a', 'b', 'nivel-1.yml'), 'nivel: 1\n', 'utf-8');
	await fs.writeFile(path.join(root, '.secret'), 'sk-hidden', 'utf-8');
	return root;
};

test('generateResourceManifest is deterministic (byte-identical across runs)', async () => {
	const root = await makeTempTree();
	try {
		const first = await generateResourceManifest(root, {
			relativeTo: root,
			includeDirectories: true,
		});
		const second = await generateResourceManifest(root, {
			relativeTo: root,
			includeDirectories: true,
		});
		assert.equal(JSON.stringify(first), JSON.stringify(second));
	} finally {
		await fs.rm(root, { recursive: true, force: true });
	}
});

test('writeResourceManifest omits generatedAt (no timestamps in deterministic output)', async () => {
	const root = await makeTempTree();
	try {
		const outputFile = path.join(root, 'manifest.json');
		await writeResourceManifest(root, outputFile, { relativeTo: root, includeDirectories: true });
		const raw = await fs.readFile(outputFile, 'utf-8');
		const parsed = JSON.parse(raw) as Record<string, unknown>;

		assert.ok(!('generatedAt' in parsed), 'manifest must not include a generatedAt timestamp');
		assert.equal(parsed.root, '.');
		assert.ok(Array.isArray(parsed.entries));
	} finally {
		await fs.rm(root, { recursive: true, force: true });
	}
});

test('manifest entries have sha1 for files and exclude hidden files by default', async () => {
	const root = await makeTempTree();
	try {
		const manifest = await generateResourceManifest(root, { includeDirectories: true });
		const paths = manifest.map((entry) => entry.path);
		assert.ok(paths.includes('a/file.md'));
		assert.ok(paths.includes('a/b/nivel-1.yml'));
		assert.ok(!paths.some((entry) => entry.includes('.secret')), 'hidden files must be skipped');

		const fileEntry = manifest.find((entry) => entry.path === 'a/file.md');
		assert.equal(typeof fileEntry?.sha1, 'string');
		assert.match(fileEntry?.sha1 ?? '', /^[0-9a-f]{40}$/);
	} finally {
		await fs.rm(root, { recursive: true, force: true });
	}
});
