import crypto from 'crypto';
import fs from 'fs/promises';
import path from 'path';

export type ResourceKind = 'file' | 'directory';

export interface ResourceManifestEntry {
	path: string;
	kind: ResourceKind;
	size?: number;
	sha1?: string;
}

export interface ResourceManifestOptions {
	/**
	 * Base directory used to compute the relative `path` field for each entry.
	 * Defaults to `rootDir`.
	 */
	relativeTo?: string;
	/**
	 * Whether to include directory entries alongside file entries.
	 * Defaults to `false`.
	 */
	includeDirectories?: boolean;
	/**
	 * Optional allowlist of file extensions (e.g. ['.md', '.yml']).
	 * If provided, only files whose extension matches (case-insensitive) will be included.
	 */
	extensions?: string[];
	/**
	 * Whether entries whose name begins with a dot should be included.
	 * Defaults to `false`.
	 */
	includeHidden?: boolean;
	/**
	 * Callback used to determine if a given entry should be included.
	 * Return `true` to keep the entry, `false` to skip it.
	 */
	filter?: (entry: ResourceManifestEntry) => boolean;
}

/**
 * Default set of filenames that are ignored when constructing the manifest.
 */
export const DEFAULT_IGNORED_NAMES = new Set([
	'.DS_Store',
	'Thumbs.db',
	'.gitkeep',
]);

const isHidden = (name: string): boolean => name.startsWith('.');

const normalizeExtensions = (extensions: string[] | undefined): Set<string> | undefined => {
	if (!extensions || extensions.length === 0) return undefined;
	return new Set(extensions.map((ext) => ext.toLowerCase()));
};

const matchesExtension = (filePath: string, allowed: Set<string> | undefined): boolean => {
	if (!allowed) return true;
	const ext = path.extname(filePath).toLowerCase();
	return allowed.has(ext);
};

const computeSha1 = async (absolutePath: string): Promise<string> => {
	const buffer = await fs.readFile(absolutePath);
	return crypto.createHash('sha1').update(buffer).digest('hex');
};

const createEntry = (
	absolutePath: string,
	relativePath: string,
	stats: fs.Stats,
): ResourceManifestEntry => {
	return {
		path: relativePath.split(path.sep).join('/'),
		kind: stats.isDirectory() ? 'directory' : 'file',
		size: stats.isFile() ? stats.size : undefined,
	};
};

const shouldSkip = (
	direntName: string,
	options: ResourceManifestOptions,
): boolean => {
	if (!options.includeHidden && isHidden(direntName)) {
		return true;
	}
	return DEFAULT_IGNORED_NAMES.has(direntName);
};

export const generateResourceManifest = async (
	rootDir: string,
	options: ResourceManifestOptions = {},
): Promise<ResourceManifestEntry[]> => {
	const manifest: ResourceManifestEntry[] = [];
	const baseDir = options.relativeTo ? path.resolve(options.relativeTo) : path.resolve(rootDir);
	const allowedExtensions = normalizeExtensions(options.extensions);

	const walk = async (currentDir: string): Promise<void> => {
		const dirents = await fs.readdir(currentDir, { withFileTypes: true });
		for (const dirent of dirents) {
			const name = dirent.name;
			if (shouldSkip(name, options)) continue;

			const absolutePath = path.join(currentDir, name);
			const relativePath = path.relative(baseDir, absolutePath);
			const stats = await fs.stat(absolutePath);
			const entry = createEntry(absolutePath, relativePath, stats);

			if (entry.kind === 'file') {
				if (!matchesExtension(entry.path, allowedExtensions)) continue;
				entry.sha1 = await computeSha1(absolutePath);
			} else if (!options.includeDirectories) {
				// Skip directories if the caller is not interested in them.
				await walk(absolutePath);
				continue;
			}

			if (options.filter && !options.filter(entry)) {
				if (entry.kind === 'directory') {
					await walk(absolutePath);
				}
				continue;
			}

			manifest.push(entry);

			if (entry.kind === 'directory') {
				await walk(absolutePath);
			}
		}
	};

	await walk(path.resolve(rootDir));

	manifest.sort((a, b) => a.path.localeCompare(b.path, 'en', { sensitivity: 'base' }));
	return manifest;
};

export const writeResourceManifest = async (
	rootDir: string,
	outputFile: string,
	options: ResourceManifestOptions = {},
): Promise<void> => {
	const manifest = await generateResourceManifest(rootDir, options);
	const contents = JSON.stringify(
		{
			root: path.relative(options.relativeTo ?? rootDir, rootDir).split(path.sep).join('/') || '.',
			generatedAt: new Date().toISOString(),
			entries: manifest,
		},
		null,
		2,
	);
	await fs.mkdir(path.dirname(outputFile), { recursive: true });
	await fs.writeFile(outputFile, `${contents}\n`, 'utf-8');
};
