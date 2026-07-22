import fs from 'fs-extra';
import path from 'node:path';
import * as esbuild from 'esbuild';

export interface LoadedConfigModule {
	inputPath: string;
	module: Record<string, unknown>;
}

/** Load a TypeScript/JavaScript config through one deterministic Node-oriented path. */
export async function loadConfigModule(filePath: string): Promise<LoadedConfigModule> {
	let inputPath = path.resolve(process.cwd(), filePath);
	if ((await fs.pathExists(inputPath)) && (await fs.stat(inputPath)).isDirectory()) {
		inputPath = path.join(inputPath, 'index.ts');
	}
	if (!(await fs.pathExists(inputPath))) {
		throw new Error(`File not found: ${inputPath}`);
	}

	const result = await esbuild.build({
		entryPoints: [inputPath],
		bundle: true,
		write: false,
		format: 'esm',
		platform: 'node',
		target: 'node18',
	});
	const output = result.outputFiles[0];
	if (!output) throw new Error(`Config bundling produced no JavaScript for ${inputPath}.`);
	// A data URL is deterministic and leaves no temporary-file lifetime for a
	// dev/test transform to race. Project configs are executable trusted input.
	const outputUrl = `data:text/javascript;base64,${Buffer.from(output.contents).toString('base64')}#${Date.now()}`;
	const loaded = (await import(outputUrl)) as Record<string, unknown>;
	return { inputPath, module: loaded };
}
