import path from 'node:path';
import chalk from 'chalk';
import { checkProject } from '@three-forma-styli/compiler/build';
import type { TfsProject } from '@three-forma-styli/compiler/project';
import { loadConfigModule } from '../config/load-module.js';

function isProject(value: unknown): value is TfsProject {
	return Boolean(
		value && typeof value === 'object' && (value as TfsProject).kind === 'three-forma-styli/project'
	);
}

/** Rebuild to a private sibling stage and prove committed output is byte-current. */
export async function checkCommand(filePath: string): Promise<void> {
	const loaded = await loadConfigModule(filePath);
	if (!isProject(loaded.module.default)) {
		throw new Error('tfs check requires a defineTfsProject() project.');
	}
	const result = await checkProject(loaded.module.default, loaded.inputPath);
	console.error(
		chalk.green(
			`✓ Generated output is current (${result.files.length} files in ${path.relative(process.cwd(), result.outputDirectory)})`
		)
	);
}
