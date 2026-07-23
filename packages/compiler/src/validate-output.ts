import { createHash } from 'node:crypto';
import os from 'node:os';
import path from 'node:path';
import fs from 'fs-extra';
import type { TfsProject, WorkspacePackageOutput } from './project.js';
import { COMPILER_VERSION } from './version.js';
import { validateHostPackage } from './workspace/host-package.js';
import { planWorkspacePackage } from './workspace/plan.js';
import { workspacePlanContext } from './workspace/context.js';

interface ArtifactMetadata {
	path: string;
	bytes: number;
	sha256: string;
}

interface OutputManifest {
	schemaVersion?: unknown;
	layout?: unknown;
	tool?: { name?: unknown; version?: unknown };
	project?: { config?: unknown };
	hostPackage?: { sha256?: unknown };
	artifacts?: Record<string, unknown>;
}

function sha256(data: Buffer): string {
	return createHash('sha256').update(data).digest('hex');
}

async function files(directory: string, root = directory): Promise<string[]> {
	const entries = await fs.readdir(directory, { withFileTypes: true });
	return (
		await Promise.all(
			entries.map(async (entry) => {
				const absolute = path.join(directory, entry.name);
				if (entry.isSymbolicLink()) {
					throw new Error(`Generated output must not contain symlinks: ${absolute}`);
				}
				if (entry.isDirectory()) return files(absolute, root);
				if (!entry.isFile())
					throw new Error(`Generated artifact is not a regular file: ${absolute}`);
				return [path.relative(root, absolute).split(path.sep).join('/')];
			})
		)
	).flat();
}

function outputLayout(project: TfsProject): 'flat' | 'workspace-package' {
	const output = project.output as unknown as Record<string, unknown>;
	const layout = output.layout;
	if (layout !== undefined && layout !== 'flat' && layout !== 'workspace-package') {
		throw new Error(`Unknown TFS output layout ${JSON.stringify(layout)}.`);
	}
	const legacyKeys = [
		'fontAssets',
		'css',
		'indexCss',
		'typographyCss',
		'typographyModule',
		'typescript',
		'systemTypescript',
		'specimen',
		'dtcg',
		'figmaVariables',
	];
	const workspaceKeys = ['hostPackage', 'assets', 'targets'];
	if (layout === 'workspace-package') {
		const mixed = legacyKeys.filter((key) => output[key] !== undefined);
		if (mixed.length > 0) {
			throw new Error(`workspace-package output cannot use legacy keys: ${mixed.join(', ')}.`);
		}
		return layout;
	}
	const mixed = workspaceKeys.filter((key) => output[key] !== undefined);
	if (mixed.length > 0) {
		throw new Error(`Flat output cannot use workspace-package keys: ${mixed.join(', ')}.`);
	}
	return 'flat';
}

function validateOutputRoot(outputDirectory: string, configDirectory: string): void {
	const forbidden = new Set([
		path.parse(outputDirectory).root,
		path.resolve(os.homedir()),
		path.resolve(configDirectory),
	]);
	if (forbidden.has(path.resolve(outputDirectory))) {
		throw new Error(
			'Project output directory must not be the filesystem root, home, or config directory.'
		);
	}
}

function artifactMetadata(value: unknown, file: string): ArtifactMetadata {
	if (!value || typeof value !== 'object' || Array.isArray(value)) {
		throw new Error(`Generated manifest metadata for ${file} is invalid.`);
	}
	const metadata = value as Partial<ArtifactMetadata>;
	if (
		metadata.path !== file ||
		typeof metadata.bytes !== 'number' ||
		!Number.isSafeInteger(metadata.bytes) ||
		metadata.bytes < 0 ||
		typeof metadata.sha256 !== 'string' ||
		!/^[a-f0-9]{64}$/.test(metadata.sha256)
	) {
		throw new Error(`Generated manifest metadata for ${file} is invalid.`);
	}
	return metadata as ArtifactMetadata;
}

