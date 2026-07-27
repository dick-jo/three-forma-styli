import path from 'node:path';
import fs from 'fs-extra';

export interface GeneratedOutputDrift {
	missing: string[];
	changed: string[];
	unexpected: string[];
}

async function files(directory: string, root = directory): Promise<string[]> {
	if (!(await fs.pathExists(directory))) return [];
	const entries = await fs.readdir(directory, { withFileTypes: true });
	const result: string[] = [];
	for (const entry of entries) {
		const absolute = path.join(directory, entry.name);
		if (entry.isSymbolicLink()) {
			throw new Error(`Generated output must not contain symlinks: ${absolute}`);
		}
		if (entry.isDirectory()) result.push(...(await files(absolute, root)));
		else if (entry.isFile()) result.push(path.relative(root, absolute).split(path.sep).join('/'));
	}
	return result.sort();
}

/** Compare a fully rendered candidate with the committed generated directory. */
export async function generatedOutputDrift(
	expectedDirectory: string,
	actualDirectory: string
): Promise<GeneratedOutputDrift> {
	const [expectedFiles, actualFiles] = await Promise.all([
		files(expectedDirectory),
		files(actualDirectory),
	]);
	const expected = new Set(expectedFiles);
	const actual = new Set(actualFiles);
	const missing = expectedFiles.filter((file) => !actual.has(file));
	const unexpected = actualFiles.filter((file) => !expected.has(file));
	const common = expectedFiles.filter((file) => actual.has(file));
	const changed = (
		await Promise.all(
			common.map(async (file) => {
				const [left, right] = await Promise.all([
					fs.readFile(path.join(expectedDirectory, file)),
					fs.readFile(path.join(actualDirectory, file)),
				]);
				return left.equals(right) ? undefined : file;
			})
		)
	).filter((file): file is string => file !== undefined);
	return { missing, changed, unexpected };
}

function entries(label: string, values: string[]): string[] {
	return values.map((value) => `  ${label} ${value}`);
}

/** Fail with an actionable, stable diff without mutating either directory. */
export async function assertGeneratedOutputCurrent(
	expectedDirectory: string,
	actualDirectory: string
): Promise<void> {
	const drift = await generatedOutputDrift(expectedDirectory, actualDirectory);
	if (drift.missing.length === 0 && drift.changed.length === 0 && drift.unexpected.length === 0) {
		return;
	}
	throw new Error(
		[
			`Generated output is out of date at ${actualDirectory}.`,
			...entries('missing', drift.missing),
			...entries('changed', drift.changed),
			...entries('unexpected', drift.unexpected),
			'Run `tfs build .` and commit the regenerated output.',
		].join('\n')
	);
}
