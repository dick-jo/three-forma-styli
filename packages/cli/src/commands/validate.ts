import path from 'node:path';
import chalk from 'chalk';
import { validateProjectOutput } from '@three-forma-styli/compiler/build';
import type { TfsProject } from '@three-forma-styli/compiler/project';
import { loadConfigModule } from '../config/load-module.js';

function isProject(value: unknown): value is TfsProject {
	return Boolean(
		value && typeof value === 'object' && (value as TfsProject).kind === 'three-forma-styli/project'
	);
}

/** Verify the committed manifest, artifacts, and package boundary without regeneration. */
export async function validateCommand(filePath: string): Promise<void> {
	const loaded = await loadConfigModule(filePath);
	if (!isProject(loaded.module.default)) {
		throw new Error('tfs validate requires a defineTfsProject() project.');
	}
	const result = await validateProjectOutput(loaded.module.default, loaded.inputPath);
	console.error(
		chalk.green(
			`✓ Validated ${result.files.length} committed files in ${path.relative(process.cwd(), result.outputDirectory)}`
		)
	);
}
