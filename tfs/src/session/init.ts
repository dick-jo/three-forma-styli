import { cp, readdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

/** The standard theme, shipped in the package at themes/standard/. */
const STANDARD = fileURLToPath(new URL('../../themes/standard/', import.meta.url));

/** The folder `tfs init` creates, and where the other commands look when run from an app. */
export const DEFAULT_FOLDER = 'design-system';

/** What a freshly set-up project may already contain when it *is* the design system (`tfs init .`). */
const PROJECT_SETUP = new Set([
	'package.json',
	'node_modules',
	'pnpm-lock.yaml',
	'package-lock.json',
	'yarn.lock',
	'.git',
	'.gitignore',
]);

/**
 * `tfs init [dir]`: copies the standard theme into `dir` (default `./design-system`).
 * `tfs init .` makes the current folder the design system; it may already hold
 * package-manager files, but nothing else.
 */
export async function initProject(target: string = DEFAULT_FOLDER): Promise<string[]> {
	const directory = resolve(target);
	const before = await readdir(directory).catch((): string[] => []);
	const other = before.filter((entry) => !PROJECT_SETUP.has(entry));
	if (other.length > 0)
		throw new Error(`${directory} already has files (${other.join(', ')}); choose a new folder.`);
	await cp(STANDARD, directory, {
		recursive: true,
		filter: (source) => !source.includes('/generated'),
	});
	return (await readdir(directory)).filter((entry) => !before.includes(entry)).sort();
}
