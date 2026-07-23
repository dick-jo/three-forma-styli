import { createHash } from 'node:crypto';
import path from 'node:path';
import fs from 'fs-extra';
import { COMPILER_VERSION } from '../version.js';
import type { HostPackageSnapshot } from './host-package.js';
import type { WorkspacePlan } from './plan.js';
import type { WorkspaceRenderResult } from './render.js';

function sha256(data: Buffer): string {
	return createHash('sha256').update(data).digest('hex');
}

export async function workspaceFiles(directory: string, root = directory): Promise<string[]> {
	const entries = await fs.readdir(directory, { withFileTypes: true });
	return (
		await Promise.all(
			entries.map(async (entry) => {
				const absolute = path.join(directory, entry.name);
				if (entry.isSymbolicLink()) {
					throw new Error(`Generated workspace artifacts must not be symlinks: ${absolute}`);
				}
				if (entry.isDirectory()) return workspaceFiles(absolute, root);
				if (!entry.isFile())
					throw new Error(`Generated artifact must be a regular file: ${absolute}`);
				return [path.relative(root, absolute).split(path.sep).join('/')];
			})
		)
	).flat();
}

function targetFor(file: string, plan: WorkspacePlan): 'runtime' | 'review' | 'design' | 'assets' {
	const planned = plan.artifacts.find((artifact) => artifact.path === file);
	if (planned) return planned.target;
	if (file === plan.fontDirectory || file.startsWith(`${plan.fontDirectory}/`)) return 'assets';
	throw new Error(`Renderer emitted an unplanned workspace artifact: ${file}`);
}

export async function createWorkspaceManifest(
	staging: string,
	configPath: string,
	plan: WorkspacePlan,
	host: HostPackageSnapshot,
	render: WorkspaceRenderResult
): Promise<{ manifest: Record<string, unknown>; files: string[] }> {
	const files = (await workspaceFiles(staging)).sort();
	const caseInsensitive = new Map<string, string>();
	for (const file of files) {
		const key = file.toLowerCase();
		const previous = caseInsensitive.get(key);
		if (previous) throw new Error(`Generated artifact collision: ${previous} and ${file}.`);
		caseInsensitive.set(key, file);
	}
	for (const artifact of plan.artifacts) {
		if (!files.includes(artifact.path)) {
			throw new Error(`Renderer did not produce planned artifact ${artifact.path}.`);
		}
	}

	const artifacts = Object.fromEntries(
		await Promise.all(
			files.map(async (file) => {
				const data = await fs.readFile(path.join(staging, file));
				return [
					file,
					{
						path: file,
						target: targetFor(file, plan),
						bytes: data.byteLength,
						sha256: sha256(data),
					},
				] as const;
			})
		)
	);
	const dependencies = Object.fromEntries(
		plan.artifacts
			.filter((artifact) => artifact.dependencies.length > 0)
			.map((artifact) => [artifact.path, artifact.dependencies])
	);
	const entrypoints = Object.fromEntries(
		host.requiredExports.map((entry) => [entry.subpath, entry.target])
	);
	const manifest = {
		schemaVersion: 2,
		layout: 'workspace-package',
		tool: { name: 'three-forma-styli', version: COMPILER_VERSION },
		project: { config: path.basename(configPath) },
		hostPackage: {
			manifest: path.relative(path.dirname(configPath), host.path).split(path.sep).join('/'),
			sha256: host.hash,
			generatedFromHost: host.generatedFromHost,
		},
		targets: {
			runtime: {
				entrypoints,
				fontUrls: render.preparedFonts ? plan.runtimeFontUrls : undefined,
			},
			review:
				plan.review.workbench || plan.review.specimen || plan.review.shadowSpecimen
					? {
							entrypoint: plan.review.workbench ? 'review/index.html' : undefined,
							contract: plan.review.workbench ? 'review/workbench.json' : undefined,
							captures: plan.review.workbench ? 'review/captures.json' : undefined,
							legacy:
								plan.review.specimen || plan.review.shadowSpecimen
									? {
											typography: plan.review.specimen ? 'review/typography.html' : undefined,
											shadows: plan.review.shadowSpecimen ? 'review/shadows.html' : undefined,
										}
									: undefined,
						}
					: undefined,
			design: {
				dtcg: plan.design.dtcg ? 'design/tokens.dtcg.json' : undefined,
				figmaVariables: plan.design.figmaVariables ? 'design/figma.variables.json' : undefined,
			},
		},
		artifacts,
		dependencies,
		fonts: render.preparedFonts
			? {
					manifest: `${plan.fontDirectory}/fonts.manifest.json`,
					css: `${plan.fontDirectory}/fonts.css`,
					families: Object.keys(render.preparedFonts.manifest.families),
					faces: Object.values(render.preparedFonts.manifest.families).reduce(
						(total, family) => total + family.faces.length,
						0
					),
					adjustedFallbacks: render.adjustedFallbacks
						? {
								manifest: `${plan.fontDirectory}/fallbacks.manifest.json`,
								measurements: render.adjustedFallbacks.measurementCount,
								privateFamilies: render.adjustedFallbacks.privateFamilies,
							}
						: undefined,
				}
			: undefined,
	};
	return { manifest, files };
}
