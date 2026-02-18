import type { Dirent } from 'fs';
import fs from 'fs/promises';
import path from 'path';

export type DirectoryEntryKind = 'file' | 'directory' | 'symlink' | 'other';

export interface DirectoryEntryInfo {
	sourcePath: string;
	destinationPath: string;
	relativePath: string;
	kind: DirectoryEntryKind;
	dirent: Dirent;
}

export interface CopyDirectoryOptions {
	/**
	 * Optional filter applied to every entry before copying.
	 * Return `false` to skip the entry.
	 */
	filter?: (entry: DirectoryEntryInfo) => boolean | Promise<boolean>;
	/**
	 * When `true`, existing files/directories at the destination will be overwritten.
	 * Defaults to `false`, which preserves existing targets.
	 */
	overwrite?: boolean;
}

const determineKind = (dirent: Dirent): DirectoryEntryKind => {
	if (dirent.isDirectory()) return 'directory';
	if (dirent.isFile()) return 'file';
	if (dirent.isSymbolicLink()) return 'symlink';
	return 'other';
};

const pathExists = async (targetPath: string): Promise<boolean> => {
	try {
		await fs.lstat(targetPath);
		return true;
	} catch (error) {
		if ((error as NodeJS.ErrnoException).code === 'ENOENT') return false;
		throw error;
	}
};

const ensureParentDirectory = async (targetPath: string): Promise<void> => {
	await fs.mkdir(path.dirname(targetPath), { recursive: true });
};

const prepareDestination = async (targetPath: string, overwrite: boolean): Promise<void> => {
	if (!overwrite) return;
	if (await pathExists(targetPath)) {
		await fs.rm(targetPath, { recursive: true, force: true });
	}
};

const copyFile = async (
	sourcePath: string,
	destinationPath: string,
	overwrite: boolean,
): Promise<void> => {
	if (!(await pathExists(destinationPath)) || overwrite) {
		await ensureParentDirectory(destinationPath);
		await prepareDestination(destinationPath, overwrite);
		await fs.copyFile(sourcePath, destinationPath);
	}
};

const copySymlink = async (
	sourcePath: string,
	destinationPath: string,
	overwrite: boolean,
): Promise<void> => {
	const linkTarget = await fs.readlink(sourcePath);
	if (!(await pathExists(destinationPath)) || overwrite) {
		await ensureParentDirectory(destinationPath);
		await prepareDestination(destinationPath, overwrite);
		await fs.symlink(linkTarget, destinationPath);
	}
};

const copyEntry = async (
	entryInfo: DirectoryEntryInfo,
	sourceRoot: string,
	destinationRoot: string,
	options: CopyDirectoryOptions,
	walk: (relativePath: string) => Promise<void>,
): Promise<void> => {
	const { sourcePath, destinationPath, kind } = entryInfo;
	const overwrite = options.overwrite === true;

	switch (kind) {
		case 'directory': {
			await fs.mkdir(destinationPath, { recursive: true });
			await walk(entryInfo.relativePath);
			break;
		}
		case 'file': {
			await copyFile(sourcePath, destinationPath, overwrite);
			break;
		}
		case 'symlink': {
			await copySymlink(sourcePath, destinationPath, overwrite);
			break;
		}
		default:
			// Ignore other types (sockets, FIFOs, etc.)
			break;
	}
};

export const copyDirectory = async (
	sourceDir: string,
	destinationDir: string,
	options: CopyDirectoryOptions = {},
): Promise<void> => {
	const sourceRoot = path.resolve(sourceDir);
	const destinationRoot = path.resolve(destinationDir);

	const sourceStats = await fs.stat(sourceRoot);
	if (!sourceStats.isDirectory()) {
		throw new Error(`Source path "${sourceDir}" is not a directory.`);
	}

	await fs.mkdir(destinationRoot, { recursive: true });

	const walk = async (relativePath: string): Promise<void> => {
		const absoluteSource = path.join(sourceRoot, relativePath);
		const dirents = await fs.readdir(absoluteSource, { withFileTypes: true });

		for (const dirent of dirents) {
			const relPath = relativePath ? path.join(relativePath, dirent.name) : dirent.name;
			const entryInfo: DirectoryEntryInfo = {
				sourcePath: path.join(sourceRoot, relPath),
				destinationPath: path.join(destinationRoot, relPath),
				relativePath: relPath,
				kind: determineKind(dirent),
				dirent,
			};

			if (options.filter) {
				const shouldCopy = await options.filter(entryInfo);
				if (!shouldCopy) continue;
			}

			await copyEntry(entryInfo, sourceRoot, destinationRoot, options, walk);
		}
	};

	await walk('');
};
