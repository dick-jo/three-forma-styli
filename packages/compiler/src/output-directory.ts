import { createHash } from 'node:crypto';
import os from 'node:os';
import path from 'node:path';
import fs from 'fs-extra';
import type { ProjectFont } from './project.js';
import { assertPortableRelativePath } from './legacy-output.js';

export async function writeOutputFile(
	root: string,
	relative: string,
	contents: string
): Promise<void> {
	const destination = path.join(root, assertPortableRelativePath(relative, 'output file'));
	await fs.ensureDir(path.dirname(destination));
	await fs.writeFile(destination, contents);
}

export async function listOutputFiles(directory: string, root = directory): Promise<string[]> {
	const entries = await fs.readdir(directory, { withFileTypes: true });
	return (
		await Promise.all(
			entries.map(async (entry) => {
				const absolute = path.join(directory, entry.name);
				if (entry.isDirectory()) return listOutputFiles(absolute, root);
				if (!entry.isFile()) throw new Error(`Project output must be a regular file: ${absolute}`);
				return [path.relative(root, absolute).split(path.sep).join('/')];
			})
		)
	).flat();
}

export async function outputFileMetadata(root: string, relative: string) {
	const data = await fs.readFile(path.join(root, relative));
	return {
		path: relative,
		bytes: data.byteLength,
		sha256: createHash('sha256').update(data).digest('hex'),
	};
}

export async function assertOwnedOutput(outputDirectory: string): Promise<void> {
	if (!(await fs.pathExists(outputDirectory))) return;
	const stats = await fs.lstat(outputDirectory);
	if (stats.isSymbolicLink()) throw new Error('Project output directory must not be a symlink.');
	if (!stats.isDirectory()) throw new Error('Project output path exists and is not a directory.');
	if ((await fs.readdir(outputDirectory)).length === 0) return;
	const manifestPath = path.join(outputDirectory, 'build.manifest.json');
	if (!(await fs.pathExists(manifestPath))) {
		throw new Error(
			`Refusing to replace non-empty unowned directory ${outputDirectory}; build.manifest.json is missing.`
		);
	}
	let manifest: unknown;
	try {
		manifest = JSON.parse(await fs.readFile(manifestPath, 'utf8'));
	} catch {
		throw new Error(`Refusing to replace ${outputDirectory}; build.manifest.json is invalid.`);
	}
	if ((manifest as { tool?: { name?: unknown } }).tool?.name !== 'three-forma-styli') {
		throw new Error(`Refusing to replace ${outputDirectory}; it is not marked as TFS-owned.`);
	}
}

export async function commitOutputDirectory(
	staging: string,
	outputDirectory: string
): Promise<void> {
	await assertOwnedOutput(outputDirectory);
	const backup = `${outputDirectory}.tfs-backup-${process.pid}`;
	if (await fs.pathExists(backup)) throw new Error(`Build backup already exists: ${backup}`);
	let movedPrevious = false;
	try {
		if (await fs.pathExists(outputDirectory)) {
			await fs.move(outputDirectory, backup);
			movedPrevious = true;
		}
		await fs.move(staging, outputDirectory);
		if (movedPrevious) await fs.remove(backup);
	} catch (error) {
		if (!(await fs.pathExists(outputDirectory)) && movedPrevious && (await fs.pathExists(backup))) {
			await fs.move(backup, outputDirectory);
		}
		throw error;
	}
}

export function validateOutputRoot(outputDirectory: string, configDirectory: string): void {
	const forbidden = new Set([
		path.parse(outputDirectory).root,
		path.resolve(os.homedir()),
		path.resolve(configDirectory),
	]);
	if (forbidden.has(path.resolve(outputDirectory))) {
		throw new Error(
			'Project output directory must not be the filesystem root, home, or config directory.'
		);
	}
}

function isInside(directory: string, candidate: string): boolean {
	const relative = path.relative(directory, candidate);
	return relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative));
}

export function validateFontSourcesOutsideOutput(
	fonts: Record<string, ProjectFont>,
	configDirectory: string,
	outputDirectory: string
): void {
	for (const [id, font] of Object.entries(fonts)) {
		const paths = [
			...font.sources.map((source) => (typeof source === 'string' ? source : source.path)),
			font.license.file,
		];
		for (const configured of paths) {
			const resolved = path.resolve(configDirectory, configured);
			if (isInside(outputDirectory, resolved)) {
				throw new Error(
					`fonts.${id} source/license files must live outside the TFS-owned output directory.`
				);
			}
		}
	}
}
