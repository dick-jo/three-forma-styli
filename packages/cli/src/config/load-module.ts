import fs from 'fs-extra';
import path from 'node:path';
import * as esbuild from 'esbuild';
import type { PartialDesignSystem } from '@three-forma-styli/core';

export interface LoadedConfigModule {
	inputPath: string;
	module: Record<string, unknown>;
}

const tokenFamilies = ['colors', 'spacing', 'gap', 'typography', 'border', 'time'] as const;

function asRecord(value: unknown): Record<string, unknown> | undefined {
	return value && typeof value === 'object' ? (value as Record<string, unknown>) : undefined;
}

/** Resolve the conventional default/theme/designSystem exports without using `any`. */
export function resolveDesignSystemExport(module: Record<string, unknown>): PartialDesignSystem {
	const initial = module.default ?? module.theme ?? module.designSystem;
	const initialRecord = asRecord(initial);
	const nested =
		initialRecord && !initialRecord.colors
			? (initialRecord.default ?? initialRecord.designSystem)
			: undefined;
	const candidate = asRecord(nested ?? initial);
	if (!candidate || !tokenFamilies.some((family) => candidate[family] !== undefined)) {
		throw new Error(
			`No valid design system found. Export at least one token family: ${tokenFamilies.join(', ')}.`
		);
	}
	return candidate as PartialDesignSystem;
}

async function resolveInputPath(filePath: string): Promise<string> {
	const inputPath = path.resolve(process.cwd(), filePath);
	if (!(await fs.pathExists(inputPath))) throw new Error(`File not found: ${inputPath}`);
	if (!(await fs.stat(inputPath)).isDirectory()) return inputPath;

	const projectConfigs = ['tfs.config.ts', 'tfs.config.js'].map((name) =>
		path.join(inputPath, name)
	);
	const existingProjectConfigs = [];
	for (const candidate of projectConfigs) {
		if (await fs.pathExists(candidate)) existingProjectConfigs.push(candidate);
	}
	if (existingProjectConfigs.length > 1) {
		throw new Error(`Multiple TFS project configs found: ${existingProjectConfigs.join(', ')}`);
	}
	return existingProjectConfigs[0] ?? path.join(inputPath, 'index.ts');
}

/** Load a TypeScript/JavaScript config through one deterministic Node-oriented path. */
export async function loadConfigModule(filePath: string): Promise<LoadedConfigModule> {
	const inputPath = await resolveInputPath(filePath);
	if (!(await fs.pathExists(inputPath))) {
		throw new Error(`File not found: ${inputPath}`);
	}

	const result = await esbuild.build({
		entryPoints: [inputPath],
		bundle: true,
		write: false,
		format: 'esm',
		platform: 'node',
		target: 'node22',
	});
	const output = result.outputFiles[0];
	if (!output) throw new Error(`Config bundling produced no JavaScript for ${inputPath}.`);
	// A data URL is deterministic and leaves no temporary-file lifetime for a
	// dev/test transform to race. Project configs are executable trusted input.
	const outputUrl = `data:text/javascript;base64,${Buffer.from(output.contents).toString('base64')}#${Date.now()}`;
	const loaded = (await import(outputUrl)) as Record<string, unknown>;
	return { inputPath, module: loaded };
}
