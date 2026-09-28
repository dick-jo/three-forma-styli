import { cp, readdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

/** The standard theme, shipped in the package at themes/standard/. */
const STANDARD = fileURLToPath(new URL('../../themes/standard/', import.meta.url));

/** What a freshly set-up project may already contain; anything else means it isn't new. */
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
 * `tfs init [dir]`: copies the standard theme as a new project's starting files.
 * The folder may already hold package-manager files, since TFS is installed first.
 */
export async function initProject(target: string): Promise<string[]> {
	const directory = resolve(target);
	const before = await readdir(directory).catch((): string[] => []);
	const other = before.filter((entry) => !PROJECT_SETUP.has(entry));
	if (other.length > 0)
		throw new Error(
			`${directory} already has files (${other.join(', ')}); run tfs init in a new project.`
		);
	await cp(STANDARD, directory, {
		recursive: true,
		filter: (source) => !source.includes('/generated'),
	});
	return (await readdir(directory)).filter((entry) => !before.includes(entry)).sort();
}
