import os from 'node:os';
import path from 'node:path';
import fs from 'fs-extra';
import type { ProjectFont, TfsProject } from '../project.js';
import { assertHostPackageUnchanged, validateHostPackage } from './host-package.js';
import { createWorkspaceManifest } from './manifest.js';
import { planWorkspacePackage } from './plan.js';
import { renderWorkspacePackage, type WorkspaceProject } from './render.js';
import { withWorkspaceTransaction, type WorkspaceTransactionHooks } from './transaction.js';
import { assertGeneratedOutputCurrent } from '../generated-check.js';

export interface WorkspaceBuildHooks extends WorkspaceTransactionHooks {
	/** Test-only synchronization point after rendering and before the host re-hash. */
	beforeHostRecheck?: () => void | Promise<void>;
}

function isInside(directory: string, candidate: string): boolean {
	const relative = path.relative(directory, candidate);
	return relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative));
}

function validateOutputRoot(outputDirectory: string, configDirectory: string): void {
	const forbidden = new Set([
		path.parse(outputDirectory).root,
		path.resolve(os.homedir()),
		path.resolve(configDirectory),
	]);
	if (forbidden.has(path.resolve(outputDirectory))) {
		throw new Error(
			'Workspace generated directory must not be the filesystem root, home, or config directory.'
		);
	}
}

function validateFontSourcesOutsideOutput(
	fonts: Record<string, ProjectFont>,
	configDirectory: string,
	outputDirectory: string
): void {
	for (const [id, font] of Object.entries(fonts)) {
		const sources = [
			...font.sources.map((source) => (typeof source === 'string' ? source : source.path)),
			font.license.file,
		];
		for (const configured of sources) {
			if (isInside(outputDirectory, path.resolve(configDirectory, configured))) {
				throw new Error(
					`fonts.${id} source/license files must live outside the TFS-owned generated directory.`
				);
			}
		}
	}
}

/** Build a package-shaped generated subtree without ever writing the host package.json. */
export async function buildWorkspacePackageProject(
	project: TfsProject,
	configPath: string,
	hooks: WorkspaceBuildHooks = {},
	mode: 'build' | 'check' = 'build'
): Promise<{ outputDirectory: string; files: string[] }> {
	if (project.schemaVersion !== 1) throw new Error('Unsupported TFS project schemaVersion.');
	if (project.output.layout !== 'workspace-package') {
		throw new Error('buildWorkspacePackageProject requires layout: "workspace-package".');
	}
	const workspaceProject = project as WorkspaceProject;
	const configDirectory = path.dirname(configPath);
	const outputDirectory = path.resolve(configDirectory, workspaceProject.output.directory);
	validateOutputRoot(outputDirectory, configDirectory);
	validateFontSourcesOutsideOutput(project.fonts ?? {}, configDirectory, outputDirectory);

	const sourceTypography = project.system.typography;
	const context = {
		hasColors: Boolean(project.system.colors),
		hasTypography: Boolean(
			sourceTypography?.roles && Object.keys(sourceTypography.roles).length > 0
		),
		hasFonts: Object.keys(project.fonts ?? {}).length > 0,
	};
	const plan = planWorkspacePackage(workspaceProject.output, context);
	const host = await validateHostPackage(configDirectory, outputDirectory, plan);

	return withWorkspaceTransaction(
		outputDirectory,
		async (transaction) => {
			const rendered = await renderWorkspacePackage(
				workspaceProject,
				configDirectory,
				transaction.staging,
				plan
			);
			await hooks.beforeHostRecheck?.();
			await assertHostPackageUnchanged(host);
			const { manifest, files } = await createWorkspaceManifest(
				transaction.staging,
				configPath,
				plan,
				host,
				rendered
			);
			await fs.writeFile(
				path.join(transaction.staging, 'build.manifest.json'),
				`${JSON.stringify(manifest, null, 2)}\n`
			);
			await assertHostPackageUnchanged(host);
			if (mode === 'check') {
				await assertGeneratedOutputCurrent(transaction.staging, outputDirectory);
			} else {
				await transaction.commit(() => assertHostPackageUnchanged(host));
			}
			return {
				outputDirectory,
				files: [...files, 'build.manifest.json'].sort(),
			};
		},
		hooks,
		{ requireCommit: mode === 'build' }
	);
}