async function readManifest(outputDirectory: string): Promise<OutputManifest> {
	if (!(await fs.pathExists(outputDirectory))) {
		throw new Error(`Generated output is missing at ${outputDirectory}. Run \`tfs build .\`.`);
	}
	const stats = await fs.lstat(outputDirectory);
	if (stats.isSymbolicLink()) throw new Error('Generated output directory must not be a symlink.');
	if (!stats.isDirectory()) throw new Error('Generated output path is not a directory.');
	const manifestPath = path.join(outputDirectory, 'build.manifest.json');
	let parsed: unknown;
	try {
		parsed = JSON.parse(await fs.readFile(manifestPath, 'utf8'));
	} catch {
		throw new Error(`Generated output manifest is missing or invalid at ${manifestPath}.`);
	}
	if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
		throw new Error(`Generated output manifest is invalid at ${manifestPath}.`);
	}
	return parsed as OutputManifest;
}

/** Validate committed generated artifacts and package wiring without running the compiler pipeline. */
export async function validateProjectOutput(
	project: TfsProject,
	configPath: string
): Promise<{ outputDirectory: string; files: string[] }> {
	if (project.kind !== 'three-forma-styli/project' || project.schemaVersion !== 1) {
		throw new Error('Unsupported TFS project schemaVersion.');
	}
	const layout = outputLayout(project);
	const configDirectory = path.dirname(configPath);
	const outputDirectory = path.resolve(configDirectory, project.output.directory);
	validateOutputRoot(outputDirectory, configDirectory);
	const manifest = await readManifest(outputDirectory);
	const expectedSchema = layout === 'workspace-package' ? 2 : 1;
	if (
		manifest.schemaVersion !== expectedSchema ||
		manifest.layout !== (layout === 'flat' ? undefined : layout)
	) {
		throw new Error(`Generated manifest does not describe the configured ${layout} output layout.`);
	}
	if (manifest.tool?.name !== 'three-forma-styli' || manifest.tool.version !== COMPILER_VERSION) {
		throw new Error(
			`Generated output was not produced by three-forma-styli ${COMPILER_VERSION}. Run \`tfs build .\`.`
		);
	}
	if (manifest.project?.config !== path.basename(configPath)) {
		throw new Error('Generated manifest records a different project config file.');
	}
	if (!manifest.artifacts || typeof manifest.artifacts !== 'object') {
		throw new Error('Generated manifest artifacts are missing or invalid.');
	}
	const artifactFiles = Object.keys(manifest.artifacts).sort();
	const actualFiles = (await files(outputDirectory)).sort();
	const expectedFiles = [...artifactFiles, 'build.manifest.json'].sort();
	if (JSON.stringify(actualFiles) !== JSON.stringify(expectedFiles)) {
		const expected = new Set(expectedFiles);
		const actual = new Set(actualFiles);
		const missing = expectedFiles.filter((file) => !actual.has(file));
		const unexpected = actualFiles.filter((file) => !expected.has(file));
		throw new Error(
			`Generated output inventory is invalid. Missing: ${missing.join(', ') || 'none'}. Unexpected: ${unexpected.join(', ') || 'none'}.`
		);
	}
	for (const file of artifactFiles) {
		const metadata = artifactMetadata(manifest.artifacts[file], file);
		const data = await fs.readFile(path.join(outputDirectory, file));
		if (data.byteLength !== metadata.bytes || sha256(data) !== metadata.sha256) {
			throw new Error(`Generated artifact does not match its manifest: ${file}.`);
		}
	}
	if (layout === 'workspace-package') {
		const plan = planWorkspacePackage(
			project.output as WorkspacePackageOutput,
			workspacePlanContext(project)
		);
		const host = await validateHostPackage(configDirectory, outputDirectory, plan);
		if (manifest.hostPackage?.sha256 !== host.hash) {
			throw new Error('Generated output records a stale host package manifest. Run `tfs build .`.');
		}
	}
	return { outputDirectory, files: expectedFiles };
}
