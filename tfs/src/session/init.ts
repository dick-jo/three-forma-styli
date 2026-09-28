import { cp, readdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

/** The standard theme, shipped in the package at themes/standard/. */
const STANDARD = fileURLToPath(new URL('../../themes/standard/', import.meta.url));

/** `tfs init <dir>`: copies the standard theme as a new project's starting files. */
export async function initProject(target: string): Promise<string[]> {
	const directory = resolve(target);
	const existing = await readdir(directory).catch(() => []);
	if (existing.length > 0) throw new Error(`${directory} is not empty; choose a new folder.`);
	await cp(STANDARD, directory, {
		recursive: true,
		filter: (source) => !source.includes('/generated'),
	});
	return (await readdir(directory)).sort();
}
