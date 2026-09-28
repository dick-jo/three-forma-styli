import { existsSync } from 'node:fs';
import { rm } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { build } from 'esbuild';
import type { ConfigInput } from '../define/config.js';
import type { SystemInput } from '../resolve/input.js';
import { DEFAULT_FOLDER } from './init.js';

export type LoadedConfig = {
	readonly config: ConfigInput & { readonly system: SystemInput };
	readonly configPath: string;
	/** Directory the config lives in; font paths and output resolve from here. */
	readonly projectDir: string;
	readonly outDir: string;
	/** Every source file the config imports; what `tfs dev` watches. */
	readonly inputs: readonly string[];
};

/**
 * Finds tfs.config.ts: a direct path, the folder itself, or its ./design-system
 * folder (so `tfs dev` works from an app's root after `tfs init`).
 */
function configPathFor(target: string): string {
	if (target.endsWith('.ts') || target.endsWith('.js')) return resolve(target);
	const candidates = [
		resolve(target, 'tfs.config.ts'),
		resolve(target, DEFAULT_FOLDER, 'tfs.config.ts'),
	];
	const found = candidates.find((candidate) => existsSync(candidate));
	if (!found)
		throw new Error(
			`No tfs.config.ts in ${resolve(target)} or ${join(resolve(target), DEFAULT_FOLDER)}. Run tfs init to create one.`
		);
	return found;
}

/**
 * Runs tfs.config.ts and its imports. esbuild bundles the project's own files
 * (packages such as three-forma-styli stay external) into a temporary module
 * beside the config, so package resolution behaves exactly as for the project.
 */
export async function loadConfig(target: string): Promise<LoadedConfig> {
	const configPath = configPathFor(target);
	const projectDir = dirname(configPath);
	const bundle = join(projectDir, `.tfs-config-${process.pid}-${Date.now()}.mjs`);
	let result;
	try {
		result = await build({
			entryPoints: [configPath],
			outfile: bundle,
			bundle: true,
			packages: 'external',
			platform: 'node',
			format: 'esm',
			metafile: true,
			logLevel: 'silent',
		});
	} catch (error) {
		const first = (
			error as { errors?: { text: string; location?: { file: string; line: number } }[] }
		).errors?.[0];
		throw new Error(
			first
				? `${first.location ? `${first.location.file}:${first.location.line}: ` : ''}${first.text}`
				: String(error)
		);
	}
	try {
		const module = await import(pathToFileURL(bundle).href);
		const config = module.default as LoadedConfig['config'] | undefined;
		if (!config || typeof config !== 'object' || !('system' in config)) {
			throw new Error(`${configPath} must default-export defineConfig({ system, ... })`);
		}
		return {
			config,
			configPath,
			projectDir,
			outDir: resolve(projectDir, config.output?.directory ?? './generated'),
			inputs: Object.keys(result.metafile.inputs).map((input) => resolve(process.cwd(), input)),
		};
	} finally {
		await rm(bundle, { force: true });
	}
}
